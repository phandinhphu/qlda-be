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
        position: {
            type: Number,
            required: true,
            default: 0,
        },
        is_completed: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
        collection: 'tasks',
    },
);

// Indexes for better query performance
taskSchema.index({ list_id: 1, position: 1 });
taskSchema.index({ list_id: 1 });

// Cascade delete: Delete tasks when list is deleted
taskSchema.post('findOneAndDelete', async function (doc) {
    if (doc) {
        // This will be handled in ListController deleteList method
    }
});

module.exports = mongoose.model('Task', taskSchema);
