const User = require('../models/user');
const bcrypt = require('bcryptjs');

// Search users by username
exports.searchUsers = async (req, res) => {
    try {
        const { query, limit = 10 } = req.query;
        
        if (!query || query.trim().length < 2) {
            return res.status(400).json({ message: 'Query must be at least 2 characters long' });
        }

        // Search users by username (case insensitive, partial match)
        // Exclude the current user from results
        const users = await User.find({
            username: { $regex: query, $options: 'i' },
            _id: { $ne: req.user._id }
        })
        .select('_id username email')
        .limit(parseInt(limit));

        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get user profile
exports.getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update user profile (username only)
exports.updateUserProfile = async (req, res) => {
    try {
        const { username } = req.body;
        
        if (!username || username.trim().length < 3) {
            return res.status(400).json({ message: 'Username must be at least 3 characters long' });
        }
        
        // Check if username already exists (excluding current user)
        const existingUser = await User.findOne({ 
            username: username.trim(),
            _id: { $ne: req.user._id }
        });
        
        if (existingUser) {
            return res.status(400).json({ message: 'Username already taken' });
        }
        
        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            { username: username.trim() },
            { new: true }
        ).select('-password');

        res.json(updatedUser);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Change user password
exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        
        // Validation
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Current password and new password are required' });
        }
        
        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'New password must be at least 6 characters long' });
        }
        
        // Get user with password
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        // Verify current password
        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isCurrentPasswordValid) {
            return res.status(400).json({ message: 'Current password is incorrect' });
        }
        
        // Hash new password
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        
        // Update password
        await User.findByIdAndUpdate(req.user._id, { password: hashedNewPassword });
        
        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}; 