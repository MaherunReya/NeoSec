const User = require('../models/User');
const UserSettings = require('../models/UserSettings');
const LoginHistory = require('../models/LoginHistory');

const getDefaultNameParts = (email = '') => {
  const local = String(email || '').split('@')[0] || '';
  const parts = local.split(/[._-]+/).filter(Boolean);
  return {
    firstName: parts[0] ? parts[0][0].toUpperCase() + parts[0].slice(1) : 'User',
    lastName: parts[1] ? parts[1][0].toUpperCase() + parts[1].slice(1) : '',
    username: local || 'user'
  };
};

const getEffectiveRole = (user) => {
  if (!user) return 'user';
  if (user.role === 'admin') return 'admin';
  if (user.accountType && user.accountType !== 'user') return user.accountType;
  return user.role || user.accountType || 'user';
};

const getOrCreateSettings = async (user) => {
  const defaults = getDefaultNameParts(user.email);
  const [settings] = await UserSettings.findOrCreate({
    where: { userId: user.id },
    defaults: {
      userId: user.id,
      firstName: defaults.firstName,
      lastName: defaults.lastName,
      username: defaults.username,
      groupInvitations: true,
      securityAlerts: true,
      billingUpdates: false
    }
  });
  return settings;
};

const getSettings = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'email', 'role', 'accountType', 'isApproved', 'createdAt']
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const settings = await getOrCreateSettings(user);

    return res.status(200).json({
      success: true,
      data: {
        profile: {
          firstName: settings.firstName,
          lastName: settings.lastName,
          username: settings.username,
          avatarUrl: settings.avatarUrl,
          email: user.email,
          role: getEffectiveRole(user),
          createdAt: user.createdAt,
          emailVerified: Boolean(user.isApproved)
        },
        notifications: {
          groupInvitations: settings.groupInvitations,
          securityAlerts: settings.securityAlerts,
          billingUpdates: settings.billingUpdates
        }
      }
    });
  } catch (error) {
    console.error('Get settings error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch settings' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, username, email, avatarUrl } = req.body;

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const settings = await getOrCreateSettings(user);

    if (username && username.length > 50) {
      return res.status(400).json({ success: false, message: 'Username is too long' });
    }

    if (email && email !== user.email) {
      const exists = await User.findOne({ where: { email } });
      if (exists && exists.id !== user.id) {
        return res.status(400).json({ success: false, message: 'Email is already in use' });
      }
      user.email = email;
      await user.save();
    }

    await settings.update({
      firstName: firstName ?? settings.firstName,
      lastName: lastName ?? settings.lastName,
      username: username ?? settings.username,
      avatarUrl: avatarUrl !== undefined ? avatarUrl : settings.avatarUrl
    });

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        firstName: settings.firstName,
        lastName: settings.lastName,
        username: settings.username,
        avatarUrl: settings.avatarUrl,
        email: user.email,
        role: getEffectiveRole(user),
        createdAt: user.createdAt,
        emailVerified: Boolean(user.isApproved)
      }
    });
  } catch (error) {
    console.error('Update profile settings error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
};

const updateNotifications = async (req, res) => {
  try {
    const { groupInvitations, securityAlerts, billingUpdates } = req.body;

    const user = await User.findByPk(req.user.id, { attributes: ['id', 'email'] });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const settings = await getOrCreateSettings(user);

    await settings.update({
      groupInvitations: typeof groupInvitations === 'boolean' ? groupInvitations : settings.groupInvitations,
      securityAlerts: typeof securityAlerts === 'boolean' ? securityAlerts : settings.securityAlerts,
      billingUpdates: typeof billingUpdates === 'boolean' ? billingUpdates : settings.billingUpdates
    });

    return res.status(200).json({
      success: true,
      message: 'Notification preferences updated',
      data: {
        groupInvitations: settings.groupInvitations,
        securityAlerts: settings.securityAlerts,
        billingUpdates: settings.billingUpdates
      }
    });
  } catch (error) {
    console.error('Update notification settings error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update notification settings' });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ success: false, message: 'All password fields are required' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'New passwords do not match' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const valid = await user.comparePassword(currentPassword);
    if (!valid) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    return res.status(200).json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update password' });
  }
};

const deleteAccount = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await LoginHistory.destroy({ where: { userId: user.id } });
    await UserSettings.destroy({ where: { userId: user.id } });
    await user.destroy();

    return res.status(200).json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    console.error('Delete account error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete account' });
  }
};

module.exports = {
  getSettings,
  updateProfile,
  updateNotifications,
  changePassword,
  deleteAccount
};
