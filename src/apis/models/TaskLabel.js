const mongoose = require('mongoose');

const taskLabelSchema = new mongoose.Schema(
    {
        task_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Task',
            required: true,
        },
        label_name: {
            type: String,
            required: true,
            trim: true,
        },
        color: {
            type: String,
            default: '#808080',
        },
    },
    {
        timestamps: false,
        collection: 'task_labels',
    },
);

module.exports = mongoose.model('TaskLabel', taskLabelSchema);
