const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const {
    searchUsers,
    getUserProfile,
    updateUserProfile,
    changePassword
} = require('../controllers/userController');

// Apply auth middleware to all routes
router.use(authMiddleware);

// User routes
router.get('/search', searchUsers);
router.get('/profile', getUserProfile);
router.put('/profile', updateUserProfile);
router.put('/change-password', changePassword);

module.exports = router; 