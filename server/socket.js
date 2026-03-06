const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

let io; // Hold the socket.io instance globally

const initSocketServer = (server) => {
  // CORS configuration for Socket.IO matching the Express app
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
    : ['http://localhost:3000'];

  io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"]
    }
  });

  // Authentication Middleware
  io.use((socket, next) => {
    // Client must pass the JWT token during connection setup in socket.auth.token
    const token = socket.handshake.auth?.token;
    
    if (!token) {
      return next(new Error("Authentication error: No token provided"));
    }

    try {
      // Note: Make sure process.env.JWT_SECRET is set
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded; // attach decoded user payload
      next();
    } catch (err) {
      console.error("Socket Auth Error:", err.message);
      return next(new Error("Authentication error: Invalid or expired token"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`[Socket.IO] User connected: ${socket.user.id} (SID: ${socket.id})`);
    
    // Socket.IO makes connection management easy using "rooms".
    // We make each user join a room named after their userId.
    socket.join(socket.user.id);
    
    // Handled automatically: ping/pong keep-alive heartbeat.
    // If a client doesn't respond to pings, socket.io automatically disconnects them.

    socket.on("disconnect", (reason) => {
      console.log(`[Socket.IO] User disconnected: ${socket.user.id} (SID: ${socket.id}) | Reason: ${reason}`);
    });
  });

  return io;
};

/**
 * Utility function to emit an event to all connected sockets of a specific user.
 * 
 * @param {string} userId - The target user's ID
 * @param {string} eventName - The name of the event (e.g., 'MODEL_UPDATE')
 * @param {Object} data - The payload to send
 */
const broadcastToUser = (userId, eventName, data) => {
  if (io) {
    // Emit to the user's specific room
    io.to(userId.toString()).emit(eventName, data);
  } else {
    console.warn("Socket.IO is not initialized yet. Skipping broadcast.");
  }
};

module.exports = {
  initSocketServer,
  broadcastToUser,
  getIo: () => io
};
