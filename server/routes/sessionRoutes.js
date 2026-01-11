const express = require('express');
const router = express.Router();
const {
  getActiveSessions,
  logoutSession,
  logoutAllSessions
} = require('../controllers/sessionController');
const { protect } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// Get active sessions
router.get('/', getActiveSessions);

// Logout specific session
router.post('/:sessionId/logout', logoutSession);

// Logout all sessions
router.post('/logout-all', logoutAllSessions);

module.exports = router;


