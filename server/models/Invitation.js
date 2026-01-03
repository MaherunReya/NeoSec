// server/models/Invitation.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db').sequelize;

const Invitation = sequelize.define('Invitation', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    groupId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'group_id', // Map to database column name
        references: {
            model: 'groups',
            key: 'id'
        }
    },
    inviterId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'inviter_id', // Map to database column name
        references: {
            model: 'users',
            key: 'id'
        }
    },
    inviteeEmail: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'invitee_email' // Map to database column name
    },
    inviteeId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'invitee_id', // Map to database column name
        references: {
            model: 'users',
            key: 'id'
        }
    },
    status: {
        type: DataTypes.ENUM('pending', 'accepted', 'rejected', 'expired'),
        defaultValue: 'pending',
        allowNull: false
    },
    token: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'expires_at' // Map to database column name
    },
    acceptedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'accepted_at' // Map to database column name
    }
}, {
    tableName: 'invitations',
    timestamps: true,
    underscored: true // Enable underscored for timestamps (created_at, updated_at)
});

module.exports = Invitation;