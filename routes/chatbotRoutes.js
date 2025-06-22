const express = require('express');
const router = express.Router();
const { generateResponse, getBoardsContext } = require('../controllers/chatbotController');
const authMiddleware = require('../middlewares/authMiddleware');

// Apply auth middleware to all chatbot routes
router.use(authMiddleware);

// Generate AI response
router.post('/chat', generateResponse);

// Get boards context (useful for understanding what data is available)
router.get('/context', getBoardsContext);

module.exports = router; 