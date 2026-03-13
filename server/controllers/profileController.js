const { Profile, ProfileLog, User, VpnConfig, DataTransfer } = require('../models');
const { Op } = require('sequelize');
const { getClientIP } = require('../utils/ipUtils');
const ActivityLog = require('../models/ActivityLog');
const { emitWithAckToDesktop } = require('../socket');

const createLog = async (profileId, userId, action, changes, req, description) => {
  try {
    const user = await User.findByPk(userId);
    await ProfileLog.create({
      profileId,
      userId,
      action,
      changes,
      userEmail: user.email,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      description
    });
  } catch (error) {
    console.error('Error creating log:', error);
  }
};

const getProfiles = async (req, res) => {
  try {
    const profiles = await Profile.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']],
      include: [{
        model: ProfileLog,
        as: 'logs',
        limit: 5,
        order: [['createdAt', 'DESC']]
      }]
    });

    res.status(200).json({
      success: true,
      count: profiles.length,
      profiles
    });
  } catch (error) {
    console.error('Get profiles error:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    let errorMessage = 'Error fetching profiles';
    if (error.original && error.original.message) {
      errorMessage = `Database error: ${error.original.message}`;
    }
    
    res.status(500).json({
      success: false,
      message: 'Error fetching profiles',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const getProfile = async (req, res) => {
  try {
    const profile = await Profile.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      },
      include: [{
        model: ProfileLog,
        as: 'logs',
        order: [['createdAt', 'DESC']]
      }]
    });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    res.status(200).json({
      success: true,
      profile
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const createProfile = async (req, res) => {
  try {
    const profileData = {
      ...req.body,
      userId: req.user.id
    };
    const profile = await Profile.create(profileData);
    await createLog(
      profile.id,
      req.user.id,
      'CREATED',
      { profileData },
      req,
      `Profile "${profile.name}" created`
    );
    res.status(201).json({
      success: true,
      message: 'Profile created successfully',
      profile
    });
  } catch (error) {
    console.error('Create profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    const profile = await Profile.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    const oldValues = profile.toJSON();
    
    await profile.update(req.body);

    await createLog(
      profile.id,
      req.user.id,
      'UPDATED',
      { before: oldValues, after: profile.toJSON() },
      req,
      `Profile "${profile.name}" updated`
    );

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      profile
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const deleteProfile = async (req, res) => {
  try {
    const profile = await Profile.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    const profileName = profile.name;

    await createLog(
      profile.id,
      req.user.id,
      'DELETED',
      { deletedProfile: profile.toJSON() },
      req,
      `Profile "${profileName}" deleted`
    );

    await profile.destroy();

    res.status(200).json({
      success: true,
      message: 'Profile deleted successfully'
    });
  } catch (error) {
    console.error('Delete profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const activateProfile = async (req, res) => {
  try {
    const allProfiles = await Profile.findAll({
      where: { userId: req.user.id }
    });

    for (const prof of allProfiles) {
      if (prof.isActive) {
        await prof.update({ isActive: false });
        await createLog(
          prof.id,
          req.user.id,
          'DEACTIVATED',
          {},
          req,
          `Profile "${prof.name}" deactivated`
        );
      }
    }

    const profile = await Profile.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    await profile.update({
      isActive: true,
      lastActivatedAt: new Date(),
      activationCount: profile.activationCount + 1
    });

    // Auto-implement VPN connection if enabled on profile
    if (profile.vpnEnabled && profile.vpnServer) {
      const targetVpnId = profile.vpnServer;
      try {
        const vpnConfig = await VpnConfig.findOne({
          where: {
            // vpnServer may be storing either the ID or Name. Looking for ID or Name mismatch is complex, so try both.
            // If stored as string ID, use it. If name, use that.
            [Op.or]: [
              { id: targetVpnId },
              { name: targetVpnId }
            ],
            userId: req.user.id
          }
        });

        if (vpnConfig) {
          // Deactivate any other active VPNs for this user
          await VpnConfig.update(
            { isActive: false },
            {
              where: {
                userId: req.user.id,
                id: { [Op.ne]: vpnConfig.id }
              }
            }
          );

          // Close existing DataTransfer session
          try {
            await DataTransfer.update(
              { isActive: false, sessionEnd: new Date() },
              {
                where: {
                  userId: req.user.id,
                  isActive: true
                }
              }
            );

            // Open new DataTransfer session
            await DataTransfer.create({
              userId: req.user.id,
              vpnConfigId: vpnConfig.id,
              bytesSent: 0,
              bytesReceived: 0,
              sessionStart: new Date(),
              isActive: true
            });
          } catch (dtError) {
             console.log('DataTransfer model failed to log session on profile activation');
          }

          // Activate this VPN - First ask desktop client
          try {
              console.log(`[Profile Activation] Toggling VPN for profile: ${profile.name}`);
              const ackResponse = await emitWithAckToDesktop(req.user.id, 'RequestVpnToggle', {
                  configId: vpnConfig.id,
                  action: 'connect',
                  protocol: vpnConfig.protocol,
                  configFileName: vpnConfig.configFileName
              });
              
              if (ackResponse && ackResponse.status === 'success') {
                  await vpnConfig.update({ isActive: true });
                  console.log(`[Profile Activation] VPN activated successfully for user ${req.user.id}`);
              } else {
                  console.warn(`[Profile Activation] Desktop failed to activate VPN: ${ackResponse?.message}`);
                  await vpnConfig.update({ isActive: false });
              }
          } catch (socketError) {
              console.error(`[Profile Activation] Socket error toggling VPN: ${socketError.message}`);
              await vpnConfig.update({ isActive: false });
          }

          try {
              const ipAddress = getClientIP(req);
              await ActivityLog.create({
                  eventType: 'VPN Connection',
                  description: `VPN connected via Profile: ${vpnConfig.name} (${vpnConfig.protocol})`,
                  status: 'Success',
                  severity: 'info',
                  userId: req.user.id,
                  ipAddress: ipAddress,
                  metadata: {
                      vpnConfigId: vpnConfig.id,
                      profileId: profile.id,
                      protocol: vpnConfig.protocol
                  }
              });
          } catch (logError) {
              console.error('Error logging VPN connection on profile auth:', logError);
          }
        }
      } catch (vpnError) {
        console.error('Error auto-implementing VPN for profile: ', vpnError);
      }
    }

    // Log profile activation to activity log
    try {
      const ipAddress = getClientIP(req);
      await ActivityLog.create({
        eventType: 'Profile Activation',
        description: `Profile activated: ${profile.name}`,
        status: 'Success',
        severity: 'info',
        userId: req.user.id,
        ipAddress: ipAddress,
        metadata: {
          profileId: profile.id,
          profileName: profile.name,
          profileType: profile.profileType
        }
      });
    } catch (logError) {
      console.error('Error logging profile activation:', logError);
    }

    await createLog(
      profile.id,
      req.user.id,
      'ACTIVATED',
      { activationCount: profile.activationCount },
      req,
      `Profile "${profile.name}" activated`
    );

    res.status(200).json({
      success: true,
      message: 'Profile activated successfully',
      profile
    });
  } catch (error) {
    console.error('Activate profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error activating profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const getProfileLogs = async (req, res) => {
  try {
    const profile = await Profile.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    const logs = await ProfileLog.findAll({
      where: { profileId: req.params.id },
      order: [['createdAt', 'DESC']],
      limit: parseInt(req.query.limit) || 50
    });

    res.status(200).json({
      success: true,
      count: logs.length,
      logs
    });
  } catch (error) {
    console.error('Get profile logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching profile logs',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const getAllLogs = async (req, res) => {
  try {
    const logs = await ProfileLog.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']],
      limit: parseInt(req.query.limit) || 100,
      include: [{
        model: Profile,
        as: 'profile',
        attributes: ['id', 'name', 'profileType']
      }]
    });

    res.status(200).json({
      success: true,
      count: logs.length,
      logs
    });
  } catch (error) {
    console.error('Get all logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching logs',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
const deactivateProfile = async (req, res) => {
  try {
    const profile = await Profile.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    if (!profile.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Profile is already inactive'
      });
    }

    await profile.update({
      isActive: false
    });

    // Disconnect VPN if the profile was using it
    if (profile.vpnEnabled && profile.vpnServer) {
        try {
            const vpnConfig = await VpnConfig.findOne({
              where: {
                  [Op.or]: [
                    { id: profile.vpnServer },
                    { name: profile.vpnServer }
                  ],
                  userId: req.user.id,
                  isActive: true
              }
            });

            if (vpnConfig) {
                try {
                    console.log(`[Profile Deactivation] Toggling VPN off for profile: ${profile.name}`);
                    const ackResponse = await emitWithAckToDesktop(req.user.id, 'RequestVpnToggle', {
                        configId: vpnConfig.id,
                        action: 'disconnect',
                        protocol: vpnConfig.protocol,
                        configFileName: vpnConfig.configFileName
                    });
                    
                    if (ackResponse && ackResponse.status === 'success') {
                        await vpnConfig.update({ isActive: false });
                    } else {
                        console.warn(`[Profile Deactivation] Desktop failed to deactivate VPN: ${ackResponse?.message}`);
                        // Force false anyway on disconnect attempt
                        await vpnConfig.update({ isActive: false });
                    }
                } catch (socketError) {
                    console.error(`[Profile Deactivation] Socket error toggling VPN off: ${socketError.message}`);
                    await vpnConfig.update({ isActive: false });
                }

                // End DataTransfer Session
                try {
                    await DataTransfer.update(
                        { isActive: false, sessionEnd: new Date() },
                        {
                            where: {
                                userId: req.user.id,
                                vpnConfigId: vpnConfig.id,
                                isActive: true
                            }
                        }
                    );
                } catch (err) {
                    console.log('Skipping data transfer session on VPN disconnect via profile.');
                }

                try {
                    const ipAddress = getClientIP(req);
                    await ActivityLog.create({
                        eventType: 'VPN Disconnection',
                        description: `VPN disconnected via Profile Deactivation: ${vpnConfig.name}`,
                        status: 'Disconnected',
                        severity: 'info',
                        userId: req.user.id,
                        ipAddress: ipAddress,
                        metadata: {
                            vpnConfigId: vpnConfig.id,
                            profileId: profile.id
                        }
                    });
                } catch (logError) {
                    console.error('Error logging VPN disconnect on profile:', logError);
                }
            }
        } catch (vpnError) {
            console.error('Error disconnecting VPN on profile deactivation:', vpnError);
        }
    }

    // Log profile deactivation to activity log
    try {
      const ipAddress = getClientIP(req);
      await ActivityLog.create({
        eventType: 'Profile Deactivation',
        description: `Profile deactivated: ${profile.name}`,
        status: 'Success',
        severity: 'info',
        userId: req.user.id,
        ipAddress: ipAddress,
        metadata: {
          profileId: profile.id,
          profileName: profile.name,
          profileType: profile.profileType
        }
      });
    } catch (logError) {
      console.error('Error logging profile deactivation:', logError);
    }

    await createLog(
      profile.id,
      req.user.id,
      'DEACTIVATED',
      {},
      req,
      `Profile "${profile.name}" deactivated`
    );

    res.status(200).json({
      success: true,
      message: 'Profile deactivated successfully',
      profile
    });
  } catch (error) {
    console.error('Deactivate profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deactivating profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getProfiles,
  getProfile,
  createProfile,
  updateProfile,
  deleteProfile,
  deactivateProfile,
  activateProfile,
  getProfileLogs,
  getAllLogs
};