const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

// Maintain a mapping of userId to their connected socket IDs
// A single user might be connected from multiple devices/tabs
const userSockets = new Map();

let io;

const initializeSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: process.env.ALLOWED_ORIGINS 
                ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim()) 
                : ['http://localhost:3000'],
            methods: ['GET', 'POST']
        },
        pingTimeout: 60000, // Heartbeat mechanism is built-in
        pingInterval: 25000,
    });

    // Authentication middleware
    io.use((socket, next) => {
        const token = socket.handshake.auth.token || socket.handshake.headers.token;
        if (!token) {
            return next(new Error('Authentication error: Token missing'));
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.userId = decoded.id; // Store userId in socket object
            next();
        } catch (err) {
            next(new Error('Authentication error: Invalid token'));
        }
    });

    io.on('connection', (socket) => {
        console.log(`Socket connected: ${socket.id} for user ${socket.userId}`);

        // Add socket to user's list of connected sockets
        const userId = socket.userId;
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

    const socketIds = userSockets.get(userId);
    if (socketIds && socketIds.size > 0) {
        socketIds.forEach((socketId) => {
            io.to(socketId).emit(event, data);
        });
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

module.exports = {
    initializeSocket,
    emitToUser,
    getIO
};
