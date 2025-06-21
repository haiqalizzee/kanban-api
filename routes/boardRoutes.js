const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const {
    getBoards,
    getBoard,
    createBoard,
    updateBoard,
    deleteBoard,
    addMember,
    removeMember,
    getBoardNotes,
    updateBoardNotes
} = require('../controllers/boardController');

// Apply auth middleware to all routes
router.use(authMiddleware);

// Board routes
router.get('/', getBoards);
router.get('/:id', getBoard);
router.post('/', createBoard);
router.put('/:id', updateBoard);
router.delete('/:id', deleteBoard);

// Member management
router.post('/:id/members', addMember);
router.delete('/:id/members', removeMember);

// Notes management
router.get('/:id/notes', getBoardNotes);
router.put('/:id/notes', updateBoardNotes);

module.exports = router;
