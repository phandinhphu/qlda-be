const mongoose = require('mongoose');

const taskCommentSchema = new mongoose.Schema(
    {
        task_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Task',
            required: true,
        },
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        content: {
            type: String,
            required: true,
        },
    },
    {
        timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
        collection: 'task_comments',
    },
);

module.exports = mongoose.model('TaskComment', taskCommentSchema);
