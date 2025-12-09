const express = require('express');
const cors = require('cors');
require('dotenv').config();

// IMPORTANT: Load models BEFORE connecting to database
const User = require('./models/User');
const VpnConfig = require('./models/VpnConfig');
const Notification = require('./models/Notification');
const Threat = require('./models/Threat');

// Connect database (this will sync models)
const { connectDB } = require('./config/db');

// Routes
const authRoutes = require('./routes/authRoutes');
require("./scheduler");
const VpnRoutes = require('./routes/VpnRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const adminRoutes = require('./routes/adminRoutes');
const profileRoutes = require('./routes/profileRoutes');
const app = express();

connectDB();


const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
    : ['http://localhost:3000'];

app.use(cors({
    origin: function (origin, callback) {
     
        if (!origin) return callback(null, true);

     
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        if (process.env.NODE_ENV === 'production' && origin.includes('.vercel.app')) {
            return callback(null, true);
        }

        console.log('CORS blocked origin:', origin);
        console.log('Allowed origins:', allowedOrigins);

        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    preflightContinue: false,
    optionsSuccessStatus: 204
}));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/vpn', VpnRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString()
    });
});

// Root route
app.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Welcome to NeoSec API',
        version: '1.0.0'
    });
});

// 404 Handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

// Start server (Render sets PORT automatically)
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server started on port ${PORT}`);
});

module.exports = app;
