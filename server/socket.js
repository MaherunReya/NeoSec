const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { corsOptionsDelegate } = require('./utils/corsOptions');

// Maintain a mapping of userId to their connected socket IDs
// A single user might be connected from multiple devices/tabs
const userSockets = new Map();

let io;

const initializeSocket = (server) => {
    io = new Server(server, {
        path: '/api/socket.io',
        cors: corsOptionsDelegate,
        pingTimeout: 60000, // Heartbeat mechanism is built-in
        pingInterval: 25000,
    });

    // Authentication middleware
    io.use((socket, next) => {
        let token = socket.handshake.auth.token || socket.handshake.headers.token;
        if (!token) {
            return next(new Error('Authentication error: Token missing'));
        }

        // Support tokens passed as "Bearer eyJhb..."
        if (token.startsWith('Bearer ')) {
            token = token.slice(7);
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            console.log("[Socket] Token decoded:", decoded);

            socket.userId = decoded.userId;
            socket.clientType = socket.handshake.auth.clientType || socket.handshake.headers.clienttype || 'web';

            if (!socket.userId) {
                console.error("[Socket] Failed to find userId in token payload");
            }
            next();
        } catch (err) {
            console.error("[Socket] Token verification failed:", err.message);
            next(new Error('Authentication error: Invalid token'));
        }
    });

    io.on('connection', (socket) => {
        const userId = String(socket.userId);
        console.log(`Socket connected: ${socket.id} for user ${userId}`);

        // Add socket to user's list of connected sockets
        if (!userSockets.has(userId)) {
            userSockets.set(userId, new Set());
        }
        userSockets.get(userId).add(socket.id);

        socket.on('disconnect', () => {
            console.log(`Socket disconnected: ${socket.id} for user ${userId}`);

            // Remove socket from user's active sockets
            if (userSockets.has(userId)) {
                const userSocketSet = userSockets.get(userId);
                userSocketSet.delete(socket.id);

                // Optional cleanup: remove the key if there are no more active sockets for this user
                if (userSocketSet.size === 0) {
                    userSockets.delete(userId);
                }
            }
        });

        socket.on('error', (err) => {
            console.error(`Socket error for ${socket.id}:`, err);
        });

        // Async VPN reporting
        socket.on('ReportVpnStatus', async (data) => {
            console.log(`📩 [Socket] 'ReportVpnStatus' received from user ${userId}:`, data);
            
            const { configId, status } = data;
            if (!configId || !status) return;

            try {
                const VpnConfig = require('./models/VpnConfig');
                const DataTransfer = require('./models/DataTransfer');
                const ActivityLog = require('./models/ActivityLog');
                const { Op } = require('sequelize');

                const vpnConfig = await VpnConfig.findByPk(configId);
                if (!vpnConfig) {
                    console.error(`[Socket] VPN config ${configId} not found for report`);
                    return;
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
                                userId: userId,
                                id: { [Op.ne]: configId }
                            }
                        }
                    );

                    // Session management log
                    try {
                        await DataTransfer.create({
                            userId: userId,
                            vpnConfigId: configId,
                            bytesSent: 0,
                            bytesReceived: 0,
                            sessionStart: new Date(),
                            isActive: true
                        });
                        
                        await ActivityLog.create({
                            eventType: 'VPN Connection',
                            description: `Asynchronous confirmation: VPN connected (${vpnConfig.name})`,
                            status: 'Success',
                            severity: 'info',
                            userId: userId
                        });
                    } catch (e) {}
                } else if (wasActive && !isActive) {
                    // Log disconnection if it was active
                    try {
                        await DataTransfer.update(
                            { isActive: false, sessionEnd: new Date() },
                            { where: { userId: userId, vpnConfigId: configId, isActive: true } }
                        );
                        
                        await ActivityLog.create({
                            eventType: 'VPN Disconnection',
                            description: `Asynchronous confirmation: VPN disconnected (${vpnConfig.name})`,
                            status: 'Disconnected',
                            severity: 'info',
                            userId: userId
                        });
                    } catch (e) {}
                }

            } catch (err) {
                console.error('[Socket] Failed to process ReportVpnStatus:', err.message);
            }
        });
    });

    return io;
};

/**
 * Emit an event to a specific user
 * @param {string} userId - The user's ID
 * @param {string} event - The event name
 * @param {any} data - The payload
 */
const emitToUser = (userId, event, data) => {
    if (!io) {
        console.warn('Socket.io not initialized. Cannot emit event.');
        return;
    }

    const uid = String(userId);
    console.log(`[Socket] Attempting to emit '${event}' to user ${uid}`);

    const socketIds = userSockets.get(uid);
    if (socketIds && socketIds.size > 0) {
        console.log(`[Socket] Found ${socketIds.size} sockets for user ${uid}, emitting...`);
        socketIds.forEach((socketId) => {
            io.to(socketId).emit(event, data);
        });
    } else {
        console.log(`[Socket] No active sockets found for user ${uid}.`);
    }
};

/**
 * Get the initialized io instance
 */
const getIO = () => {
    if (!io) {
        throw new Error('Socket.io has not been initialized');
    }
    return io;
};

/**
 * Emit an event to a user's desktop client and wait for acknowledgment
 * @param {string} userId - The user's ID
 * @param {string} event - The event name
 * @param {any} data - The payload
 * @returns {Promise<any>} The acknowledgment from the desktop client
 */
const emitWithAckToDesktop = (userId, event, data) => {
    return new Promise((resolve, reject) => {
        if (!io) {
            return reject(new Error('Socket.io not initialized. Cannot emit event.'));
        }

        const uid = String(userId);
        const socketIds = userSockets.get(uid);

        if (!socketIds || socketIds.size === 0) {
            const error = new Error('No active sockets found for user');
            error.code = 'DESKTOP_CLIENT_NOT_FOUND';
            return reject(error);
        }

        // Find a desktop socket
        let desktopSocket = null;
        for (const socketId of socketIds) {
            const s = io.sockets.sockets.get(socketId);
            if (s && s.clientType === 'desktop') {
                desktopSocket = s;
                break;
            }
        }

        if (!desktopSocket) {
            const error = new Error('No desktop client found for user');
            error.code = 'DESKTOP_CLIENT_NOT_FOUND';
            return reject(error);
        }

        console.log(`[Socket] Emitting '${event}' to desktop client of user ${uid}`);
        
        // Use timeout to prevent hanging forever if client doesn't respond
        desktopSocket.timeout(10000).emit(event, data, (err, response) => {
            if (err) {
                return reject(new Error(`Desktop client timed out for event ${event}`));
            }
            if (response && response.status === 'error') {
                return reject(new Error(response.message || 'Desktop client returned an error'));
            }
            resolve(response);
        });
    });
};

module.exports = {
    initializeSocket,
    emitToUser,
    getIO,
    emitWithAckToDesktop
};
