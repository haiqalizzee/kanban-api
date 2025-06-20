const Card = require('../models/card');
const Column = require('../models/column');
const Board = require('../models/board');

// Get all cards for a column
exports.getCards = async (req, res) => {
    try {
        const { columnId } = req.params;
        
        const column = await Column.findById(columnId).populate('board');
        if (!column) {
            return res.status(404).json({ message: 'Column not found' });
        }

        // Check if user has access to board
        const hasAccess = column.board.owner.toString() === req.user._id.toString() ||
                         column.board.members.includes(req.user._id) ||
                         column.board.isPublic;

        if (!hasAccess) {
            return res.status(403).json({ message: 'Access denied' });
        }

        const cards = await Card.find({ column: columnId })
            .populate('assignedTo', 'username email')
            .populate('comments.user', 'username email')
            .sort({ position: 1 });

        res.json(cards);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get single card
exports.getCard = async (req, res) => {
    try {
        const { id } = req.params;
        
        const card = await Card.findById(id)
            .populate('assignedTo', 'username email')
            .populate('comments.user', 'username email')
            .populate('column')
            .populate('board');

        if (!card) {
            return res.status(404).json({ message: 'Card not found' });
        }

        // Check if user has access to board
        const hasAccess = card.board.owner.toString() === req.user._id.toString() ||
                         card.board.members.includes(req.user._id) ||
                         card.board.isPublic;

        if (!hasAccess) {
            return res.status(403).json({ message: 'Access denied' });
        }

        res.json(card);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Create new card
exports.createCard = async (req, res) => {
    try {
        const { columnId } = req.params;
        const { title, description, priority, dueDate, assignedTo, labels } = req.body;
        
        const column = await Column.findById(columnId).populate('board');
        if (!column) {
            return res.status(404).json({ message: 'Column not found' });
        }

        // Check if user has access to board
        const hasAccess = column.board.owner.toString() === req.user._id.toString() ||
                         column.board.members.includes(req.user._id);

        if (!hasAccess) {
            return res.status(403).json({ message: 'Access denied' });
        }

        // Get the next position
        const lastCard = await Card.findOne({ column: columnId }).sort({ position: -1 });
        const position = lastCard ? lastCard.position + 1 : 0;

        const card = new Card({
            title,
            description,
            column: columnId,
            board: column.board._id,
            position,
            priority,
            dueDate,
            assignedTo,
            labels
        });

        const savedCard = await card.save();
        
        // Add card to column
        column.cards.push(savedCard._id);
        await column.save();

        const populatedCard = await Card.findById(savedCard._id)
            .populate('assignedTo', 'username email');

        res.status(201).json(populatedCard);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update card
exports.updateCard = async (req, res) => {
    try {
        const { id } = req.params;
        
        const card = await Card.findById(id).populate('board');
        if (!card) {
            return res.status(404).json({ message: 'Card not found' });
        }

        // Check if user has access to board
        const hasAccess = card.board.owner.toString() === req.user._id.toString() ||
                         card.board.members.includes(req.user._id);

        if (!hasAccess) {
            return res.status(403).json({ message: 'Access denied' });
        }

        const updatedCard = await Card.findByIdAndUpdate(
            id,
            req.body,
            { new: true }
        ).populate('assignedTo', 'username email')
         .populate('comments.user', 'username email');

        res.json(updatedCard);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Delete card
exports.deleteCard = async (req, res) => {
    try {
        const { id } = req.params;
        
        const card = await Card.findById(id).populate('board');
        if (!card) {
            return res.status(404).json({ message: 'Card not found' });
        }

        // Check if user has access to board
        const hasAccess = card.board.owner.toString() === req.user._id.toString() ||
                         card.board.members.includes(req.user._id);

        if (!hasAccess) {
            return res.status(403).json({ message: 'Access denied' });
        }

        // Remove card from column
        await Column.findByIdAndUpdate(
            card.column,
            { $pull: { cards: id } }
        );

        // Delete the card
        await Card.findByIdAndDelete(id);

        res.json({ message: 'Card deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Move card between columns
exports.moveCard = async (req, res) => {
    try {
        const { id } = req.params;
        const { newColumnId, newPosition } = req.body;
        
        const card = await Card.findById(id).populate('board');
        if (!card) {
            return res.status(404).json({ message: 'Card not found' });
        }

        const newColumn = await Column.findById(newColumnId);
        if (!newColumn) {
            return res.status(404).json({ message: 'Target column not found' });
        }

        // Check if user has access to board
        const hasAccess = card.board.owner.toString() === req.user._id.toString() ||
                         card.board.members.includes(req.user._id);

        if (!hasAccess) {
            return res.status(403).json({ message: 'Access denied' });
        }

        const oldColumnId = card.column;

        // Remove card from old column
        await Column.findByIdAndUpdate(oldColumnId, { $pull: { cards: id } });
        
        // Add card to new column
        await Column.findByIdAndUpdate(newColumnId, { $push: { cards: id } });

        // Update card's column and position
        card.column = newColumnId;
        card.position = newPosition || 0;
        await card.save();

        const updatedCard = await Card.findById(id)
            .populate('assignedTo', 'username email')
            .populate('comments.user', 'username email');

        res.json(updatedCard);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Add comment to card
exports.addComment = async (req, res) => {
    try {
        const { id } = req.params;
        const { text } = req.body;
        
        const card = await Card.findById(id).populate('board');
        if (!card) {
            return res.status(404).json({ message: 'Card not found' });
        }

        // Check if user has access to board
        const hasAccess = card.board.owner.toString() === req.user._id.toString() ||
                         card.board.members.includes(req.user._id);

        if (!hasAccess) {
            return res.status(403).json({ message: 'Access denied' });
        }

        card.comments.push({
            user: req.user._id,
            text,
            createdAt: new Date()
        });

        await card.save();

        const updatedCard = await Card.findById(id)
            .populate('assignedTo', 'username email')
            .populate('comments.user', 'username email');

        res.json(updatedCard);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update checklist item
exports.updateChecklistItem = async (req, res) => {
    try {
        const { id, itemIndex } = req.params;
        const { completed } = req.body;
        
        const card = await Card.findById(id).populate('board');
        if (!card) {
            return res.status(404).json({ message: 'Card not found' });
        }

        // Check if user has access to board
        const hasAccess = card.board.owner.toString() === req.user._id.toString() ||
                         card.board.members.includes(req.user._id);

        if (!hasAccess) {
            return res.status(403).json({ message: 'Access denied' });
        }

        if (card.checklist[itemIndex]) {
            card.checklist[itemIndex].completed = completed;
            await card.save();
        }

        res.json(card);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
