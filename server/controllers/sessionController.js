const Session = require('../models/Session');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { createAuditLog } = require('../middleware/auditLogger');

// Helper function to parse user agent and extract device info
const parseUserAgent = (userAgent) => {
  if (!userAgent) {
    return {
      device: 'Unknown Device',
      browser: 'Unknown',
      os: 'Unknown'
    };
  }

  const ua = userAgent.toLowerCase();
  
  // Detect OS
  let os = 'Unknown';
  if (ua.includes('windows')) os = 'Windows';
  else if (ua.includes('mac os') || ua.includes('macos')) os = 'macOS';
  else if (ua.includes('linux')) os = 'Linux';
  else if (ua.includes('android')) os = 'Android';
  else if (ua.includes('iphone') || ua.includes('ipad')) os = 'iOS';
  
  // Detect Browser
  let browser = 'Unknown';
  if (ua.includes('chrome') && !ua.includes('edg')) browser = 'Chrome';
  else if (ua.includes('firefox')) browser = 'Firefox';
  else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'Safari';
  else if (ua.includes('edg')) browser = 'Edge';
  else if (ua.includes('opera') || ua.includes('opr')) browser = 'Opera';
  
  // Detect Device Type
  let device = 'Desktop';
  if (ua.includes('mobile')) device = 'Mobile';
  else if (ua.includes('tablet') || ua.includes('ipad')) device = 'Tablet';
  
  return {
    device: `${device} (${os})`,
    browser: browser,
    os: os
  };
};

// Helper function to get location from IP (simplified - you can integrate with a geolocation service)
const getLocationFromIP = async (ipAddress) => {
  // For now, return a simple location string
  // In production, you could use a service like ipapi.co or MaxMind
  if (ipAddress === '127.0.0.1' || ipAddress === '::1' || ipAddress.startsWith('192.168.') || ipAddress.startsWith('10.')) {
    return 'Local Network';
  }
  return 'Unknown Location';
};

// @desc    Get active sessions for current user
// @route   GET /api/auth/sessions
// @access  Private
const getActiveSessions = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get all active sessions for this user
    const sessions = await Session.findAll({
      where: {
        userId: userId,
        isActive: true
      },
      order: [['lastActivity', 'DESC']],
      attributes: {
        exclude: ['token'] // Don't send token to frontend
      }
    });

    // Format sessions for frontend
    const formattedSessions = sessions.map((session, index) => {
      // Get current session token from request
      const currentToken = req.headers.authorization?.replace('Bearer ', '');
      const isCurrent = session.token === currentToken;
      
      return {
        id: session.id,
        device: session.device || 'Unknown Device',
        location: session.location || 'Unknown',
        ipAddress: session.ipAddress,
        browser: session.browser || 'Unknown',
        os: session.os || 'Unknown',
        lastActivity: session.lastActivity,
        createdAt: session.createdAt,
        isCurrent: isCurrent,
        userAgent: session.userAgent
      };
    });

    res.status(200).json({
      success: true,
      data: formattedSessions,
      count: formattedSessions.length
    });
  } catch (error) {
    console.error('Get active sessions error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching active sessions',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Logout a specific session
// @route   POST /api/auth/sessions/:sessionId/logout
// @access  Private
const logoutSession = async (req, res) => {
  try {
    const userId = req.user.id;
    const { sessionId } = req.params;

    // Find the session
    const session = await Session.findOne({
      where: {
        id: sessionId,
        userId: userId,
        isActive: true
      }
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found or already logged out'
      });
    }

    // Check if trying to logout current session
    const currentToken = req.headers.authorization?.replace('Bearer ', '');
    const isCurrentSession = session.token === currentToken;

    // Deactivate the session
    session.isActive = false;
    session.lastActivity = new Date();
    await session.save();

    // Log the action
    try {
      await createAuditLog(
        userId,
        'SESSION_LOGOUT',
        'SECURITY',
        {
          details: JSON.stringify({
            sessionId: sessionId,
            device: session.device,
            ipAddress: session.ipAddress,
            isCurrentSession: isCurrentSession
          }),
          ipAddress: req.ip || req.headers['x-forwarded-for'] || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown'
        }
      );
    } catch (auditError) {
      console.error('Error creating audit log:', auditError);
    }

    res.status(200).json({
      success: true,
      message: 'Session logged out successfully',
      data: {
        sessionId: session.id,
        isCurrentSession: isCurrentSession
      }
    });
  } catch (error) {
    console.error('Logout session error:', error);
    res.status(500).json({
      success: false,
      message: 'Error logging out session',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Logout all sessions (except current)
// @route   POST /api/auth/sessions/logout-all
// @access  Private
const logoutAllSessions = async (req, res) => {
  try {
    const userId = req.user.id;
    const currentToken = req.headers.authorization?.replace('Bearer ', '');

    // Get all active sessions
    const activeSessions = await Session.findAll({
      where: {
        userId: userId,
        isActive: true
      }
    });

    // Deactivate all sessions except current
    const sessionsToLogout = activeSessions.filter(s => s.token !== currentToken);
    
    if (sessionsToLogout.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No other sessions to logout',
        data: {
          loggedOutCount: 0
        }
      });
    }

    // Update all sessions except current
    await Session.update(
      {
        isActive: false,
        lastActivity: new Date()
      },
      {
        where: {
          userId: userId,
          isActive: true,
          token: { [require('sequelize').Op.ne]: currentToken }
        }
      }
    );

    // Log the action
    try {
      await createAuditLog(
        userId,
        'SESSION_LOGOUT_ALL',
        'SECURITY',
        {
          details: JSON.stringify({
            loggedOutCount: sessionsToLogout.length,
            devices: sessionsToLogout.map(s => s.device)
          }),
          ipAddress: req.ip || req.headers['x-forwarded-for'] || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown'
        }
      );
    } catch (auditError) {
      console.error('Error creating audit log:', auditError);
    }

    res.status(200).json({
      success: true,
      message: `Logged out ${sessionsToLogout.length} session(s) successfully`,
      data: {
        loggedOutCount: sessionsToLogout.length
      }
    });
  } catch (error) {
    console.error('Logout all sessions error:', error);
    res.status(500).json({
      success: false,
      message: 'Error logging out all sessions',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Create a new session (called during login)
// @route   Internal (used by authController)
// @access  Internal
const createSession = async (userId, token, req) => {
  try {
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    
    // Parse user agent
    const deviceInfo = parseUserAgent(userAgent);
    
    // Get location (simplified - can be enhanced with geolocation service)
    const location = await getLocationFromIP(ipAddress);
    
    // Calculate expiration (30 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    
    // Create session
    const session = await Session.create({
      userId: userId,
      token: token,
      ipAddress: ipAddress,
      userAgent: userAgent,
      location: location,
      device: deviceInfo.device,
      browser: deviceInfo.browser,
      os: deviceInfo.os,
      isActive: true,
      lastActivity: new Date(),
      expiresAt: expiresAt
    });

    return session;
  } catch (error) {
    console.error('Create session error:', error);
    // Don't throw - session creation failure shouldn't break login
    return null;
  }
};

// @desc    Update session last activity (called on each request)
// @route   Internal (used by middleware)
// @access  Internal
const updateSessionActivity = async (token) => {
  try {
    await Session.update(
      { lastActivity: new Date() },
      {
        where: {
          token: token,
          isActive: true
        }
      }
    );
  } catch (error) {
    console.error('Update session activity error:', error);
    // Silent fail - don't break requests
  }
};

// @desc    Clean up expired sessions (can be called by cron job)
// @route   Internal
// @access  Internal
const cleanupExpiredSessions = async () => {
  try {
    const result = await Session.update(
      { isActive: false },
      {
        where: {
          expiresAt: { [require('sequelize').Op.lt]: new Date() },
          isActive: true
        }
      }
    );

    console.log(`Cleaned up ${result[0]} expired sessions`);
    return result[0];
  } catch (error) {
    console.error('Cleanup expired sessions error:', error);
    return 0;
  }
};

module.exports = {
  getActiveSessions,
  logoutSession,
  logoutAllSessions,
  createSession,
  updateSessionActivity,
  cleanupExpiredSessions
};


