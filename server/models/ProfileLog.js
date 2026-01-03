const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const ProfileLog = sequelize.define('ProfileLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  profileId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'profile_id', // Map to database column name
    references: {
      model: 'profiles',
      key: 'id'
    }
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'user_id', // Map to database column name
    references: {
      model: 'users',
      key: 'id'
    }
  },
  action: {
    type: DataTypes.ENUM(
      'CREATED',
      'UPDATED',
      'DELETED',
      'ACTIVATED',
      'DEACTIVATED',
      'SCHEDULED',
      'AUTO_ACTIVATED'
    ),
    allowNull: false
  },
  changes: {
    type: DataTypes.JSON,
    allowNull: true
  },
  userEmail: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'user_email' // Map to database column name
  },
  ipAddress: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'ip_address' // Map to database column name
  },
  userAgent: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'user_agent' // Map to database column name
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'profile_logs',
  timestamps: true,
  updatedAt: false
});

module.exports = ProfileLog;