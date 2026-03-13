const VpnConfig = require('../models/VpnConfig');
const DataTransfer = require('../models/DataTransfer');
const ActivityLog = require('../models/ActivityLog');
const { Op } = require('sequelize');
const { getClientIP } = require('../utils/ipUtils');
const { emitWithAckToDesktop } = require('../socket');

// Get all VPN configs for current user
exports.getVpnConfigs = async (req, res) => {
    try {
        const vpnConfigs = await VpnConfig.findAll({
            where: { userId: req.user.id },
            order: [['createdAt', 'DESC']],
            attributes: ['id', 'name', 'protocol', 'configFileName', 'description', 'isActive', 'status', 'createdAt', 'updatedAt']
        });

        res.status(200).json({
            success: true,
            count: vpnConfigs.length,
            data: vpnConfigs
        });
    } catch (error) {
        console.error('Get VPN configs error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch VPN configurations'
        });
    }
};

// Get single VPN config (including file content)
exports.getVpnConfig = async (req, res) => {
    try {
        const vpnConfig = await VpnConfig.findOne({
            where: {
                id: req.params.id,
                userId: req.user.id
            }
        });

        if (!vpnConfig) {
            return res.status(404).json({
                success: false,
                message: 'VPN configuration not found'
            });
        }

        res.status(200).json({
            success: true,
            data: vpnConfig
        });
    } catch (error) {
        console.error('Get VPN config error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch VPN configuration'
        });
    }
};

// Create new VPN config with file upload
exports.createVpnConfig = async (req, res) => {
    try {
        const { name, protocol, description, configFileContent, configFileName } = req.body;

        // Validation
        if (!name || !protocol || !configFileContent || !configFileName) {
            return res.status(400).json({
                success: false,
                message: 'Name, protocol, and configuration file are required'
            });
        }

        // Validate protocol
        if (!['OpenVPN', 'WireGuard'].includes(protocol)) {
            return res.status(400).json({
                success: false,
                message: 'Protocol must be either OpenVPN or WireGuard'
            });
        }

        // Validate file extension
        const expectedExtension = protocol === 'OpenVPN' ? '.ovpn' : '.conf';
        if (!configFileName.endsWith(expectedExtension)) {
            return res.status(400).json({
                success: false,
                message: `For ${protocol}, file must have ${expectedExtension} extension`
            });
        }

        // Check if name already exists for this user
        const existingConfig = await VpnConfig.findOne({
            where: {
                name,
                userId: req.user.id
            }
        });

        if (existingConfig) {
            return res.status(409).json({
                success: false,
                message: 'A VPN configuration with this name already exists'
            });
        }

        const vpnConfig = await VpnConfig.create({
            name,
            protocol,
            configFileName,
            configFileContent,
            description: description || null,
            userId: req.user.id,
            isActive: false
        });

        // Return without file content
        const response = {
            id: vpnConfig.id,
            name: vpnConfig.name,
            protocol: vpnConfig.protocol,
            configFileName: vpnConfig.configFileName,
            description: vpnConfig.description,
            isActive: vpnConfig.isActive,
            createdAt: vpnConfig.createdAt,
            updatedAt: vpnConfig.updatedAt
        };

        res.status(201).json({
            success: true,
            message: 'VPN configuration created successfully',
            data: response
        });
    } catch (error) {
        console.error('Create VPN config error:', error);
        
        // Handle Sequelize validation errors specifically
        if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({
                success: false,
                message: error.errors.map(e => e.message).join(', ')
            });
        }

        res.status(500).json({
            success: false,
            message: error.message || 'Failed to create VPN configuration'
        });
    }
};

// Update VPN config
exports.updateVpnConfig = async (req, res) => {
    try {
        const vpnConfig = await VpnConfig.findOne({
            where: {
                id: req.params.id,
                userId: req.user.id
            }
        });

        if (!vpnConfig) {
            return res.status(404).json({
                success: false,
                message: 'VPN configuration not found'
            });
        }

        const { name, protocol, description, configFileContent, configFileName } = req.body;

        // Check if name is being changed and if it already exists
        if (name && name !== vpnConfig.name) {
            const existingConfig = await VpnConfig.findOne({
                where: {
                    name,
                    userId: req.user.id,
                    id: { [Op.ne]: vpnConfig.id }
                }
            });

            if (existingConfig) {
                return res.status(409).json({
                    success: false,
                    message: 'A VPN configuration with this name already exists'
                });
            }
        }

        // Validate protocol if provided
        if (protocol && !['OpenVPN', 'WireGuard'].includes(protocol)) {
            return res.status(400).json({
                success: false,
                message: 'Protocol must be either OpenVPN or WireGuard'
            });
        }

        // If file is being updated, validate extension
        if (configFileName && configFileContent) {
            const targetProtocol = protocol || vpnConfig.protocol;
            const expectedExtension = targetProtocol === 'OpenVPN' ? '.ovpn' : '.conf';
            
            if (!configFileName.endsWith(expectedExtension)) {
                return res.status(400).json({
                    success: false,
                    message: `For ${targetProtocol}, file must have ${expectedExtension} extension`
                });
            }
        }

        await vpnConfig.update({
            name: name || vpnConfig.name,
            protocol: protocol || vpnConfig.protocol,
            configFileName: configFileName || vpnConfig.configFileName,
            configFileContent: configFileContent || vpnConfig.configFileContent,
            description: description !== undefined ? description : vpnConfig.description
        });

        // Return without file content
        const response = {
            id: vpnConfig.id,
            name: vpnConfig.name,
            protocol: vpnConfig.protocol,
            configFileName: vpnConfig.configFileName,
            description: vpnConfig.description,
            isActive: vpnConfig.isActive,
            createdAt: vpnConfig.createdAt,
            updatedAt: vpnConfig.updatedAt
        };

        res.status(200).json({
            success: true,
            message: 'VPN configuration updated successfully',
            data: response
        });
    } catch (error) {
        console.error('Update VPN config error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update VPN configuration'
        });
    }
};

// Delete VPN config
exports.deleteVpnConfig = async (req, res) => {
    try {
        const vpnConfig = await VpnConfig.findOne({
            where: {
                id: req.params.id,
                userId: req.user.id
            }
        });

        if (!vpnConfig) {
            return res.status(404).json({
                success: false,
                message: 'VPN configuration not found'
            });
        }

        await vpnConfig.destroy();

        res.status(200).json({
            success: true,
            message: 'VPN configuration deleted successfully'
        });
    } catch (error) {
        console.error('Delete VPN config error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete VPN configuration'
        });
    }
};

// Toggle VPN config active status
exports.toggleVpnConfig = async (req, res) => {
    try {
        const vpnConfig = await VpnConfig.findOne({
            where: {
                id: req.params.id,
                userId: req.user.id
            }
        });

        if (!vpnConfig) {
            return res.status(404).json({
                success: false,
                message: 'VPN configuration not found'
            });
        }

        const wasActive = vpnConfig.isActive;
        const willBeActive = !wasActive;
        const targetStatus = willBeActive ? 'CONNECTING' : 'DISCONNECTING';

        // Update status to intermediate state before notifying desktop
        await vpnConfig.update({ status: targetStatus });

        // Ask desktop client to apply VPN rules and wait for acknowledgment (10s timeout)
        try {
            await emitWithAckToDesktop(req.user.id, 'RequestVpnToggle', {
                configId: vpnConfig.id,
                action: willBeActive ? 'connect' : 'disconnect',
                protocol: vpnConfig.protocol,
                configFileName: vpnConfig.configFileName
            });
            
            // Desktop confirmed it RECEIVED the request.
            // We return 200 OK now. Definitive status update will come via 'ReportVpnStatus'.
            return res.status(200).json({
                success: true,
                message: `VPN ${willBeActive ? 'activation' : 'deactivation'} initiated`,
                data: {
                    id: vpnConfig.id,
                    status: targetStatus
                }
            });

        } catch (socketError) {
            // Reset status on error
            await vpnConfig.update({ status: wasActive ? 'CONNECTED' : 'OFFLINE' });
            
            if (socketError.code === 'DESKTOP_CLIENT_NOT_FOUND') {
                return res.status(400).json({
                    success: false,
                    message: 'Desktop client is not connected. Please install and run the NeoSec Desktop Client to apply VPN rules.',
                    code: 'REQUIRE_DESKTOP_CLIENT'
                });
            }
            // Timeout or error from desktop client — do NOT update DB
            console.error('[VPN Toggle] Desktop client error/timeout:', socketError.message);
            return res.status(504).json({
                success: false,
                message: socketError.message.includes('timed out')
                    ? 'Desktop client did not respond in time. VPN status unchanged.'
                    : `Desktop client error: ${socketError.message}`,
                code: 'DESKTOP_TIMEOUT'
            });
        }

    } catch (error) {
        console.error('Toggle VPN config error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to toggle VPN configuration'
        });
    }
};

// Clone VPN Configuration
exports.cloneVpnConfig = async (req, res) => {
    try {
        const original = await VpnConfig.findOne({
            where: {
                id: req.params.id,
                userId: req.user.id
            }
        });

        if (!original) {
            return res.status(404).json({
                success: false,
                message: 'VPN configuration not found'
            });
        }

        // Generate unique name for clone
        let cloneName = `${original.name} - Copy`;
        let counter = 1;
        
        while (await VpnConfig.findOne({ where: { name: cloneName, userId: req.user.id } })) {
            cloneName = `${original.name} - Copy (${counter})`;
            counter++;
        }

        // Create clone
        const clone = await VpnConfig.create({
            name: cloneName,
            protocol: original.protocol,
            configFileName: original.configFileName,
            configFileContent: original.configFileContent,
            description: original.description,
            isActive: false,
            userId: req.user.id
        });

        res.status(201).json({
            success: true,
            message: 'VPN configuration cloned successfully',
            data: {
                id: clone.id,
                name: clone.name,
                protocol: clone.protocol,
                configFileName: clone.configFileName,
                description: clone.description,
                isActive: clone.isActive,
                createdAt: clone.createdAt,
                updatedAt: clone.updatedAt
            }
        });
    } catch (error) {
        console.error('Clone VPN config error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to clone VPN configuration'
        });
    }
};

// Download VPN config file
exports.downloadVpnConfig = async (req, res) => {
    try {
        const vpnConfig = await VpnConfig.findOne({
            where: {
                id: req.params.id,
                userId: req.user.id
            }
        });

        if (!vpnConfig) {
            return res.status(404).json({
                success: false,
                message: 'VPN configuration not found'
            });
        }

        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', `attachment; filename="${vpnConfig.configFileName}"`);
        res.send(vpnConfig.configFileContent);
    } catch (error) {
        console.error('Download VPN config error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to download VPN configuration'
        });
    }
};

// Update VPN status (REST equivalent of socket ReportVpnStatus)
exports.updateVpnStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const configId = req.params.id;

        if (!status) {
            return res.status(400).json({
                success: false,
                message: 'Status is required'
            });
        }

        const vpnConfig = await VpnConfig.findOne({
            where: {
                id: configId,
                userId: req.user.id
            }
        });

        if (!vpnConfig) {
            return res.status(404).json({
                success: false,
                message: 'VPN configuration not found'
            });
        }

        const isActive = (status === 'CONNECTED');
        const wasActive = vpnConfig.isActive;

        // Update DB
        await vpnConfig.update({ status, isActive });

        // If now connected, ensure others are marked inactive
        if (isActive) {
            await VpnConfig.update(
                { isActive: false, status: 'OFFLINE' },
                {
                    where: {
                        userId: req.user.id,
                        id: { [Op.ne]: configId }
                    }
                }
            );

            // Log session start
            try {
                await DataTransfer.create({
                    userId: req.user.id,
                    vpnConfigId: configId,
                    bytesSent: 0,
                    bytesReceived: 0,
                    sessionStart: new Date(),
                    isActive: true
                });
                
                await ActivityLog.create({
                    eventType: 'VPN Connection',
                    description: `REST confirmation: VPN connected (${vpnConfig.name})`,
                    status: 'Success',
                    severity: 'info',
                    userId: req.user.id
                });
            } catch (loggingError) {
                console.error('[VPN Status] Logging error:', loggingError.message);
            }
        } else if (wasActive && !isActive) {
            // Log disconnection if it was active
            try {
                await DataTransfer.update(
                    { isActive: false, sessionEnd: new Date() },
                    { where: { userId: req.user.id, vpnConfigId: configId, isActive: true } }
                );
                
                await ActivityLog.create({
                    eventType: 'VPN Disconnection',
                    description: `REST confirmation: VPN disconnected (${vpnConfig.name})`,
                    status: 'Disconnected',
                    severity: 'info',
                    userId: req.user.id
                });
            } catch (loggingError) {
                console.error('[VPN Status] Disconnect logging error:', loggingError.message);
            }
        }

        return res.status(200).json({
            success: true,
            message: 'VPN status updated successfully',
            data: {
                id: configId,
                status,
                isActive
            }
        });

    } catch (error) {
        console.error('Update VPN status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update VPN status'
        });
    }
};