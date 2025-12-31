const ChatRoom = require('../models/ChatRoom');
const ChatMessage = require('../models/ChatMessage');
const ChatRoomMember = require('../models/ChatRoomMember');
const Project = require('../models/Project');
const User = require('../models/User');
const mongoose = require('mongoose');

class ChatController {
    /**
     * [GET] /api/chat/rooms/project/:projectId
     * Lấy danh sách phòng chat của một project
     */
    async getRoomsByProject(req, res) {
        try {
            const { projectId } = req.params;
            const userId = req.user._id;

            // Kiểm tra project tồn tại
            const project = await Project.findById(projectId);
            if (!project) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy dự án',
                });
            }

            // Lấy tất cả rooms của project mà user là thành viên
            const roomMembers = await ChatRoomMember.find({ user_id: userId })
                .populate({
                    path: 'room_id',
                    match: { project_id: projectId },
                    populate: {
                        path: 'project_id',
                        select: 'project_name',
                    },
                })
                .lean();

            // Filter out null rooms (rooms not in this project)
            const rooms = roomMembers.filter((rm) => rm.room_id !== null).map((rm) => rm.room_id);

            // Get last message for each room
            const roomsWithLastMessage = await Promise.all(
                rooms.map(async (room) => {
                    const lastMessage = await ChatMessage.findOne({ room_id: room._id })
                        .sort({ created_at: -1 })
                        .populate('sender_id', 'name avatar_url')
                        .lean();

                    // Get other members for direct chat
                    let otherMember = null;
                    if (room.type === 'direct') {
                        const members = await ChatRoomMember.find({ room_id: room._id })
                            .populate('user_id', 'name avatar_url')
                            .lean();
                        otherMember = members.find((m) => m.user_id._id.toString() !== userId.toString())?.user_id;
                    }

                    return {
                        ...room,
                        last_message: lastMessage,
                        other_member: otherMember,
                    };
                }),
            );

            return res.status(200).json({
                success: true,
                data: roomsWithLastMessage,
                message: 'Lấy danh sách phòng chat thành công',
            });
        } catch (error) {
            console.error('Error getting chat rooms:', error);
            return res.status(500).json({
                success: false,
                message: 'Có lỗi xảy ra khi lấy danh sách phòng chat',
            });
        }
    }

    /**
     * [GET] /api/chat/rooms/:roomId/messages
     * Lấy danh sách tin nhắn trong phòng chat
     */
    async getMessagesByRoom(req, res) {
        try {
            const { roomId } = req.params;
            const { page = 1, limit = 50 } = req.query;
            const userId = req.user._id;

            // Kiểm tra user có quyền truy cập room không
            const member = await ChatRoomMember.findOne({
                room_id: roomId,
                user_id: userId,
            });

            if (!member) {
                return res.status(403).json({
                    success: false,
                    message: 'Bạn không có quyền truy cập phòng chat này',
                });
            }

            const skip = (parseInt(page) - 1) * parseInt(limit);

            const messages = await ChatMessage.find({ room_id: roomId })
                .sort({ created_at: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .populate('sender_id', 'name email avatar_url')
                .lean();

            const total = await ChatMessage.countDocuments({ room_id: roomId });

            return res.status(200).json({
                success: true,
                data: {
                    messages: messages.reverse(), // Reverse to show oldest first
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total,
                        totalPages: Math.ceil(total / parseInt(limit)),
                    },
                },
                message: 'Lấy danh sách tin nhắn thành công',
            });
        } catch (error) {
            console.error('Error getting messages:', error);
            return res.status(500).json({
                success: false,
                message: 'Có lỗi xảy ra khi lấy danh sách tin nhắn',
            });
        }
    }

    /**
     * [POST] /api/chat/rooms/:roomId/messages
     * Gửi tin nhắn vào phòng chat
     */
    async sendMessage(req, res) {
        try {
            const { roomId } = req.params;
            const { message } = req.body;
            const userId = req.user._id;

            if (!message || message.trim().length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Nội dung tin nhắn là bắt buộc',
                });
            }

            // Kiểm tra user có quyền gửi tin nhắn không
            const member = await ChatRoomMember.findOne({
                room_id: roomId,
                user_id: userId,
            });

            if (!member) {
                return res.status(403).json({
                    success: false,
                    message: 'Bạn không có quyền gửi tin nhắn vào phòng chat này',
                });
            }

            const newMessage = new ChatMessage({
                room_id: roomId,
                sender_id: userId,
                message: message.trim(),
            });

            await newMessage.save();
            await newMessage.populate('sender_id', 'name email avatar_url');

            return res.status(201).json({
                success: true,
                data: newMessage,
                message: 'Gửi tin nhắn thành công',
            });
        } catch (error) {
            console.error('Error sending message:', error);
            return res.status(500).json({
                success: false,
                message: 'Có lỗi xảy ra khi gửi tin nhắn',
            });
        }
    }

    /**
     * [GET] /api/chat/rooms/:roomId
     * Lấy thông tin chi tiết phòng chat
     */
    async getRoomById(req, res) {
        try {
            const { roomId } = req.params;
            const userId = req.user._id;

            // Kiểm tra user có quyền truy cập room không
            const member = await ChatRoomMember.findOne({
                room_id: roomId,
                user_id: userId,
            });

            if (!member) {
                return res.status(403).json({
                    success: false,
                    message: 'Bạn không có quyền truy cập phòng chat này',
                });
            }

            const room = await ChatRoom.findById(roomId).populate('project_id', 'project_name').lean();

            if (!room) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy phòng chat',
                });
            }

            // Lấy danh sách thành viên
            const members = await ChatRoomMember.find({ room_id: roomId })
                .populate('user_id', 'name email avatar_url')
                .lean();

            return res.status(200).json({
                success: true,
                data: {
                    ...room,
                    members: members.map((m) => m.user_id),
                },
                message: 'Lấy thông tin phòng chat thành công',
            });
        } catch (error) {
            console.error('Error getting room:', error);
            return res.status(500).json({
                success: false,
                message: 'Có lỗi xảy ra khi lấy thông tin phòng chat',
            });
        }
    }

    /**
     * [POST] /api/chat/rooms/direct
     * Tạo hoặc lấy phòng chat trực tiếp với một user
     */
    async getOrCreateDirectRoom(req, res) {
        try {
            const { projectId, targetUserId } = req.body;
            const userId = req.user._id;

            if (!projectId || !targetUserId) {
                return res.status(400).json({
                    success: false,
                    message: 'Project ID và Target User ID là bắt buộc',
                });
            }

            if (userId.toString() === targetUserId.toString()) {
                return res.status(400).json({
                    success: false,
                    message: 'Không thể tạo phòng chat với chính mình',
                });
            }

            // Kiểm tra project tồn tại
            const project = await Project.findById(projectId);
            if (!project) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy dự án',
                });
            }

            // Tìm room direct đã tồn tại
            const existingRooms = await ChatRoomMember.find({
                user_id: userId,
            })
                .populate({
                    path: 'room_id',
                    match: { project_id: projectId, type: 'direct' },
                })
                .lean();

            for (const roomMember of existingRooms) {
                if (roomMember.room_id) {
                    const members = await ChatRoomMember.find({
                        room_id: roomMember.room_id._id,
                    }).lean();

                    const memberIds = members.map((m) => m.user_id.toString());
                    if (memberIds.includes(targetUserId.toString()) && members.length === 2) {
                        // Room đã tồn tại
                        return res.status(200).json({
                            success: true,
                            data: roomMember.room_id,
                            message: 'Phòng chat đã tồn tại',
                        });
                    }
                }
            }

            // Tạo room mới
            const targetUser = await User.findById(targetUserId);
            if (!targetUser) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy người dùng',
                });
            }

            const currentUser = await User.findById(userId);
            const roomName = `${currentUser.name} & ${targetUser.name}`;

            const newRoom = new ChatRoom({
                project_id: projectId,
                name: roomName,
                type: 'direct',
            });

            await newRoom.save();

            // Thêm members vào room
            await ChatRoomMember.insertMany([
                { room_id: newRoom._id, user_id: userId },
                { room_id: newRoom._id, user_id: targetUserId },
            ]);

            await newRoom.populate('project_id', 'project_name');

            return res.status(201).json({
                success: true,
                data: newRoom,
                message: 'Tạo phòng chat thành công',
            });
        } catch (error) {
            console.error('Error creating direct room:', error);
            return res.status(500).json({
                success: false,
                message: 'Có lỗi xảy ra khi tạo phòng chat',
            });
        }
    }

    /**
     * Helper: Tạo group chat room cho project
     */
    async createGroupChatRoom(projectId, projectName) {
        try {
            const newRoom = new ChatRoom({
                project_id: projectId,
                name: `${projectName} - Group Chat`,
                type: 'group',
            });

            await newRoom.save();
            return newRoom;
        } catch (error) {
            console.error('Error creating group chat room:', error);
            throw error;
        }
    }

    /**
     * Helper: Thêm member vào group chat room
     */
    async addMemberToGroupRoom(projectId, userId) {
        try {
            // Tìm group chat room của project
            const groupRoom = await ChatRoom.findOne({
                project_id: projectId,
                type: 'group',
            });

            if (!groupRoom) {
                console.error('Group chat room not found for project:', projectId);
                return null;
            }

            // Kiểm tra xem user đã là member chưa
            const existingMember = await ChatRoomMember.findOne({
                room_id: groupRoom._id,
                user_id: userId,
            });

            if (existingMember) {
                return groupRoom;
            }

            // Thêm member vào room
            await ChatRoomMember.create({
                room_id: groupRoom._id,
                user_id: userId,
            });

            return groupRoom;
        } catch (error) {
            console.error('Error adding member to group room:', error);
            throw error;
        }
    }

    /**
     * Helper: Tạo direct chat room giữa 2 users
     */
    async createDirectChatRoom(projectId, userId1, userId2) {
        try {
            // Kiểm tra room đã tồn tại chưa
            const existingRooms = await ChatRoomMember.find({
                user_id: userId1,
            })
                .populate({
                    path: 'room_id',
                    match: { project_id: projectId, type: 'direct' },
                })
                .lean();

            for (const roomMember of existingRooms) {
                if (roomMember.room_id) {
                    const members = await ChatRoomMember.find({
                        room_id: roomMember.room_id._id,
                    }).lean();

                    const memberIds = members.map((m) => m.user_id.toString());
                    if (memberIds.includes(userId2.toString()) && members.length === 2) {
                        return roomMember.room_id;
                    }
                }
            }

            // Tạo room mới
            const user1 = await User.findById(userId1);
            const user2 = await User.findById(userId2);

            if (!user1 || !user2) {
                return null;
            }

            const roomName = `${user1.name} & ${user2.name}`;

            const newRoom = new ChatRoom({
                project_id: projectId,
                name: roomName,
                type: 'direct',
            });

            await newRoom.save();

            // Thêm members vào room
            await ChatRoomMember.insertMany([
                { room_id: newRoom._id, user_id: userId1 },
                { room_id: newRoom._id, user_id: userId2 },
            ]);

            return newRoom;
        } catch (error) {
            console.error('Error creating direct chat room:', error);
            throw error;
        }
    }

    /**
     * [GET] /api/chat/rooms/:roomId/members
     * Lấy danh sách thành viên của phòng chat
     */
    async getRoomMembers(req, res) {
        try {
            const { roomId } = req.params;
            const userId = req.user._id;

            // Kiểm tra user có quyền truy cập room không
            const member = await ChatRoomMember.findOne({
                room_id: roomId,
                user_id: userId,
            });

            if (!member) {
                return res.status(403).json({
                    success: false,
                    message: 'Bạn không có quyền truy cập phòng chat này',
                });
            }

            const members = await ChatRoomMember.find({ room_id: roomId })
                .populate('user_id', 'name email avatar_url')
                .lean();

            return res.status(200).json({
                success: true,
                data: members.map((m) => m.user_id),
                message: 'Lấy danh sách thành viên thành công',
            });
        } catch (error) {
            console.error('Error getting room members:', error);
            return res.status(500).json({
                success: false,
                message: 'Có lỗi xảy ra khi lấy danh sách thành viên',
            });
        }
    }

    /**
     * [DELETE] /api/chat/messages/:messageId
     * Xóa tin nhắn
     */
    async deleteMessage(req, res) {
        try {
            const { messageId } = req.params;
            const userId = req.user._id;

            const message = await ChatMessage.findById(messageId);

            if (!message) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy tin nhắn',
                });
            }

            // Chỉ cho phép người gửi xóa tin nhắn của mình
            if (message.sender_id.toString() !== userId.toString()) {
                return res.status(403).json({
                    success: false,
                    message: 'Bạn không có quyền xóa tin nhắn này',
                });
            }

            await ChatMessage.findByIdAndDelete(messageId);

            return res.status(200).json({
                success: true,
                message: 'Xóa tin nhắn thành công',
            });
        } catch (error) {
            console.error('Error deleting message:', error);
            return res.status(500).json({
                success: false,
                message: 'Có lỗi xảy ra khi xóa tin nhắn',
            });
        }
    }

    /**
     * [GET] /api/chat/rooms/user
     * Lấy tất cả phòng chat mà user tham gia
     */
    async getUserRooms(req, res) {
        try {
            const userId = req.user._id;

            const roomMembers = await ChatRoomMember.find({ user_id: userId })
                .populate({
                    path: 'room_id',
                    populate: {
                        path: 'project_id',
                        select: 'project_name',
                    },
                })
                .lean();

            const rooms = roomMembers.filter((rm) => rm.room_id !== null).map((rm) => rm.room_id);

            // Get last message for each room
            const roomsWithLastMessage = await Promise.all(
                rooms.map(async (room) => {
                    const lastMessage = await ChatMessage.findOne({ room_id: room._id })
                        .sort({ created_at: -1 })
                        .populate('sender_id', 'name avatar_url')
                        .lean();

                    // Get unread count (optional - có thể implement sau)
                    const unreadCount = 0;

                    // Get other members for direct chat
                    let otherMember = null;
                    if (room.type === 'direct') {
                        const members = await ChatRoomMember.find({ room_id: room._id })
                            .populate('user_id', 'name avatar_url')
                            .lean();
                        otherMember = members.find((m) => m.user_id._id.toString() !== userId.toString())?.user_id;
                    }

                    return {
                        ...room,
                        last_message: lastMessage,
                        unread_count: unreadCount,
                        other_member: otherMember,
                    };
                }),
            );

            // Sort by last message time
            roomsWithLastMessage.sort((a, b) => {
                if (!a.last_message) return 1;
                if (!b.last_message) return -1;
                return new Date(b.last_message.created_at) - new Date(a.last_message.created_at);
            });

            return res.status(200).json({
                success: true,
                data: roomsWithLastMessage,
                message: 'Lấy danh sách phòng chat thành công',
            });
        } catch (error) {
            console.error('Error getting user rooms:', error);
            return res.status(500).json({
                success: false,
                message: 'Có lỗi xảy ra khi lấy danh sách phòng chat',
            });
        }
    }
}

const controller = new ChatController();

module.exports = {
    getRoomsByProject: controller.getRoomsByProject.bind(controller),
    getMessagesByRoom: controller.getMessagesByRoom.bind(controller),
    sendMessage: controller.sendMessage.bind(controller),
    getRoomById: controller.getRoomById.bind(controller),
    getOrCreateDirectRoom: controller.getOrCreateDirectRoom.bind(controller),
    getRoomMembers: controller.getRoomMembers.bind(controller),
    deleteMessage: controller.deleteMessage.bind(controller),
    getUserRooms: controller.getUserRooms.bind(controller),
    createGroupChatRoom: controller.createGroupChatRoom.bind(controller),
    addMemberToGroupRoom: controller.addMemberToGroupRoom.bind(controller),
    createDirectChatRoom: controller.createDirectChatRoom.bind(controller),
};
