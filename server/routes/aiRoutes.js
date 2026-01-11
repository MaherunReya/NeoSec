const express = require('express');
const router = express.Router();
const { profileAssist, checkOllamaHealth } = require('../controllers/aiAssistantController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.post('/profile-assist', profileAssist);
router.get('/health', checkOllamaHealth);

module.exports = router;

