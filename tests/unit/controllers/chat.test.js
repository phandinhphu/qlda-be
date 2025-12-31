/**
 * Unit Test cho ChatController
 * Test các chức năng chat realtime
 */

const request = require('supertest');
const express = require('express');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');

// Import models
const ChatRoom = require('../../../src/apis/models/ChatRoom');
const ChatMessage = require('../../../src/apis/models/ChatMessage');
const ChatRoomMember = require('../../../src/apis/models/ChatRoomMember');
const Project = require('../../../src/apis/models/Project');
const User = require('../../../src/apis/models/User');

// Import routes
const chatRoutes = require('../../../src/routes/chatRoutes');

// Import helpers
const {
    createTestUser,
    createTestUserWithToken,
    generateTestToken,
} = require('../../helpers/testHelpers');

const {
    createTestProject,
    createTestChatRoom,
    createTestChatMessage,
} = require('../../helpers/mockData');

// Setup Express app cho testing
const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/chat', chatRoutes);

describe('ChatController Tests', () => {
    let testUser1, testUser2, testProject, testRoom, token1, token2;

    // Setup trước mỗi test
    beforeEach(async () => {
        // Tạo users
        const userData1 = await createTestUserWithToken({
            name: 'User 1',
            email: 'user1@example.com',
        });
        testUser1 = userData1.user;
        token1 = userData1.token;

        const userData2 = await createTestUserWithToken({
            name: 'User 2',
            email: 'user2@example.com',
        });
        testUser2 = userData2.user;
        token2 = userData2.token;

        // Tạo project
        testProject = await createTestProject({
            project_name: 'Test Project',
            created_by: testUser1._id,
        });

        // Tạo chat room
        testRoom = await createTestChatRoom({
            project_id: testProject._id,
            name: 'Test Room',
            type: 'group',
        });

        // Thêm members vào room
        await ChatRoomMember.create({
            room_id: testRoom._id,
            user_id: testUser1._id,
        });

        await ChatRoomMember.create({
            room_id: testRoom._id,
            user_id: testUser2._id,
        });
    });

    describe('GET /api/chat/rooms/project/:projectId', () => {
        it('Nên lấy được danh sách phòng chat của project', async () => {
            // Act
            const response = await request(app)
                .get(`/api/chat/rooms/project/${testProject._id}`)
                .set('Cookie', [`token=${token1}`])
                .expect(200);

            // Assert
            expect(response.body.success).toBe(true);
            expect(response.body.data).toBeInstanceOf(Array);
            expect(response.body.data.length).toBeGreaterThan(0);
            expect(response.body.data[0]).toHaveProperty('_id');
            expect(response.body.data[0]).toHaveProperty('name');
        });

        it('Nên trả về mảng rỗng khi user không thuộc phòng nào', async () => {
            // Arrange: Tạo user mới không thuộc phòng nào
            const { token: newToken } = await createTestUserWithToken({
                email: 'newuser@example.com',
            });

            // Act
            const response = await request(app)
                .get(`/api/chat/rooms/project/${testProject._id}`)
                .set('Cookie', [`token=${newToken}`])
                .expect(200);

            // Assert
            expect(response.body.success).toBe(true);
            expect(response.body.data).toEqual([]);
        });

        it('Nên trả về lỗi 404 khi project không tồn tại', async () => {
            // Arrange
            const fakeProjectId = new mongoose.Types.ObjectId();

            // Act
            const response = await request(app)
                .get(`/api/chat/rooms/project/${fakeProjectId}`)
                .set('Cookie', [`token=${token1}`])
                .expect(404);

            // Assert
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Không tìm thấy dự án');
        });

        it('Nên trả về thông tin last_message cho mỗi room', async () => {
            // Arrange: Tạo message
            await createTestChatMessage({
                room_id: testRoom._id,
                sender_id: testUser1._id,
                message: 'Test message',
            });

            // Act
            const response = await request(app)
                .get(`/api/chat/rooms/project/${testProject._id}`)
                .set('Cookie', [`token=${token1}`])
                .expect(200);

            // Assert
            expect(response.body.data[0]).toHaveProperty('last_message');
            expect(response.body.data[0].last_message).toHaveProperty('message');
            expect(response.body.data[0].last_message.message).toBe('Test message');
        });

        it('Nên trả về other_member cho direct chat', async () => {
            // Arrange: Tạo direct chat room
            const directRoom = await createTestChatRoom({
                project_id: testProject._id,
                name: 'Direct Chat',
                type: 'direct',
            });

            await ChatRoomMember.create({
                room_id: directRoom._id,
                user_id: testUser1._id,
            });

            await ChatRoomMember.create({
                room_id: directRoom._id,
                user_id: testUser2._id,
            });

            // Act
            const response = await request(app)
                .get(`/api/chat/rooms/project/${testProject._id}`)
                .set('Cookie', [`token=${token1}`])
                .expect(200);

            // Assert
            const directRoomData = response.body.data.find((r) => r.type === 'direct');
            expect(directRoomData).toHaveProperty('other_member');
            expect(directRoomData.other_member._id.toString()).toBe(testUser2._id.toString());
        });
    });

    describe('GET /api/chat/rooms/:roomId/messages', () => {
        it('Nên lấy được danh sách tin nhắn trong phòng chat', async () => {
            // Arrange: Tạo messages
            await createTestChatMessage({
                room_id: testRoom._id,
                sender_id: testUser1._id,
                message: 'Message 1',
            });
            await createTestChatMessage({
                room_id: testRoom._id,
                sender_id: testUser2._id,
                message: 'Message 2',
            });

            // Act
            const response = await request(app)
                .get(`/api/chat/rooms/${testRoom._id}/messages`)
                .set('Cookie', [`token=${token1}`])
                .expect(200);

            // Assert
            expect(response.body.success).toBe(true);
            expect(response.body.data.messages).toBeInstanceOf(Array);
            expect(response.body.data.messages.length).toBe(2);
            expect(response.body.data).toHaveProperty('pagination');
            expect(response.body.data.pagination.total).toBe(2);
        });

        it('Nên trả về tin nhắn theo pagination', async () => {
            // Arrange: Tạo nhiều messages
            for (let i = 0; i < 60; i++) {
                await createTestChatMessage({
                    room_id: testRoom._id,
                    sender_id: testUser1._id,
                    message: `Message ${i}`,
                });
            }

            // Act: Lấy trang 1 với limit 50
            const response = await request(app)
                .get(`/api/chat/rooms/${testRoom._id}/messages?page=1&limit=50`)
                .set('Cookie', [`token=${token1}`])
                .expect(200);

            // Assert
            expect(response.body.data.messages.length).toBe(50);
            expect(response.body.data.pagination.totalPages).toBe(2);
            expect(response.body.data.pagination.page).toBe(1);

            // Act: Lấy trang 2
            const response2 = await request(app)
                .get(`/api/chat/rooms/${testRoom._id}/messages?page=2&limit=50`)
                .set('Cookie', [`token=${token1}`])
                .expect(200);

            // Assert
            expect(response2.body.data.messages.length).toBe(10);
        });

        it('Nên trả về lỗi 403 khi user không có quyền truy cập room', async () => {
            // Arrange: Tạo user mới không thuộc room
            const { token: newToken } = await createTestUserWithToken({
                email: 'outsider@example.com',
            });

            // Act
            const response = await request(app)
                .get(`/api/chat/rooms/${testRoom._id}/messages`)
                .set('Cookie', [`token=${newToken}`])
                .expect(403);

            // Assert
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Bạn không có quyền truy cập phòng chat này');
        });

        it('Nên populate sender_id cho mỗi message', async () => {
            // Arrange
            await createTestChatMessage({
                room_id: testRoom._id,
                sender_id: testUser1._id,
                message: 'Test message',
            });

            // Act
            const response = await request(app)
                .get(`/api/chat/rooms/${testRoom._id}/messages`)
                .set('Cookie', [`token=${token1}`])
                .expect(200);

            // Assert
            const message = response.body.data.messages[0];
            expect(message.sender_id).toHaveProperty('name');
            expect(message.sender_id).toHaveProperty('email');
            expect(message.sender_id).not.toHaveProperty('password');
        });
    });

    describe('POST /api/chat/rooms/:roomId/messages', () => {
        it('Nên gửi tin nhắn thành công', async () => {
            // Arrange
            const messageData = {
                message: 'Hello, this is a test message',
            };

            // Act
            const response = await request(app)
                .post(`/api/chat/rooms/${testRoom._id}/messages`)
                .set('Cookie', [`token=${token1}`])
                .send(messageData)
                .expect(201);

            // Assert
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('message');
            expect(response.body.data.message).toBe('Hello, this is a test message');
            expect(response.body.data.sender_id._id.toString()).toBe(testUser1._id.toString());

            // Verify trong database
            const savedMessage = await ChatMessage.findById(response.body.data._id);
            expect(savedMessage).toBeTruthy();
            expect(savedMessage.message).toBe('Hello, this is a test message');
        });

        it('Nên trim nội dung tin nhắn', async () => {
            // Arrange
            const messageData = {
                message: '   Message with spaces   ',
            };

            // Act
            const response = await request(app)
                .post(`/api/chat/rooms/${testRoom._id}/messages`)
                .set('Cookie', [`token=${token1}`])
                .send(messageData)
                .expect(201);

            // Assert
            expect(response.body.data.message).toBe('Message with spaces');
        });

        it('Nên trả về lỗi 400 khi tin nhắn trống', async () => {
            // Arrange
            const messageData = {
                message: '',
            };

            // Act
            const response = await request(app)
                .post(`/api/chat/rooms/${testRoom._id}/messages`)
                .set('Cookie', [`token=${token1}`])
                .send(messageData)
                .expect(400);

            // Assert
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Nội dung tin nhắn là bắt buộc');
        });

        it('Nên trả về lỗi 400 khi tin nhắn chỉ có khoảng trắng', async () => {
            // Arrange
            const messageData = {
                message: '   ',
            };

            // Act
            const response = await request(app)
                .post(`/api/chat/rooms/${testRoom._id}/messages`)
                .set('Cookie', [`token=${token1}`])
                .send(messageData)
                .expect(400);

            // Assert
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Nội dung tin nhắn là bắt buộc');
        });

        it('Nên trả về lỗi 403 khi user không có quyền gửi tin nhắn', async () => {
            // Arrange
            const { token: outsiderToken } = await createTestUserWithToken({
                email: 'outsider@example.com',
            });

            const messageData = {
                message: 'Unauthorized message',
            };

            // Act
            const response = await request(app)
                .post(`/api/chat/rooms/${testRoom._id}/messages`)
                .set('Cookie', [`token=${outsiderToken}`])
                .send(messageData)
                .expect(403);

            // Assert
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Bạn không có quyền gửi tin nhắn vào phòng chat này');
        });
    });

    describe('GET /api/chat/rooms/:roomId', () => {
        it('Nên lấy được thông tin chi tiết phòng chat', async () => {
            // Act
            const response = await request(app)
                .get(`/api/chat/rooms/${testRoom._id}`)
                .set('Cookie', [`token=${token1}`])
                .expect(200);

            // Assert
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('_id');
            expect(response.body.data).toHaveProperty('name');
            expect(response.body.data).toHaveProperty('members');
            expect(response.body.data.members).toBeInstanceOf(Array);
            expect(response.body.data.members.length).toBe(2);
        });

        it('Nên populate project_id', async () => {
            // Act
            const response = await request(app)
                .get(`/api/chat/rooms/${testRoom._id}`)
                .set('Cookie', [`token=${token1}`])
                .expect(200);

            // Assert
            expect(response.body.data.project_id).toHaveProperty('project_name');
            expect(response.body.data.project_id.project_name).toBe('Test Project');
        });

        it('Nên trả về lỗi 403 khi user không có quyền truy cập', async () => {
            // Arrange
            const { token: outsiderToken } = await createTestUserWithToken({
                email: 'outsider@example.com',
            });

            // Act
            const response = await request(app)
                .get(`/api/chat/rooms/${testRoom._id}`)
                .set('Cookie', [`token=${outsiderToken}`])
                .expect(403);

            // Assert
            expect(response.body.success).toBe(false);
        });

        it('Nên trả về lỗi 404 khi room không tồn tại', async () => {
            // Arrange
            const fakeRoomId = new mongoose.Types.ObjectId();
            
            // Tạo fake member để pass quyền truy cập
            await ChatRoomMember.create({
                room_id: fakeRoomId,
                user_id: testUser1._id,
            });

            // Act
            const response = await request(app)
                .get(`/api/chat/rooms/${fakeRoomId}`)
                .set('Cookie', [`token=${token1}`])
                .expect(404);

            // Assert
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Không tìm thấy phòng chat');
        });
    });

    describe('POST /api/chat/rooms/direct', () => {
        it('Nên tạo phòng chat trực tiếp thành công', async () => {
            // Arrange: Tạo user thứ 3
            const { user: testUser3 } = await createTestUserWithToken({
                name: 'User 3',
                email: 'user3@example.com',
            });

            const requestData = {
                projectId: testProject._id,
                targetUserId: testUser3._id,
            };

            // Act
            const response = await request(app)
                .post('/api/chat/rooms/direct')
                .set('Cookie', [`token=${token1}`])
                .send(requestData)
                .expect(201);

            // Assert
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('_id');
            expect(response.body.data.type).toBe('direct');
            expect(response.body.data.name).toContain('User 1');
            expect(response.body.data.name).toContain('User 3');

            // Verify members trong database
            const members = await ChatRoomMember.find({
                room_id: response.body.data._id,
            });
            expect(members.length).toBe(2);
        });

        it('Nên trả về phòng chat đã tồn tại nếu đã có', async () => {
            // Arrange: Tạo direct room trước
            const directRoom = await createTestChatRoom({
                project_id: testProject._id,
                name: 'Existing Direct Chat',
                type: 'direct',
            });

            await ChatRoomMember.create({
                room_id: directRoom._id,
                user_id: testUser1._id,
            });

            await ChatRoomMember.create({
                room_id: directRoom._id,
                user_id: testUser2._id,
            });

            const requestData = {
                projectId: testProject._id,
                targetUserId: testUser2._id,
            };

            // Act
            const response = await request(app)
                .post('/api/chat/rooms/direct')
                .set('Cookie', [`token=${token1}`])
                .send(requestData)
                .expect(200);

            // Assert
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Phòng chat đã tồn tại');
            expect(response.body.data._id.toString()).toBe(directRoom._id.toString());
        });

        it('Nên trả về lỗi 400 khi thiếu projectId', async () => {
            // Arrange
            const requestData = {
                targetUserId: testUser2._id,
            };

            // Act
            const response = await request(app)
                .post('/api/chat/rooms/direct')
                .set('Cookie', [`token=${token1}`])
                .send(requestData)
                .expect(400);

            // Assert
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Project ID và Target User ID là bắt buộc');
        });

        it('Nên trả về lỗi 400 khi thiếu targetUserId', async () => {
            // Arrange
            const requestData = {
                projectId: testProject._id,
            };

            // Act
            const response = await request(app)
                .post('/api/chat/rooms/direct')
                .set('Cookie', [`token=${token1}`])
                .send(requestData)
                .expect(400);

            // Assert
            expect(response.body.success).toBe(false);
        });

        it('Nên trả về lỗi 400 khi tạo phòng chat với chính mình', async () => {
            // Arrange
            const requestData = {
                projectId: testProject._id,
                targetUserId: testUser1._id,
            };

            // Act
            const response = await request(app)
                .post('/api/chat/rooms/direct')
                .set('Cookie', [`token=${token1}`])
                .send(requestData)
                .expect(400);

            // Assert
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Không thể tạo phòng chat với chính mình');
        });

        it('Nên trả về lỗi 404 khi project không tồn tại', async () => {
            // Arrange
            const fakeProjectId = new mongoose.Types.ObjectId();
            const requestData = {
                projectId: fakeProjectId,
                targetUserId: testUser2._id,
            };

            // Act
            const response = await request(app)
                .post('/api/chat/rooms/direct')
                .set('Cookie', [`token=${token1}`])
                .send(requestData)
                .expect(404);

            // Assert
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Không tìm thấy dự án');
        });

        it('Nên trả về lỗi 404 khi target user không tồn tại', async () => {
            // Arrange
            const fakeUserId = new mongoose.Types.ObjectId();
            const requestData = {
                projectId: testProject._id,
                targetUserId: fakeUserId,
            };

            // Act
            const response = await request(app)
                .post('/api/chat/rooms/direct')
                .set('Cookie', [`token=${token1}`])
                .send(requestData)
                .expect(404);

            // Assert
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Không tìm thấy người dùng');
        });
    });

    describe('GET /api/chat/rooms/:roomId/members', () => {
        it('Nên lấy được danh sách thành viên của phòng chat', async () => {
            // Act
            const response = await request(app)
                .get(`/api/chat/rooms/${testRoom._id}/members`)
                .set('Cookie', [`token=${token1}`])
                .expect(200);

            // Assert
            expect(response.body.success).toBe(true);
            expect(response.body.data).toBeInstanceOf(Array);
            expect(response.body.data.length).toBe(2);
            expect(response.body.data[0]).toHaveProperty('name');
            expect(response.body.data[0]).toHaveProperty('email');
            expect(response.body.data[0]).not.toHaveProperty('password');
        });

        it('Nên trả về lỗi 403 khi user không có quyền truy cập', async () => {
            // Arrange
            const { token: outsiderToken } = await createTestUserWithToken({
                email: 'outsider@example.com',
            });

            // Act
            const response = await request(app)
                .get(`/api/chat/rooms/${testRoom._id}/members`)
                .set('Cookie', [`token=${outsiderToken}`])
                .expect(403);

            // Assert
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Bạn không có quyền truy cập phòng chat này');
        });
    });

    describe('DELETE /api/chat/messages/:messageId', () => {
        let testMessage;

        beforeEach(async () => {
            testMessage = await createTestChatMessage({
                room_id: testRoom._id,
                sender_id: testUser1._id,
                message: 'Message to be deleted',
            });
        });

        it('Nên xóa tin nhắn thành công khi user là người gửi', async () => {
            // Act
            const response = await request(app)
                .delete(`/api/chat/messages/${testMessage._id}`)
                .set('Cookie', [`token=${token1}`])
                .expect(200);

            // Assert
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Xóa tin nhắn thành công');

            // Verify message đã bị xóa
            const deletedMessage = await ChatMessage.findById(testMessage._id);
            expect(deletedMessage).toBeNull();
        });

        it('Nên trả về lỗi 403 khi user không phải người gửi', async () => {
            // Act
            const response = await request(app)
                .delete(`/api/chat/messages/${testMessage._id}`)
                .set('Cookie', [`token=${token2}`])
                .expect(403);

            // Assert
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Bạn không có quyền xóa tin nhắn này');

            // Verify message vẫn còn
            const message = await ChatMessage.findById(testMessage._id);
            expect(message).toBeTruthy();
        });

        it('Nên trả về lỗi 404 khi message không tồn tại', async () => {
            // Arrange
            const fakeMessageId = new mongoose.Types.ObjectId();

            // Act
            const response = await request(app)
                .delete(`/api/chat/messages/${fakeMessageId}`)
                .set('Cookie', [`token=${token1}`])
                .expect(404);

            // Assert
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Không tìm thấy tin nhắn');
        });
    });

    describe('GET /api/chat/rooms/user', () => {
        beforeEach(async () => {
            // Tạo thêm một project và room khác
            const project2 = await createTestProject({
                project_name: 'Second Project',
                created_by: testUser1._id,
            });

            const room2 = await createTestChatRoom({
                project_id: project2._id,
                name: 'Second Room',
                type: 'group',
            });

            await ChatRoomMember.create({
                room_id: room2._id,
                user_id: testUser1._id,
            });

            // Tạo message trong room2
            await createTestChatMessage({
                room_id: room2._id,
                sender_id: testUser1._id,
                message: 'Message in room 2',
            });

            // Tạo message trong room1
            await createTestChatMessage({
                room_id: testRoom._id,
                sender_id: testUser1._id,
                message: 'Message in room 1',
            });
        });

        it('Nên lấy được tất cả phòng chat của user', async () => {
            // Act
            const response = await request(app)
                .get('/api/chat/rooms/user')
                .set('Cookie', [`token=${token1}`])
                .expect(200);

            // Assert
            expect(response.body.success).toBe(true);
            expect(response.body.data).toBeInstanceOf(Array);
            expect(response.body.data.length).toBe(2);
        });

        it('Nên sắp xếp rooms theo thời gian tin nhắn cuối cùng', async () => {
            // Act
            const response = await request(app)
                .get('/api/chat/rooms/user')
                .set('Cookie', [`token=${token1}`])
                .expect(200);

            // Assert
            const rooms = response.body.data;
            expect(rooms[0].last_message).toBeTruthy();
            
            // Room có tin nhắn mới nhất nên ở đầu
            if (rooms.length > 1 && rooms[0].last_message && rooms[1].last_message) {
                const time1 = new Date(rooms[0].last_message.created_at);
                const time2 = new Date(rooms[1].last_message.created_at);
                expect(time1 >= time2).toBe(true);
            }
        });

        it('Nên trả về last_message cho mỗi room', async () => {
            // Act
            const response = await request(app)
                .get('/api/chat/rooms/user')
                .set('Cookie', [`token=${token1}`])
                .expect(200);

            // Assert
            const rooms = response.body.data;
            rooms.forEach(room => {
                expect(room).toHaveProperty('last_message');
            });
        });

        it('Nên populate project_id cho mỗi room', async () => {
            // Act
            const response = await request(app)
                .get('/api/chat/rooms/user')
                .set('Cookie', [`token=${token1}`])
                .expect(200);

            // Assert
            const rooms = response.body.data;
            rooms.forEach(room => {
                expect(room.project_id).toHaveProperty('project_name');
            });
        });

        it('Nên trả về other_member cho direct chat', async () => {
            // Arrange: Tạo direct chat
            const directRoom = await createTestChatRoom({
                project_id: testProject._id,
                name: 'User Direct',
                type: 'direct',
            });

            await ChatRoomMember.create({
                room_id: directRoom._id,
                user_id: testUser1._id,
            });

            await ChatRoomMember.create({
                room_id: directRoom._id,
                user_id: testUser2._id,
            });

            // Act
            const response = await request(app)
                .get('/api/chat/rooms/user')
                .set('Cookie', [`token=${token1}`])
                .expect(200);

            // Assert
            const directRoomData = response.body.data.find(r => r.type === 'direct');
            expect(directRoomData).toHaveProperty('other_member');
            expect(directRoomData.other_member._id.toString()).toBe(testUser2._id.toString());
        });

        it('Nên trả về mảng rỗng khi user không tham gia phòng nào', async () => {
            // Arrange: Tạo user mới
            const { token: newToken } = await createTestUserWithToken({
                email: 'newuser@example.com',
            });

            // Act
            const response = await request(app)
                .get('/api/chat/rooms/user')
                .set('Cookie', [`token=${newToken}`])
                .expect(200);

            // Assert
            expect(response.body.success).toBe(true);
            expect(response.body.data).toEqual([]);
        });
    });

    describe('ChatController Helper Methods', () => {
        describe('createGroupChatRoom', () => {
            it('Nên tạo group chat room cho project', async () => {
                // Arrange
                const ChatController = require('../../../src/apis/controllers/ChatController');

                // Act
                const room = await ChatController.createGroupChatRoom(
                    testProject._id,
                    'New Test Project'
                );

                // Assert
                expect(room).toBeTruthy();
                expect(room.name).toBe('New Test Project - Group Chat');
                expect(room.type).toBe('group');
                expect(room.project_id.toString()).toBe(testProject._id.toString());

                // Verify trong database
                const savedRoom = await ChatRoom.findById(room._id);
                expect(savedRoom).toBeTruthy();
            });
        });

        describe('addMemberToGroupRoom', () => {
            it('Nên thêm member vào group room thành công', async () => {
                // Arrange
                const { user: newUser } = await createTestUserWithToken({
                    email: 'newmember@example.com',
                });

                const ChatController = require('../../../src/apis/controllers/ChatController');

                // Act
                const result = await ChatController.addMemberToGroupRoom(
                    testProject._id,
                    newUser._id
                );

                // Assert
                expect(result).toBeTruthy();

                // Verify member đã được thêm
                const member = await ChatRoomMember.findOne({
                    room_id: testRoom._id,
                    user_id: newUser._id,
                });
                expect(member).toBeTruthy();
            });

            it('Không nên thêm member đã tồn tại', async () => {
                // Arrange
                const ChatController = require('../../../src/apis/controllers/ChatController');

                // Act
                const result = await ChatController.addMemberToGroupRoom(
                    testProject._id,
                    testUser1._id
                );

                // Assert
                expect(result).toBeTruthy();

                // Verify không tạo duplicate
                const members = await ChatRoomMember.find({
                    room_id: testRoom._id,
                    user_id: testUser1._id,
                });
                expect(members.length).toBe(1);
            });
        });

        describe('createDirectChatRoom', () => {
            it('Nên tạo direct chat room giữa 2 users', async () => {
                // Arrange
                const { user: user3 } = await createTestUserWithToken({
                    name: 'User 3',
                    email: 'user3@example.com',
                });

                const { user: user4 } = await createTestUserWithToken({
                    name: 'User 4',
                    email: 'user4@example.com',
                });

                const ChatController = require('../../../src/apis/controllers/ChatController');

                // Act
                const room = await ChatController.createDirectChatRoom(
                    testProject._id,
                    user3._id,
                    user4._id
                );

                // Assert
                expect(room).toBeTruthy();
                expect(room.type).toBe('direct');
                expect(room.name).toContain('User 3');
                expect(room.name).toContain('User 4');

                // Verify members
                const members = await ChatRoomMember.find({ room_id: room._id });
                expect(members.length).toBe(2);
            });

            it('Nên trả về room đã tồn tại thay vì tạo mới', async () => {
                // Arrange
                const directRoom = await createTestChatRoom({
                    project_id: testProject._id,
                    name: 'Existing Direct',
                    type: 'direct',
                });

                await ChatRoomMember.create({
                    room_id: directRoom._id,
                    user_id: testUser1._id,
                });

                await ChatRoomMember.create({
                    room_id: directRoom._id,
                    user_id: testUser2._id,
                });

                const ChatController = require('../../../src/apis/controllers/ChatController');

                // Act
                const room = await ChatController.createDirectChatRoom(
                    testProject._id,
                    testUser1._id,
                    testUser2._id
                );

                // Assert
                expect(room._id.toString()).toBe(directRoom._id.toString());

                // Verify không tạo duplicate
                const allRooms = await ChatRoom.find({
                    project_id: testProject._id,
                    type: 'direct',
                });
                expect(allRooms.length).toBe(1);
            });
        });
    });
});
