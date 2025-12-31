const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../util/constants');
const ChatMessage = require('../apis/models/ChatMessage');
const ChatRoomMember = require('../apis/models/ChatRoomMember');
const User = require('../apis/models/User');

let io;

const initializeSocket = (server) => {
    io = socketIo(server, {
        cors: {
            origin: process.env.FRONTEND_URL || 'http://localhost:3000',
            credentials: true,
        },
    });

    // Middleware xác thực
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

            if (!token) {
                return next(new Error('Authentication error'));
            }

            const decoded = jwt.verify(token, JWT_SECRET);
            const user = await User.findById(decoded.id).select('-password');

            if (!user) {
                return next(new Error('User not found'));
            }

            socket.userId = user._id.toString();
            socket.user = user;
            next();
        } catch (error) {
            console.error('Socket authentication error:', error);
            next(new Error('Authentication error'));
        }
    });

    io.on('connection', (socket) => {
        console.log(`User connected: ${socket.userId}`);

        // Danh sách người dùng đang online
        const onlineUsers = new Map();

        // User online tracking
        socket.on('user_online', (userId) => {
            onlineUsers.set(userId, socket.id);
            console.log(`User online: ${userId}, size: ${onlineUsers.size}`);
            io.emit('user-status', {
                userId,
                status: 'online',
            });
        });

        // User offline tracking
        socket.on('user_offline', () => {
            for (let [userId, socketId] of onlineUsers.entries()) {
                console.log(`Checking offline user: ${userId}`);
                if (socketId === socket.id) {
                    onlineUsers.delete(userId);

                    io.emit('user-status', {
                        userId,
                        status: 'offline',
                    });
                    break;
                }
            }
        });

        // Join user's personal room
        socket.join(`user:${socket.userId}`);

        // Join chat room
        socket.on('join_room', async (data) => {
            try {
                const { roomId } = data;

                // Kiểm tra user có quyền truy cập room không
                const member = await ChatRoomMember.findOne({
                    room_id: roomId,
                    user_id: socket.userId,
                });

                if (!member) {
                    socket.emit('error', { message: 'Bạn không có quyền truy cập phòng chat này' });
                    return;
                }

                socket.join(`room:${roomId}`);
                socket.currentRoomId = roomId;
                console.log(`User ${socket.userId} joined room ${roomId}`);

                socket.emit('joined_room', { roomId });
            } catch (error) {
                console.error('Error joining room:', error);
                socket.emit('error', { message: 'Có lỗi xảy ra khi tham gia phòng chat' });
            }
        });

        // Leave chat room
        socket.on('leave_room', (data) => {
            const { roomId } = data;
            socket.leave(`room:${roomId}`);
            socket.currentRoomId = null;
            console.log(`User ${socket.userId} left room ${roomId}`);
        });

        // Send message
        socket.on('send_message', async (data) => {
            try {
                const { roomId, message } = data;

                if (!message || message.trim().length === 0) {
                    socket.emit('error', { message: 'Nội dung tin nhắn là bắt buộc' });
                    return;
                }

                // Kiểm tra user có quyền gửi tin nhắn không
                const member = await ChatRoomMember.findOne({
                    room_id: roomId,
                    user_id: socket.userId,
                });

                if (!member) {
                    socket.emit('error', { message: 'Bạn không có quyền gửi tin nhắn vào phòng chat này' });
                    return;
                }

                // Lưu tin nhắn vào database
                const newMessage = new ChatMessage({
                    room_id: roomId,
                    sender_id: socket.userId,
                    message: message.trim(),
                });

                await newMessage.save();
                await newMessage.populate('sender_id', 'name email avatar_url');

                // Broadcast tin nhắn đến tất cả users trong room trừ sender
                socket.to(`room:${roomId}`).emit('new_message', {
                    message: newMessage,
                });

                // Broadcast tin nhắn đến tất cả users không trong room nhưng có liên quan (ví dụ: được mention)
                const sockets = await io.in(`room:${roomId}`).fetchSockets(); // Lấy tất cả sockets trong room
                const usersInRoom = sockets.map((s) => s.userId);

                const relatedMembers = await ChatRoomMember.find({
                    room_id: roomId,
                }).populate('user_id', '_id');

                relatedMembers.forEach((member) => {
                    const userId = member.user_id._id.toString();

                    if (!usersInRoom.includes(userId) && userId !== socket.userId) {
                        io.to(`user:${member.user_id._id.toString()}`).emit('new_message', {
                            message: newMessage,
                        });
                        console.log(`Message notification sent to user ${member.user_id._id.toString()}`);
                    }
                });

                console.log(`Message sent to room ${roomId} by user ${socket.userId}`);
            } catch (error) {
                console.error('Error sending message:', error);
                socket.emit('error', { message: 'Có lỗi xảy ra khi gửi tin nhắn' });
            }
        });

        // Typing indicator
        socket.on('typing', (data) => {
            const { roomId, isTyping } = data;
            socket.to(`room:${roomId}`).emit('user_typing', {
                userId: socket.userId,
                userName: socket.user.name,
                isTyping,
            });
        });

        // Disconnect
        socket.on('disconnect', () => {
            console.log(`User disconnected: ${socket.userId}`);
        });
    });

    return io;
};

const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized!');
    }
    return io;
};

module.exports = {
    initializeSocket,
    getIO,
};
