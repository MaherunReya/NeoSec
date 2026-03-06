const User = require('./User');
const Profile = require('./Profile');
const VpnConfig = require('./VpnConfig');
const FirewallRule = require('./FirewallRule');
const UserSettings = require('./UserSettings');
const { broadcastToUser } = require('../socket');

const attachHooks = () => {
  // Generic handler to broadcast updates
  const handleUpdate = (modelName, action) => (instance) => {
    try {
      // Find userId: either it's on the instance, or the instance is a User
      const userId = instance.userId || (modelName === 'User' ? instance.id : null);
      if (userId) {
        broadcastToUser(userId, 'MODEL_UPDATE', {
          model: modelName,
          action,
          data: instance.toJSON()
        });
      }
    } catch (err) {
      console.error(`Error in ${modelName} ${action} hook:`, err);
    }
  };

  // Add hooks for Profile
  Profile.addHook('afterCreate', handleUpdate('Profile', 'create'));
  Profile.addHook('afterUpdate', handleUpdate('Profile', 'update'));
  Profile.addHook('afterDestroy', handleUpdate('Profile', 'destroy'));

  // Add hooks for VpnConfig
  VpnConfig.addHook('afterCreate', handleUpdate('VpnConfig', 'create'));
  VpnConfig.addHook('afterUpdate', handleUpdate('VpnConfig', 'update'));
  VpnConfig.addHook('afterDestroy', handleUpdate('VpnConfig', 'destroy'));

  // Add hooks for FirewallRule
  FirewallRule.addHook('afterCreate', handleUpdate('FirewallRule', 'create'));
  FirewallRule.addHook('afterUpdate', handleUpdate('FirewallRule', 'update'));
  FirewallRule.addHook('afterDestroy', handleUpdate('FirewallRule', 'destroy'));

  // Add hooks for UserSettings
  UserSettings.addHook('afterCreate', handleUpdate('UserSettings', 'create'));
  UserSettings.addHook('afterUpdate', handleUpdate('UserSettings', 'update'));
  UserSettings.addHook('afterDestroy', handleUpdate('UserSettings', 'destroy'));

  // Add hooks for User
  User.addHook('afterUpdate', handleUpdate('User', 'update'));
  
  console.log('Sequelize real-time hooks attached for Socket.IO.');
};

module.exports = { attachHooks };
