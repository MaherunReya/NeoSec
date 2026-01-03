const express = require('express');
const router = express.Router();
const {
  getLogs,
  getLogById,
  exportLogs
} = require('../controllers/activityLogController');
const { protect } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// Activity log routes
router.get('/', getLogs);
router.get('/export', exportLogs); // support GET exports for easier filtering via query params
router.post('/export', exportLogs);
router.get('/:id', getLogById);

module.exports = router;


