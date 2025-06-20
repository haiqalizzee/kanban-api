const Column = require('../models/column');
const Board = require('../models/board');
const Card = require('../models/card');

// Get all columns for a board
exports.getColumns = async (req, res) => {
    try {
        const { boardId } = req.params;
        
        // Check if user has access to board
        const board = await Board.findById(boardId);
        if (!board) {
            return res.status(404).json({ message: 'Board not found' });
        }

        const hasAccess = board.owner.toString() === req.user._id.toString() ||
                         board.members.includes(req.user._id) ||
                         board.isPublic;

        if (!hasAccess) {
            return res.status(403).json({ message: 'Access denied' });
        }

        const columns = await Column.find({ board: boardId })
            .populate('cards')
            .sort({ position: 1 });

        res.json(columns);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Create new column
exports.createColumn = async (req, res) => {
    try {
        const { boardId } = req.params;
        const { title, color, limit } = req.body;
        
        // Check if user has access to board
        const board = await Board.findById(boardId);
        if (!board) {
            return res.status(404).json({ message: 'Board not found' });
        }

        const hasAccess = board.owner.toString() === req.user._id.toString() ||
                         board.members.includes(req.user._id);

        if (!hasAccess) {
            return res.status(403).json({ message: 'Access denied' });
        }

        // Get the next position
        const lastColumn = await Column.findOne({ board: boardId }).sort({ position: -1 });
        const position = lastColumn ? lastColumn.position + 1 : 0;

        const column = new Column({
            title,
            board: boardId,
            position,
            color,
            limit
        });

        const savedColumn = await column.save();
        
        // Add column to board
        board.columns.push(savedColumn._id);
        await board.save();

        res.status(201).json(savedColumn);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update column
exports.updateColumn = async (req, res) => {
    try {
        const { id } = req.params;
        
        const column = await Column.findById(id).populate('board');
        if (!column) {
            return res.status(404).json({ message: 'Column not found' });
        }

        // Check if user has access to board
        const hasAccess = column.board.owner.toString() === req.user._id.toString() ||
                         column.board.members.includes(req.user._id);

        if (!hasAccess) {
            return res.status(403).json({ message: 'Access denied' });
        }

        const updatedColumn = await Column.findByIdAndUpdate(
            id,
            req.body,
            { new: true }
        ).populate('cards');

        res.json(updatedColumn);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Delete column
exports.deleteColumn = async (req, res) => {
    try {
        const { id } = req.params;
        
        const column = await Column.findById(id).populate('board');
        if (!column) {
            return res.status(404).json({ message: 'Column not found' });
        }

        // Check if user has access to board
        const hasAccess = column.board.owner.toString() === req.user._id.toString() ||
                         column.board.members.includes(req.user._id);

        if (!hasAccess) {
            return res.status(403).json({ message: 'Access denied' });
        }

        // Delete all cards in the column
        await Card.deleteMany({ column: id });
        
        // Remove column from board
        await Board.findByIdAndUpdate(
            column.board._id,
            { $pull: { columns: id } }
        );

        // Delete the column
        await Column.findByIdAndDelete(id);

        res.json({ message: 'Column deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Reorder columns
exports.reorderColumns = async (req, res) => {
    try {
        const { boardId } = req.params;
        const { columnOrders } = req.body; // Array of { id, position }
        
        // Check if user has access to board
        const board = await Board.findById(boardId);
        if (!board) {
            return res.status(404).json({ message: 'Board not found' });
        }

        const hasAccess = board.owner.toString() === req.user._id.toString() ||
                         board.members.includes(req.user._id);

        if (!hasAccess) {
            return res.status(403).json({ message: 'Access denied' });
        }

        // Update positions
        const updatePromises = columnOrders.map(({ id, position }) =>
            Column.findByIdAndUpdate(id, { position })
        );

        await Promise.all(updatePromises);

        const columns = await Column.find({ board: boardId })
            .populate('cards')
            .sort({ position: 1 });

        res.json(columns);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
