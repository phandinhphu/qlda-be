const express = require('express');
const router = express.Router();
const ChatController = require('../apis/controllers/ChatController');
const verifyToken = require('../middleware/auth');

router.use(verifyToken);

/**
 * @route   GET /api/chat/rooms/user
 * @desc    Lấy tất cả phòng chat mà user tham gia
 * @access  Private
 */
router.get('/rooms/user', ChatController.getUserRooms);

/**
 * @route   GET /api/chat/rooms/project/:projectId
 * @desc    Lấy danh sách phòng chat của một project
 * @access  Private
 */
router.get('/rooms/project/:projectId', ChatController.getRoomsByProject);

/**
 * @route   GET /api/chat/rooms/:roomId
 * @desc    Lấy thông tin chi tiết phòng chat
 * @access  Private
 */
router.get('/rooms/:roomId', ChatController.getRoomById);

/**
 * @route   GET /api/chat/rooms/:roomId/members
 * @desc    Lấy danh sách thành viên của phòng chat
 * @access  Private
 */
router.get('/rooms/:roomId/members', ChatController.getRoomMembers);

/**
 * @route   GET /api/chat/rooms/:roomId/messages
 * @desc    Lấy danh sách tin nhắn trong phòng chat
 * @access  Private
 */
router.get('/rooms/:roomId/messages', ChatController.getMessagesByRoom);

/**
 * @route   POST /api/chat/rooms/:roomId/messages
 * @desc    Gửi tin nhắn vào phòng chat
 * @access  Private
 */
router.post('/rooms/:roomId/messages', ChatController.sendMessage);

/**
 * @route   POST /api/chat/rooms/direct
 * @desc    Tạo hoặc lấy phòng chat trực tiếp với một user
 * @access  Private
 */
router.post('/rooms/direct', ChatController.getOrCreateDirectRoom);

/**
 * @route   DELETE /api/chat/messages/:messageId
 * @desc    Xóa tin nhắn
 * @access  Private
 */
router.delete('/messages/:messageId', ChatController.deleteMessage);

module.exports = router;
