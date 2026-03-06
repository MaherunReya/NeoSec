const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const UserSettings = sequelize.define('UserSettings', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: null
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: null
  },
  username: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: null
  },
  avatarUrl: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: null
  },
  groupInvitations: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  securityAlerts: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  billingUpdates: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  }
}, {
  tableName: 'user_settings',
  timestamps: true,
  indexes: [
    { fields: ['userId'], unique: true }
  ]
});

module.exports = UserSettings;
