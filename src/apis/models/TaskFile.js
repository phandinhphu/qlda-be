const mongoose = require('mongoose');

const taskFileSchema = new mongoose.Schema(
    {
        task_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Task',
            required: true,
        },
        file_url: {
            type: String,
            required: true,
        },
        uploaded_by: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        uploaded_at: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: false,
        collection: 'task_files',
    },
);

module.exports = mongoose.model('TaskFile', taskFileSchema);
