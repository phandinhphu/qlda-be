const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema(
    {
        room_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ChatRoom',
            required: true,
        },
        sender_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        message: {
            type: String,
            required: true,
        },
    },
    {
        timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
        collection: 'chat_messages',
    },
);

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
