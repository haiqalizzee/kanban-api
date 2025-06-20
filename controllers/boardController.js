const Board = require('../models/board');
const Column = require('../models/column');
const Card = require('../models/card');

// Get all boards for authenticated user
exports.getBoards = async (req, res) => {
    try {
        const boards = await Board.find({
            $or: [
                { owner: req.user._id },
                { members: req.user._id }
            ]
        }).populate('owner', 'username email').populate('members', 'username email');
        
        res.json(boards);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get single board
exports.getBoard = async (req, res) => {
    try {
        const board = await Board.findById(req.params.id)
            .populate('owner', 'username email')
            .populate('members', 'username email')
            .populate({
                path: 'columns',
                populate: {
                    path: 'cards',
                    populate: {
                        path: 'assignedTo',
                        select: 'username email'
                    }
                }
            });

        if (!board) {
            return res.status(404).json({ message: 'Board not found' });
        }

        // Check if user has access to board
        const hasAccess = board.owner._id.toString() === req.user._id.toString() ||
                         board.members.some(member => member._id.toString() === req.user._id.toString()) ||
                         board.isPublic;

        if (!hasAccess) {
            return res.status(403).json({ message: 'Access denied' });
        }

        res.json(board);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Create new board
exports.createBoard = async (req, res) => {
    try {
        const { title, description, backgroundColor, isPublic, notes, members } = req.body;
        
        // Validate members if provided
        if (members && Array.isArray(members)) {
            const User = require('../models/user');
            for (const memberId of members) {
                const user = await User.findById(memberId);
                if (!user) {
                    return res.status(400).json({ message: `User with ID ${memberId} not found` });
                }
                // Prevent adding owner as member
                if (memberId === req.user._id.toString()) {
                    return res.status(400).json({ message: 'Cannot add yourself as a member (you are the owner)' });
                }
            }
        }
        
        const board = new Board({
            title,
            description,
            owner: req.user._id,
            members: members || [],
            backgroundColor,
            isPublic,
            notes: notes || ''
        });

        const savedBoard = await board.save();
        
        // Create default columns
        const defaultColumns = [
            { title: 'To Do', position: 0 },
            { title: 'In Progress', position: 1 },
            { title: 'Done', position: 2 }
        ];

        const columns = await Column.insertMany(
            defaultColumns.map(col => ({
                ...col,
                board: savedBoard._id
            }))
        );

        savedBoard.columns = columns.map(col => col._id);
        await savedBoard.save();

        const populatedBoard = await Board.findById(savedBoard._id)
            .populate('owner', 'username email')
            .populate('members', 'username email')
            .populate('columns');

        res.status(201).json(populatedBoard);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update board
exports.updateBoard = async (req, res) => {
    try {
        const board = await Board.findById(req.params.id);
        
        if (!board) {
            return res.status(404).json({ message: 'Board not found' });
        }

        // Check if user is owner
        if (board.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Only board owner can update board' });
        }

        const updatedBoard = await Board.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        ).populate('owner', 'username email').populate('members', 'username email');

        res.json(updatedBoard);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Delete board
exports.deleteBoard = async (req, res) => {
    try {
        const board = await Board.findById(req.params.id);
        
        if (!board) {
            return res.status(404).json({ message: 'Board not found' });
        }

        // Check if user is owner
        if (board.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Only board owner can delete board' });
        }

        // Delete all cards in the board
        await Card.deleteMany({ board: req.params.id });
        
        // Delete all columns in the board
        await Column.deleteMany({ board: req.params.id });
        
        // Delete the board
        await Board.findByIdAndDelete(req.params.id);

        res.json({ message: 'Board deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Add member to board
exports.addMember = async (req, res) => {
    try {
        const { userId } = req.body;
        const board = await Board.findById(req.params.id);
        
        if (!board) {
            return res.status(404).json({ message: 'Board not found' });
        }

        // Check if user is owner
        if (board.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Only board owner can add members' });
        }

        // Validate that the user exists
        const User = require('../models/user');
        const userToAdd = await User.findById(userId);
        if (!userToAdd) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if user is already a member or owner
        if (board.owner.toString() === userId) {
            return res.status(400).json({ message: 'Cannot add owner as member' });
        }

        if (board.members.includes(userId)) {
            return res.status(400).json({ message: 'User is already a member of this board' });
        }

        board.members.push(userId);
        await board.save();

        const updatedBoard = await Board.findById(req.params.id)
            .populate('owner', 'username email')
            .populate('members', 'username email');

        res.json(updatedBoard);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Remove member from board
exports.removeMember = async (req, res) => {
    try {
        const { userId } = req.body;
        const board = await Board.findById(req.params.id);
        
        if (!board) {
            return res.status(404).json({ message: 'Board not found' });
        }

        // Check if user is owner
        if (board.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Only board owner can remove members' });
        }

        board.members = board.members.filter(member => member.toString() !== userId);
        await board.save();

        const updatedBoard = await Board.findById(req.params.id)
            .populate('owner', 'username email')
            .populate('members', 'username email');

        res.json(updatedBoard);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get board notes
exports.getBoardNotes = async (req, res) => {
    try {
        const board = await Board.findById(req.params.id);
        
        if (!board) {
            return res.status(404).json({ message: 'Board not found' });
        }

        // Check if user has access to board
        const hasAccess = board.owner.toString() === req.user._id.toString() ||
                         board.members.some(member => member.toString() === req.user._id.toString()) ||
                         board.isPublic;

        if (!hasAccess) {
            return res.status(403).json({ message: 'Access denied' });
        }

        res.json({ notes: board.notes || '' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update board notes
exports.updateBoardNotes = async (req, res) => {
    try {
        const { notes } = req.body;
        const board = await Board.findById(req.params.id);
        
        if (!board) {
            return res.status(404).json({ message: 'Board not found' });
        }

        // Check if user has access to board (owner or member)
        const hasAccess = board.owner.toString() === req.user._id.toString() ||
                         board.members.some(member => member.toString() === req.user._id.toString());

        if (!hasAccess) {
            return res.status(403).json({ message: 'Access denied. Only board members can update notes' });
        }

        board.notes = notes || '';
        await board.save();

        res.json({ 
            message: 'Notes updated successfully',
            notes: board.notes 
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
