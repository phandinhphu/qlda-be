const mongoose = require('mongoose');

const chatRoomMemberSchema = new mongoose.Schema(
    {
        room_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ChatRoom',
            required: true,
        },
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        joined_at: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: false,
        collection: 'chat_room_members',
    },
);

// Compound index để đảm bảo một user không thể join room nhiều lần
chatRoomMemberSchema.index({ room_id: 1, user_id: 1 }, { unique: true });

module.exports = mongoose.model('ChatRoomMember', chatRoomMemberSchema);
