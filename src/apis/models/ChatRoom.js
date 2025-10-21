const mongoose = require('mongoose');

const chatRoomSchema = new mongoose.Schema(
    {
        project_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Project',
            required: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        type: {
            type: String,
            enum: ['direct', 'group'],
            required: true,
        },
    },
    {
        timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
        collection: 'chat_rooms',
    },
);

module.exports = mongoose.model('ChatRoom', chatRoomSchema);
