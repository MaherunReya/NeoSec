const User = require('../models/User');
const UserSettings = require('../models/UserSettings');
const LoginHistory = require('../models/LoginHistory');
const Notification = require('../models/Notification');
const Profile = require('../models/Profile');
const ProfileLog = require('../models/ProfileLog');
const ScanHistory = require('../models/scanhistory');
const VpnConfig = require('../models/VpnConfig');
const FirewallRule = require('../models/FirewallRule');
const DataTransfer = require('../models/DataTransfer');
const Threat = require('../models/Threat');
const Device = require('../models/Device');
const MFASettings = require('../models/MFASettings');
const Subscription = require('../models/Subscription');
const BillingHistory = require('../models/BillingHistory');
const GroupMember = require('../models/GroupMember');
const Invitation = require('../models/Invitation');
const SharedProfile = require('../models/SharedProfile');
const SharedProfileLog = require('../models/SharedProfileLog');
const ImpersonationSession = require('../models/ImpersonationSession');
const AuditLog = require('../models/AuditLog');
const ActivityLog = require('../models/ActivityLog');
const OtpVerification = require('../models/OtpVerification');
const { sequelize } = require('../config/db');

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
  const transaction = await sequelize.transaction();

  try {
    const user = await User.findByPk(req.user.id, { transaction });
    if (!user) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const profileIds = (
      await Profile.findAll({
        where: { userId: user.id },
        attributes: ['id'],
        transaction
      })
    ).map((profile) => profile.id);

    await Promise.all([
      LoginHistory.destroy({ where: { userId: user.id }, transaction }),
      UserSettings.destroy({ where: { userId: user.id }, transaction }),
      Notification.destroy({ where: { userId: user.id }, transaction }),
      ScanHistory.destroy({ where: { userId: user.id }, transaction }),
      VpnConfig.destroy({ where: { userId: user.id }, transaction }),
      FirewallRule.destroy({ where: { userId: user.id }, transaction }),
      DataTransfer.destroy({ where: { userId: user.id }, transaction }),
      Threat.destroy({ where: { userId: user.id }, transaction }),
      Device.destroy({ where: { userId: user.id }, transaction }),
      MFASettings.destroy({ where: { userId: user.id }, transaction }),
      Subscription.destroy({ where: { userId: user.id }, transaction }),
      BillingHistory.destroy({ where: { userId: user.id }, transaction }),
      GroupMember.destroy({ where: { userId: user.id }, transaction }),
      Invitation.destroy({ where: { inviteeId: user.id }, transaction }),
      Invitation.destroy({ where: { inviterId: user.id }, transaction }),
      ImpersonationSession.destroy({ where: { adminUserId: user.id }, transaction }),
      ImpersonationSession.destroy({ where: { targetUserId: user.id }, transaction }),
      AuditLog.destroy({ where: { adminUserId: user.id }, transaction }),
      AuditLog.destroy({ where: { targetUserId: user.id }, transaction }),
      ActivityLog.destroy({ where: { userId: user.id }, transaction }),
      OtpVerification.destroy({ where: { userId: user.id }, transaction })
    ]);

    if (profileIds.length > 0) {
      const sharedProfileIds = (
        await SharedProfile.findAll({
          where: { profileId: profileIds },
          attributes: ['id'],
          transaction
        })
      ).map((share) => share.id);

      if (sharedProfileIds.length > 0) {
        await SharedProfileLog.destroy({
          where: { sharedProfileId: sharedProfileIds },
          transaction
        });
      }

      await SharedProfile.destroy({ where: { profileId: profileIds }, transaction });
      await ProfileLog.destroy({ where: { profileId: profileIds }, transaction });
      await Profile.destroy({ where: { id: profileIds }, transaction });
    }

    await SharedProfile.destroy({ where: { userId: user.id }, transaction });
    await SharedProfile.update(
      { revokedBy: null },
      { where: { revokedBy: user.id }, transaction }
    );

    await user.destroy({ transaction });
    await transaction.commit();

    return res.status(200).json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    await transaction.rollback();
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
