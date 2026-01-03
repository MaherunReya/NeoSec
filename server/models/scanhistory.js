const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class ScanHistory extends Model {}

ScanHistory.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id' // Map to database column name
    },
    scanType: {
      type: DataTypes.ENUM('FILE', 'URL', 'IP'),
      allowNull: false,
      field: 'scan_type' // Map to database column name
    },
    target: {
      type: DataTypes.STRING,
      allowNull: false
    },
    fileHash: {
      type: DataTypes.STRING,
      field: 'file_hash' // Map to database column name
    },
    scanId: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'scan_id' // Map to database column name
    },
    status: {
      type: DataTypes.ENUM('PENDING', 'SCANNING', 'COMPLETED', 'ERROR'),
      defaultValue: 'PENDING'
    },
    positives: DataTypes.INTEGER,
    total: DataTypes.INTEGER,
    permalink: DataTypes.STRING,
    scanDate: {
      type: DataTypes.DATE,
      field: 'scan_date' // Map to database column name
    }
  },
  {
    sequelize,
    modelName: 'ScanHistory',
    tableName: 'scan_histories',
    timestamps: true,
    underscored: true // Enable underscored for timestamps (created_at, updated_at)
  }
);

module.exports = ScanHistory;
