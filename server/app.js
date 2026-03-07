const express = require('express');
const cors = require('cors');
require('dotenv').config();

// IMPORTANT: Load models BEFORE connecting to database
const User = require('./models/User');
const VpnConfig = require('./models/VpnConfig');
const Notification = require('./models/Notification');
const Threat = require('./models/Threat');
const FirewallRule = require('./models/FirewallRule');
const DataTransfer = require('./models/DataTransfer');

// NEW: Add hierarchy models
const Group = require('./models/Group');
const GroupMember = require('./models/GroupMember');
const Invitation = require('./models/Invitation');
const Subscription = require('./models/Subscription');
const BillingHistory = require('./models/BillingHistory');

// NEW: Add Module 1 additional feature models
const AuditLog = require('./models/AuditLog');
const Device = require('./models/Device');
const LoginHistory = require('./models/LoginHistory');
const FeatureToggle = require('./models/FeatureToggle');
const RoleTemplate = require('./models/RoleTemplate');
const MFASettings = require('./models/MFASettings');
const ImpersonationSession = require('./models/ImpersonationSession');
const UserSettings = require('./models/UserSettings');

// NEW: Add Module 3 models
const BlocklistIP = require('./models/BlocklistIP');
const ActivityLog = require('./models/ActivityLog');

// NEW: Set up associations
require('./models/associations');

// Now connect to database (this will sync the models)
const { connectDB } = require('./config/db');

// Import routes
const authRoutes = require('./routes/authRoutes');

const VpnRoutes = require('./routes/VpnRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const adminRoutes = require('./routes/adminRoutes');
const hierarchyRoutes = require('./routes/hierarchyRoutes');
const scanRoutes = require('./routes/scanRoutes');
const firewallRoutes = require('./routes/firewallRoutes');
const auditRoutes = require('./routes/auditRoutes');
const systemHealthRoutes = require('./routes/systemHealthRoutes');
const deviceRoutes = require('./routes/deviceRoutes');
const loginHistoryRoutes = require('./routes/loginHistoryRoutes');
const featureToggleRoutes = require('./routes/featureToggleRoutes');
const roleTemplateRoutes = require('./routes/roleTemplateRoutes');
const mfaRoutes = require('./routes/mfaRoutes');
const impersonationRoutes = require('./routes/impersonationRoutes');
const sharedProfileRoutes = require('./routes/sharedProfileRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const settingsRoutes = require('./routes/settingsRoutes');

// Initialize Express app
const app = express();

// Set up HTTP Server for Socket.io
const http = require('http');
const server = http.createServer(app);
const { initializeSocket } = require('./socket');
initializeSocket(server);

// Trust proxy - important for getting real client IP when behind reverse proxy (Render, etc.)
app.set('trust proxy', true);

// Connect to database (async, but don't block server startup)
connectDB().catch(err => {
    console.error('Failed to connect to database:', err);
    // In production, we might want to retry or handle this differently
    // For now, log the error and let the server start
});
app.use(
  '/api/stripe',
  require('./routes/stripeWebhook')
);

// CORS configuration
app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'token']
}));

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
const profileRoutes = require('./routes/profileRoutes');
app.use('/api/profiles', profileRoutes);

app.use('/api/vpn', VpnRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/hierarchy', hierarchyRoutes);
app.use('/api/scan', scanRoutes);
app.use('/api/firewall', firewallRoutes);
const dataTransferRoutes = require('./routes/dataTransferRoutes');
app.use('/api/data-transfer', dataTransferRoutes);
app.use('/api/auth/shared-profiles', sharedProfileRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/settings', settingsRoutes);

// New Module 1 additional features routes
app.use('/api/audit', auditRoutes);
app.use('/api/system-health', systemHealthRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/login-history', loginHistoryRoutes);
app.use('/api/feature-toggles', featureToggleRoutes);
app.use('/api/role-templates', roleTemplateRoutes);
app.use('/api/mfa', mfaRoutes);
app.use('/api/impersonation', impersonationRoutes);

// Module 3 routes
const threatBlockerRoutes = require('./routes/threatBlockerRoutes');
const activityLogRoutes = require('./routes/activityLogRoutes');
app.use('/api/threat-blocker', threatBlockerRoutes);
app.use('/api/activity-logs', activityLogRoutes);


// Health check route with database status
app.get('/api/health', async (req, res) => {
    const { sequelize } = require('./config/db');
    try {
        await sequelize.authenticate();
        res.status(200).json({
            success: true,
            message: 'Server is running',
            database: 'connected',
            timestamp: new Date().toISOString(),
            env: {
                hasJWTSecret: !!process.env.JWT_SECRET,
                hasDatabaseUrl: !!process.env.DATABASE_URL,
                nodeEnv: process.env.NODE_ENV || 'development'
            }
        });
    } catch (error) {
        res.status(503).json({
            success: false,
            message: 'Server is running but database is not connected',
            database: 'disconnected',
            error: error.message,
            timestamp: new Date().toISOString(),
            env: {
                hasJWTSecret: !!process.env.JWT_SECRET,
                hasDatabaseUrl: !!process.env.DATABASE_URL,
                nodeEnv: process.env.NODE_ENV || 'development'
            }
        });
    }
});

// Root route
app.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Welcome to NeoSec API',
        version: '1.0.0'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

// Start server
// Render provides PORT environment variable automatically
const PORT = process.env.PORT || 5000;

// Check required environment variables
if (!process.env.JWT_SECRET) {
    console.error('ERROR: JWT_SECRET environment variable is not set!');
    console.error('Please set JWT_SECRET in your environment variables.');
}

if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL environment variable is not set!');
    console.error('Please set DATABASE_URL in your environment variables.');
}

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server started on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`JWT_SECRET: ${process.env.JWT_SECRET ? 'Set' : 'NOT SET - THIS WILL CAUSE ERRORS!'}`);
    console.log(`DATABASE_URL: ${process.env.DATABASE_URL ? 'Set' : 'NOT SET - THIS WILL CAUSE ERRORS!'}`);

});

module.exports = { app, server };

