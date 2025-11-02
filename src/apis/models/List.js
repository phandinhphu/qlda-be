const mongoose = require('mongoose');

const listSchema = new mongoose.Schema(
    {
        project_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Project',
            required: true,
        },
        title: {
            type: String,
            required: true,
            trim: true,
        },
        position: {
            type: Number,
            required: true,
            default: 0,
        },
    },
    {
        timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
        collection: 'lists',
    },
);

// Indexes for better query performance
listSchema.index({ project_id: 1, position: 1 });
listSchema.index({ project_id: 1 });

module.exports = mongoose.model('List', listSchema);
