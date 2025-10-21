const mongoose = require('mongoose');

const taskStepSchema = new mongoose.Schema(
    {
        task_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Task',
            required: true,
        },
        title: {
            type: String,
            required: true,
            trim: true,
        },
        is_completed: {
            type: Boolean,
            default: false,
        },
        position: {
            type: Number,
            required: true,
            default: 0,
        },
    },
    {
        timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
        collection: 'task_steps',
    },
);

module.exports = mongoose.model('TaskStep', taskStepSchema);
