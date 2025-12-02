const express = require('express');
const router = express.Router();
const { chat } = require('../controllers/chatbotController');
const { authenticate } = require('../middleware/auth');

// Chatbot endpoint (requires authentication)
router.post('/chat', authenticate, chat);

module.exports = router;

