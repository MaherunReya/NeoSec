// server/models/index.js

const User = require('./User');
const Profile = require('./Profile');
const ProfileLog = require('./ProfileLog');
const ScanHistory = require('./scanhistory');

const Subscription = require('./Subscription');
const Notification = require('./Notification');

const Group = require('./Group');
const GroupMember = require('./GroupMember');
const Invitation = require('./Invitation');

const VpnConfig = require('./VpnConfig'); // only if you actually have this file
const UserSettings = require('./UserSettings');

// load associations AFTER models exist
require('./associations');

// your profile associations (these were in your old index.js)
User.hasMany(Profile, { foreignKey: 'userId', as: 'profiles', onDelete: 'CASCADE' });
Profile.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(ProfileLog, { foreignKey: 'userId', as: 'profileLogs', onDelete: 'CASCADE' });
ProfileLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Profile.hasMany(ProfileLog, { foreignKey: 'profileId', as: 'logs', onDelete: 'CASCADE' });
ProfileLog.belongsTo(Profile, { foreignKey: 'profileId', as: 'profile' });

const models = {
    User,
    Profile,
    ProfileLog,
    ScanHistory,

    Subscription,
    Notification,

    Group,
    GroupMember,
    Invitation,

    VpnConfig,
    UserSettings,
};

// --- Setup Global WebSockets Broadcasting Hooks ---
const { emitToUser } = require('../socket');

Object.values(models).forEach(Model => {
    if (Model && Model.addHook) {
        Model.addHook('afterSave', (instance, options) => {
            const modelName = Model.name;
            const data = instance.toJSON();
            
            // Determine which user to broadcast to
            let userId = null;
            if (modelName === 'User') {
                userId = instance.id;
            } else if (data.userId) {
                userId = data.userId;
            } else if (data.UserId) {
                userId = data.UserId;
            }

            // Broadcast event automatically if a user is associated
            if (userId) {
                // Determine if it was just created or updated
                const isNew = instance.isNewRecord || (options && options.isNewRecord);
                const eventName = isNew ? `${modelName}Created` : `${modelName}Updated`;
                emitToUser(userId, eventName, data);
            }
        });

        Model.addHook('afterDestroy', (instance, options) => {
            const modelName = Model.name;
            const data = instance.toJSON();
            
            let userId = null;
            if (modelName === 'User') {
                userId = instance.id;
            } else if (data.userId) {
                userId = data.userId;
            } else if (data.UserId) {
                userId = data.UserId;
            }

            if (userId) {
                emitToUser(userId, `${modelName}Deleted`, data);
            }
        });
    }
});

module.exports = models;
