const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const {
    getColumns,
    createColumn,
    updateColumn,
    deleteColumn,
    reorderColumns
} = require('../controllers/columnController');

// Apply auth middleware to all routes
router.use(authMiddleware);

// Column routes
router.get('/board/:boardId', getColumns);
router.post('/board/:boardId', createColumn);
router.put('/:id', updateColumn);
router.delete('/:id', deleteColumn);
router.put('/board/:boardId/reorder', reorderColumns);

module.exports = router;
