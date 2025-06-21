const mongoose = require('mongoose');

const boardSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    members: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    columns: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Column'
    }],
    backgroundColor: {
        type: String,
        default: '#ffffff'
    },
    isPublic: {
        type: Boolean,
        default: false
    },
    notes: {
        type: String,
        default: '',
        trim: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Board', boardSchema);
