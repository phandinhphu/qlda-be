const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema(
    {
        project_name: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            default: null,
        },
        created_by: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
    },
    {
        timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
        collection: 'projects',
    },
);

module.exports = mongoose.model('Project', projectSchema);
