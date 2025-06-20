const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const {
    getCards,
    getCard,
    createCard,
    updateCard,
    deleteCard,
    moveCard,
    addComment,
    updateChecklistItem
} = require('../controllers/cardController');

// Apply auth middleware to all routes
router.use(authMiddleware);

// Card routes
router.get('/column/:columnId', getCards);
router.get('/:id', getCard);
router.post('/column/:columnId', createCard);
router.put('/:id', updateCard);
router.delete('/:id', deleteCard);

// Card actions
router.put('/:id/move', moveCard);
router.post('/:id/comments', addComment);
router.put('/:id/checklist/:itemIndex', updateChecklistItem);

module.exports = router;
