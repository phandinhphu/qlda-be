const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
    {
        list_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'List',
            required: true,
        },
        assigned_to: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        title: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            default: null,
        },
        status: {
            type: String,
            enum: ['todo', 'in_progress', 'review', 'done'],
            default: 'todo',
        },
        start_date: {
            type: Date,
            default: null,
        },
        due_date: {
            type: Date,
            default: null,
        },
        priority: {
            type: String,
            enum: ['low', 'medium', 'high', 'urgent'],
            default: 'medium',
        },
    },
    {
        timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
        collection: 'tasks',
    },
);

module.exports = mongoose.model('Task', taskSchema);
