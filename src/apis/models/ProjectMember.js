const mongoose = require('mongoose');

const projectMemberSchema = new mongoose.Schema(
    {
        project_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Project',
            required: true,
        },
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        role: {
            type: String,
            enum: ['owner', 'admin', 'member'],
            default: 'member',
        },
        joined_at: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: false,
        collection: 'project_members',
    },
);

// Compound index để đảm bảo một user không thể join project nhiều lần
projectMemberSchema.index({ project_id: 1, user_id: 1 }, { unique: true });

module.exports = mongoose.model('ProjectMember', projectMemberSchema);
