/**
 * Centralized CORS origin validation logic.
 * This ensures that both the Express app and the Socket.IO server 
 * follow the exact same CORS policy.
 */

const getAllowedOrigins = () => {
    return process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
        : ['http://localhost:3000'];
};

const isOriginAllowed = (origin) => {
    // 1. Allow same-origin requests (origin is null or matches the server's own host)
    if (!origin) return true;

    const allowedOrigins = getAllowedOrigins();

    // 2. Check if implicitly in ALLOWED_ORIGINS
    if (allowedOrigins.includes(origin)) {
        return true;
    }

    return false;
};

const corsOptionsDelegate = {
    origin: function (origin, callback) {
        if (isOriginAllowed(origin)) {
            callback(null, true);
        } else {
            console.log('CORS blocked origin:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    preflightContinue: false,
    optionsSuccessStatus: 204
};

module.exports = {
    getAllowedOrigins,
    isOriginAllowed,
    corsOptionsDelegate
};
