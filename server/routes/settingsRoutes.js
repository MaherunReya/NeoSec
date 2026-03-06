const express = require('express');
const {
  getSettings,
  updateProfile,
  updateNotifications,
  changePassword,
  deleteAccount
} = require('../controllers/settingsController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/me', getSettings);
router.put('/me', updateProfile);
router.put('/notifications', updateNotifications);
router.put('/password', changePassword);
router.delete('/me', deleteAccount);

module.exports = router;
