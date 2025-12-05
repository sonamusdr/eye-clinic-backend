const express = require('express');
const router = express.Router();
const { chat } = require('../controllers/chatbotController');
const { authenticate } = require('../middleware/auth');

// Chatbot endpoint (requires authentication)
router.post('/chat', authenticate, chat);

// Diagnostic endpoint to check AI configuration (requires authentication)
router.get('/status', authenticate, (req, res) => {
  const hasOpenAIKey = !!process.env.OPENAI_API_KEY;
  const openaiModel = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
  
  // Import the openaiClient from the controller to check its actual status
  const chatbotController = require('../controllers/chatbotController');
  
  // Try to check if OpenAI client is initialized
  let openaiStatus = 'not_configured';
  let clientInitialized = false;
  
  try {
    if (hasOpenAIKey) {
      const OpenAI = require('openai');
      const testClient = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
      openaiStatus = 'configured';
      clientInitialized = true;
    }
  } catch (error) {
    openaiStatus = 'error';
    console.error('OpenAI initialization error:', error.message);
  }

  res.json({
    success: true,
    ai: {
      enabled: hasOpenAIKey && openaiStatus === 'configured',
      status: openaiStatus,
      model: openaiModel,
      apiKeyPresent: hasOpenAIKey,
      apiKeyLength: hasOpenAIKey ? process.env.OPENAI_API_KEY.length : 0,
      apiKeyPrefix: hasOpenAIKey ? process.env.OPENAI_API_KEY.substring(0, 7) + '...' : null,
      clientInitialized: clientInitialized
    },
    message: hasOpenAIKey && openaiStatus === 'configured' 
      ? 'AI is properly configured and ready to use'
      : hasOpenAIKey 
        ? 'AI API key is set but there was an error initializing'
        : 'AI is not configured. Using rule-based chatbot.'
  });
});

module.exports = router;

