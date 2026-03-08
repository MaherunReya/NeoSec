const User = require('../models/User');
const LoginHistory = require('../models/LoginHistory');
const jwt = require('jsonwebtoken');
const { getLocationFromIP } = require('../services/ipGeolocationService');
const { getClientIP } = require('../utils/ipUtils');
const OtpVerification = require('../models/OtpVerification');
const { sendOtpEmail } = require('../services/emailService');
const { Op } = require('sequelize');

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    const { email, password } = req.body;

    // We no longer register directly from here, this is now handle by verifyOtpAndRegister
    // But we keep this for backwards compatibility or admin creation if needed
    // However, the prompt says "Add otp authentication using brevo for register",
    // so let's repurpose this endpoint or create new ones.

    // Let's create proper endpoints: sendOtp and verifyOtpAndRegister
    res.status(400).json({
      success: false,
      message: 'Direct registration is disabled. Please use the OTP flow.'
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Send OTP to email for registration
 * @route   POST /api/auth/send-otp
 * @access  Public
 */
const sendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    const brevoConfigured = Boolean(process.env.BREVO_API_KEY || process.env.SENDINBLUE_API_KEY);

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    // Check if user already exists
    let existingUser;
    try {
      existingUser = await User.findOne({ where: { email } });
    } catch (dbError) {
      console.error('Database error checking existing user:', dbError);
      return res.status(500).json({ success: false, message: 'Database error' });
    }

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Set expiry to 10 minutes from now
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    // Save to database
    try {
      // First, invalidate any existing OTPs for this email
      await OtpVerification.update(
        { used: true },
        { where: { email, used: false } }
      );

      await OtpVerification.create({
        email,
        otp,
        expiresAt
      });
    } catch (dbError) {
      console.error('Error saving OTP to database:', dbError);
      return res.status(500).json({ success: false, message: 'Error generating OTP' });
    }

    // Send email using Brevo
    try {
      const emailResult = await sendOtpEmail(email, otp);
      if (!emailResult.success) {
        const providerError = emailResult.error || emailResult.message || 'Failed to send email';

        if (!brevoConfigured && process.env.NODE_ENV !== 'production') {
          console.warn('BREVO_API_KEY not configured. OTP generated for local development only.');
          return res.status(200).json({
            success: true,
            message: 'Verification code generated (email service not configured in local environment).',
            devOtp: otp
          });
        }

        return res.status(503).json({
          success: false,
          message: 'Email service unavailable. Please try again later.',
          error: process.env.NODE_ENV === 'development' ? providerError : undefined
        });
      }
    } catch (emailError) {
      console.error('Error sending OTP email:', emailError);
      return res.status(503).json({ 
        success: false, 
        message: 'Error sending verification email. Please try again later.',
        error: process.env.NODE_ENV === 'development' ? emailError.message : undefined
      });
    }

    res.status(200).json({
      success: true,
      message: 'Verification code sent to your email'
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during OTP generation'
    });
  }
};

/**
 * @desc    Verify OTP and register user
 * @route   POST /api/auth/verify-otp-register
 * @access  Public
 */
const verifyOtpAndRegister = async (req, res) => {
  try {
    const { email, password, otp } = req.body;

    if (!email || !password || !otp) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email, password, and OTP are required' 
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Verify OTP
    const otpRecord = await OtpVerification.findOne({
      where: {
        email,
        otp,
        used: false,
        expiresAt: { [Op.gt]: new Date() } // Must not be expired
      },
      order: [['createdAt', 'DESC']]
    });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code'
      });
    }

    // Mark OTP as used
    await otpRecord.update({ used: true });

    // Proceed to create user
    // First user becomes admin
    let userCount = await User.count();
    const isFirstUser = userCount === 0;

    let user;
    try {
      user = await User.create({
        email,
        password,
        isApproved: true,
        role: isFirstUser ? 'admin' : 'user',
        accountType: isFirstUser ? 'admin' : 'user',
        subscriptionTier: 'free',
        isPaid: false
      });
    } catch (createError) {
      console.error('Error creating user:', createError);
      return res.status(500).json({
        success: false,
        message: 'Error creating user account. Please try again.'
      });
    }

    res.status(201).json({
      success: true,
      message: isFirstUser
        ? 'Registration successful. Admin account created. You can now login.'
        : 'Registration successful. You can now login.'
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
};

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if JWT_SECRET is set
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not set in environment variables');
      return res.status(500).json({
        success: false,
        message: 'Server configuration error'
      });
    }

    // Check if User model is available
    if (!User) {
      console.error('User model is not available');
      return res.status(500).json({
        success: false,
        message: 'Server configuration error - models not loaded'
      });
    }

    // Test database connection first
    const { sequelize } = require('../config/db');
    try {
      await sequelize.authenticate();
    } catch (connError) {
      console.error('Database connection error in login:', connError.message);
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable. Please try again later.'
      });
    }

    // Find user by email
    let user;
    try {
      user = await User.findOne({ where: { email } });
    } catch (dbError) {
      console.error('Database error finding user:', dbError);
      console.error('Database error details:', dbError.message);
      console.error('Database error stack:', dbError.stack);
      return res.status(500).json({
        success: false,
        message: 'Database error. Please try again later.',
        error: process.env.NODE_ENV === 'development' ? dbError.message : undefined
      });
    }

    // Log failed login attempt - use proper IP extraction
    const ipAddress = getClientIP(req);
    const userAgent = req.headers['user-agent'] || 'unknown';
    
    // Debug logging in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Login attempt - Extracted IP:', ipAddress, 'From headers:', {
        'x-forwarded-for': req.headers['x-forwarded-for'],
        'x-real-ip': req.headers['x-real-ip'],
        'req.ip': req.ip,
        'remoteAddress': req.connection?.remoteAddress
      });
    }
    
    // Get location from IP (async, don't block login)
    let location = 'Unknown';
    try {
      location = await getLocationFromIP(ipAddress);
    } catch (err) {
      console.error('Error getting location:', err);
      // Continue with 'Unknown' if location fetch fails
    }
    
    if (!user) {
      // Log failed login attempt (user not found)
      try {
        await LoginHistory.create({
          userId: null, // User not found
          ipAddress,
          userAgent,
          location,
          success: false,
          failureReason: 'User not found',
          suspiciousActivity: true
        });
      } catch (logError) {
        console.error('Error logging failed login:', logError);
      }
      
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if password matches
    let isPasswordMatch;
    try {
      isPasswordMatch = await user.comparePassword(password);
    } catch (pwdError) {
      console.error('Password comparison error:', pwdError);
      return res.status(500).json({
        success: false,
        message: 'Server error during authentication'
      });
    }

    if (!isPasswordMatch) {
      // Log failed login attempt (wrong password)
      try {
        // Check for suspicious activity (multiple failed attempts from same IP)
        const { Op } = require('sequelize');
        const recentFailures = await LoginHistory.count({
          where: {
            ipAddress,
            success: false,
            createdAt: {
              [Op.gte]: new Date(Date.now() - 15 * 60 * 1000) // Last 15 minutes
            }
          }
        });

        await LoginHistory.create({
          userId: user.id,
          ipAddress,
          userAgent,
          location,
          success: false,
          failureReason: 'Invalid password',
          suspiciousActivity: recentFailures >= 3 // Mark as suspicious if 3+ failures in 15 min
        });
      } catch (logError) {
        console.error('Error logging failed login:', logError);
      }
      
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if user is approved
    if (!user.isApproved) {
      return res.status(403).json({
        success: false,
        message: 'Account pending approval. Please wait for admin approval.'
      });
    }

    // Generate token
    let token;
    try {
      token = jwt.sign(
        { userId: user.id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
    } catch (tokenError) {
      console.error('JWT token generation error:', tokenError);
      return res.status(500).json({
        success: false,
        message: 'Server error during token generation'
      });
    }

    // Log login history (ipAddress and userAgent already declared above)
    try {
      await LoginHistory.create({
        userId: user.id,
        ipAddress,
        userAgent,
        location,
        success: true,
        suspiciousActivity: false
      });
    } catch (logError) {
      console.error('Error logging login history:', logError);
      // Don't fail login if logging fails
    }

    // IMPORTANT: return FULL user state
    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        accountType: user.accountType,
        subscriptionTier: user.subscriptionTier,
        isPaid: user.isPaid,
        isApproved: user.isApproved
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    console.error('Login error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    // req.user is already populated by protect middleware
    const user = await User.findByPk(req.user.id, {
      attributes: [
        'id',
        'email',
        'name',
        'phone',
        'role',
        'accountType',
        'subscriptionTier',
        'isPaid',
        'isApproved',
        'createdAt'
      ]
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const { name, phone, currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    // Find user
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // If changing password, verify current password
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({
          success: false,
          message: 'Current password is required to change password'
        });
      }

      const isCurrentPasswordValid = await user.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      // Validate new password length
      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'New password must be at least 6 characters long'
        });
      }
    }

    // Update user fields
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (newPassword) updateData.password = newPassword;

    // Update user
    await user.update(updateData);

    // Fetch updated user data (without password)
    const updatedUser = await User.findByPk(userId, {
      attributes: [
        'id',
        'email',
        'name',
        'phone',
        'role',
        'accountType',
        'subscriptionTier',
        'isPaid',
        'isApproved',
        'createdAt'
      ]
    });

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  sendOtp,
  verifyOtpAndRegister
};


