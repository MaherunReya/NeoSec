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
      // Use camelCase column name expected in existing table
    },
    scanType: {
      type: DataTypes.ENUM('FILE', 'URL', 'IP'),
      allowNull: false,
      // Keep camelCase column naming
    },
    target: {
      type: DataTypes.STRING,
      allowNull: false
    },
    fileHash: {
      type: DataTypes.STRING,
      // camelCase
    },
    scanId: {
      type: DataTypes.STRING,
      allowNull: false,
      // camelCase
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
      // camelCase
    }
  },
  {
    sequelize,
    modelName: 'ScanHistory',
    tableName: 'scan_histories',
    timestamps: true,
    underscored: false // Use camelCase columns to match existing schema
  }
);

module.exports = ScanHistory;
