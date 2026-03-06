const express = require('express');
const router = express.Router();
const {
  getLoginHistory,
  getSecurityEvents,
  toggleUserLock,
  terminateSession,
  terminateAllSessions
} = require('../controllers/loginHistoryController');
const { protect, admin } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

router.get('/', getLoginHistory);
router.get('/security-events', getSecurityEvents);
router.delete('/sessions/:sessionId', terminateSession);
router.delete('/sessions', terminateAllSessions);
router.put('/user/:userId/lock', admin, toggleUserLock);

module.exports = router;

