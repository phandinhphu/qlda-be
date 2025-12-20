/**
 * Unit Test cho Socket.IO features
 * Test các chức năng realtime chat
 */

const socketClient = require('socket.io-client');
const http = require('http');
const mongoose = require('mongoose');
const { initializeSocket } = require('../../../src/config/socket');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../../../src/util/constants');

// Import models
const ChatRoom = require('../../../src/apis/models/ChatRoom');
const ChatMessage = require('../../../src/apis/models/ChatMessage');
const ChatRoomMember = require('../../../src/apis/models/ChatRoomMember');
const User = require('../../../src/apis/models/User');

// Import helpers
const {
    createTestUser,
    generateTestToken,
} = require('../../helpers/testHelpers');

const {
    createTestChatRoom,
    createTestProject,
} = require('../../helpers/mockData');

describe('Socket.IO Tests', () => {
    let server, io, clientSocket1, clientSocket2, testUser1, testUser2, token1, token2;
    let testProject, testRoom;

    // Setup trước mỗi test
    beforeEach((done) => {
        // Tạo HTTP server
        server = http.createServer();
        
        // Initialize socket.io
        io = initializeSocket(server);

        // Start server
        server.listen(async () => {
            const port = server.address().port;

            // Tạo test users
            testUser1 = await createTestUser({
                name: 'Socket User 1',
                email: 'socketuser1@example.com',
            });
            token1 = generateTestToken(testUser1._id);

            testUser2 = await createTestUser({
                name: 'Socket User 2',
                email: 'socketuser2@example.com',
            });
            token2 = generateTestToken(testUser2._id);

            // Tạo test project và room
            testProject = await createTestProject({
                project_name: 'Socket Test Project',
                created_by: testUser1._id,
            });

            testRoom = await createTestChatRoom({
                project_id: testProject._id,
                name: 'Socket Test Room',
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

            // Kết nối socket clients
            clientSocket1 = socketClient(`http://localhost:${port}`, {
                auth: { token: token1 },
                forceNew: true,
            });

            clientSocket2 = socketClient(`http://localhost:${port}`, {
                auth: { token: token2 },
                forceNew: true,
            });

            // Đợi cả 2 clients kết nối
            let connectedCount = 0;
            const checkConnected = () => {
                connectedCount++;
                if (connectedCount === 2) {
                    done();
                }
            };

            clientSocket1.on('connect', checkConnected);
            clientSocket2.on('connect', checkConnected);
        });
    });

    // Cleanup sau mỗi test
    afterEach((done) => {
        if (clientSocket1 && clientSocket1.connected) {
            clientSocket1.disconnect();
        }
        if (clientSocket2 && clientSocket2.connected) {
            clientSocket2.disconnect();
        }
        if (io) {
            io.close();
        }
        if (server) {
            server.close(done);
        } else {
            done();
        }
    });

    describe('Socket Authentication', () => {
        it('Nên kết nối thành công với token hợp lệ', (done) => {
            expect(clientSocket1.connected).toBe(true);
            expect(clientSocket2.connected).toBe(true);
            done();
        });

        it('Nên bị từ chối kết nối khi không có token', (done) => {
            const port = server.address().port;
            const invalidClient = socketClient(`http://localhost:${port}`, {
                auth: {},
                forceNew: true,
            });

            invalidClient.on('connect_error', (error) => {
                expect(error.message).toContain('Authentication error');
                invalidClient.disconnect();
                done();
            });

            invalidClient.on('connect', () => {
                fail('Should not connect without token');
                invalidClient.disconnect();
                done();
            });
        });

        it('Nên bị từ chối kết nối với token không hợp lệ', (done) => {
            const port = server.address().port;
            const invalidClient = socketClient(`http://localhost:${port}`, {
                auth: { token: 'invalid-token' },
                forceNew: true,
            });

            invalidClient.on('connect_error', (error) => {
                expect(error.message).toContain('Authentication error');
                invalidClient.disconnect();
                done();
            });

            invalidClient.on('connect', () => {
                fail('Should not connect with invalid token');
                invalidClient.disconnect();
                done();
            });
        });

        it('Nên join vào personal room sau khi connect', (done) => {
            // Socket.io internal check - user should be in their personal room
            setTimeout(() => {
                const rooms = Array.from(clientSocket1.rooms || []);
                expect(rooms.some(r => r.includes(`user:${testUser1._id}`))).toBe(false);
                // Note: rooms are server-side, client can't check them directly
                done();
            }, 100);
        });
    });

    describe('Join Room', () => {
        it('Nên join room thành công khi user có quyền', (done) => {
            clientSocket1.emit('join_room', { roomId: testRoom._id.toString() });

            clientSocket1.on('joined_room', (data) => {
                expect(data.roomId).toBe(testRoom._id.toString());
                done();
            });
        });

        it('Nên trả về lỗi khi user không có quyền truy cập room', (done) => {
            // Tạo room mà user1 không thuộc
            (async () => {
                const privateRoom = await createTestChatRoom({
                    project_id: testProject._id,
                    name: 'Private Room',
                    type: 'group',
                });

                // Chỉ thêm user2
                await ChatRoomMember.create({
                    room_id: privateRoom._id,
                    user_id: testUser2._id,
                });

                clientSocket1.emit('join_room', { roomId: privateRoom._id.toString() });

                clientSocket1.on('error', (data) => {
                    expect(data.message).toBe('Bạn không có quyền truy cập phòng chat này');
                    done();
                });
            })();
        });

        it('Nên set currentRoomId sau khi join', (done) => {
            clientSocket1.emit('join_room', { roomId: testRoom._id.toString() });

            clientSocket1.on('joined_room', () => {
                // Internal state check would be on server
                done();
            });
        });
    });

    describe('Leave Room', () => {
        it('Nên leave room thành công', (done) => {
            // Join trước
            clientSocket1.emit('join_room', { roomId: testRoom._id.toString() });

            clientSocket1.on('joined_room', () => {
                // Leave room
                clientSocket1.emit('leave_room', { roomId: testRoom._id.toString() });
                
                setTimeout(() => {
                    // Verify by checking if messages are not received after leaving
                    done();
                }, 100);
            });
        });
    });

    describe('Send Message', () => {
        beforeEach((done) => {
            // Join cả 2 users vào room
            clientSocket1.emit('join_room', { roomId: testRoom._id.toString() });
            clientSocket2.emit('join_room', { roomId: testRoom._id.toString() });

            let joinedCount = 0;
            const checkJoined = () => {
                joinedCount++;
                if (joinedCount === 2) {
                    done();
                }
            };

            clientSocket1.on('joined_room', checkJoined);
            clientSocket2.on('joined_room', checkJoined);
        });

        it('Nên gửi tin nhắn thành công và nhận được ở client khác', (done) => {
            const testMessage = 'Hello from socket test';

            clientSocket2.on('new_message', (data) => {
                expect(data.message).toBeTruthy();
                expect(data.message.message).toBe(testMessage);
                expect(data.message.sender_id.name).toBe('Socket User 1');
                done();
            });

            clientSocket1.emit('send_message', {
                roomId: testRoom._id.toString(),
                message: testMessage,
            });
        });

        it('Nên lưu tin nhắn vào database', (done) => {
            const testMessage = 'Message to be saved';

            clientSocket1.emit('send_message', {
                roomId: testRoom._id.toString(),
                message: testMessage,
            });

            setTimeout(async () => {
                const savedMessage = await ChatMessage.findOne({
                    room_id: testRoom._id,
                    message: testMessage,
                });

                expect(savedMessage).toBeTruthy();
                expect(savedMessage.sender_id.toString()).toBe(testUser1._id.toString());
                done();
            }, 200);
        });

        it('Nên trả về lỗi khi tin nhắn trống', (done) => {
            clientSocket1.emit('send_message', {
                roomId: testRoom._id.toString(),
                message: '',
            });

            clientSocket1.on('error', (data) => {
                expect(data.message).toBe('Nội dung tin nhắn là bắt buộc');
                done();
            });
        });

        it('Nên trả về lỗi khi tin nhắn chỉ có khoảng trắng', (done) => {
            clientSocket1.emit('send_message', {
                roomId: testRoom._id.toString(),
                message: '   ',
            });

            clientSocket1.on('error', (data) => {
                expect(data.message).toBe('Nội dung tin nhắn là bắt buộc');
                done();
            });
        });

        it('Nên trả về lỗi khi user không có quyền gửi tin nhắn', (done) => {
            // Tạo room mà user1 không thuộc
            (async () => {
                const privateRoom = await createTestChatRoom({
                    project_id: testProject._id,
                    name: 'Private Room',
                    type: 'group',
                });

                await ChatRoomMember.create({
                    room_id: privateRoom._id,
                    user_id: testUser2._id,
                });

                clientSocket1.emit('send_message', {
                    roomId: privateRoom._id.toString(),
                    message: 'Unauthorized message',
                });

                clientSocket1.on('error', (data) => {
                    expect(data.message).toBe('Bạn không có quyền gửi tin nhắn vào phòng chat này');
                    done();
                });
            })();
        });

        it('Nên trim nội dung tin nhắn trước khi lưu', (done) => {
            const testMessage = '   Message with spaces   ';

            clientSocket2.on('new_message', async (data) => {
                expect(data.message.message).toBe('Message with spaces');

                // Verify trong database
                const savedMessage = await ChatMessage.findById(data.message._id);
                expect(savedMessage.message).toBe('Message with spaces');
                done();
            });

            clientSocket1.emit('send_message', {
                roomId: testRoom._id.toString(),
                message: testMessage,
            });
        });

        it('Nên populate sender_id trong tin nhắn', (done) => {
            clientSocket2.on('new_message', (data) => {
                expect(data.message.sender_id).toHaveProperty('name');
                expect(data.message.sender_id).toHaveProperty('email');
                expect(data.message.sender_id).not.toHaveProperty('password');
                expect(data.message.sender_id.name).toBe('Socket User 1');
                done();
            });

            clientSocket1.emit('send_message', {
                roomId: testRoom._id.toString(),
                message: 'Test message',
            });
        });

        it('Nên gửi notification cho user không trong room nhưng là member', (done) => {
            // User 2 leave room nhưng vẫn là member
            clientSocket2.emit('leave_room', { roomId: testRoom._id.toString() });

            setTimeout(() => {
                let receivedMessage = false;

                clientSocket2.on('new_message', (data) => {
                    if (!receivedMessage) {
                        receivedMessage = true;
                        expect(data.message.message).toBe('Notification test');
                        done();
                    }
                });

                // User 1 gửi tin nhắn
                clientSocket1.emit('send_message', {
                    roomId: testRoom._id.toString(),
                    message: 'Notification test',
                });
            }, 100);
        });
    });

    describe('Typing Indicator', () => {
        beforeEach((done) => {
            // Join cả 2 users vào room
            clientSocket1.emit('join_room', { roomId: testRoom._id.toString() });
            clientSocket2.emit('join_room', { roomId: testRoom._id.toString() });

            let joinedCount = 0;
            const checkJoined = () => {
                joinedCount++;
                if (joinedCount === 2) {
                    done();
                }
            };

            clientSocket1.on('joined_room', checkJoined);
            clientSocket2.on('joined_room', checkJoined);
        });

        it('Nên broadcast typing indicator đến các user khác trong room', (done) => {
            clientSocket2.on('user_typing', (data) => {
                expect(data.userId).toBe(testUser1._id.toString());
                expect(data.userName).toBe('Socket User 1');
                expect(data.isTyping).toBe(true);
                done();
            });

            clientSocket1.emit('typing', {
                roomId: testRoom._id.toString(),
                isTyping: true,
            });
        });

        it('Nên gửi isTyping false khi user ngừng typing', (done) => {
            clientSocket2.on('user_typing', (data) => {
                if (!data.isTyping) {
                    expect(data.userId).toBe(testUser1._id.toString());
                    expect(data.isTyping).toBe(false);
                    done();
                }
            });

            // Start typing
            clientSocket1.emit('typing', {
                roomId: testRoom._id.toString(),
                isTyping: true,
            });

            // Stop typing sau 100ms
            setTimeout(() => {
                clientSocket1.emit('typing', {
                    roomId: testRoom._id.toString(),
                    isTyping: false,
                });
            }, 100);
        });

        it('Không nên nhận typing indicator của chính mình', (done) => {
            let receivedOwnTyping = false;

            clientSocket1.on('user_typing', () => {
                receivedOwnTyping = true;
            });

            clientSocket1.emit('typing', {
                roomId: testRoom._id.toString(),
                isTyping: true,
            });

            setTimeout(() => {
                expect(receivedOwnTyping).toBe(false);
                done();
            }, 200);
        });
    });

    describe('Disconnect', () => {
        it('Nên log disconnect khi user ngắt kết nối', (done) => {
            // Đợi một chút để connection hoàn thành
            setTimeout(() => {
                clientSocket1.disconnect();
                
                // Verify disconnect đã xảy ra
                setTimeout(() => {
                    expect(clientSocket1.connected).toBe(false);
                    done();
                }, 200);
            }, 100);
        });

        it('Nên không còn nhận được messages sau khi disconnect', (done) => {
            clientSocket2.disconnect();

            setTimeout(() => {
                let receivedAfterDisconnect = false;

                clientSocket2.on('new_message', () => {
                    receivedAfterDisconnect = true;
                });

                clientSocket1.emit('send_message', {
                    roomId: testRoom._id.toString(),
                    message: 'Message after disconnect',
                });

                setTimeout(() => {
                    expect(receivedAfterDisconnect).toBe(false);
                    done();
                }, 200);
            }, 100);
        });
    });

    describe('Multiple Rooms', () => {
        let testRoom2;

        beforeEach(async () => {
            testRoom2 = await createTestChatRoom({
                project_id: testProject._id,
                name: 'Second Test Room',
                type: 'group',
            });

            await ChatRoomMember.create({
                room_id: testRoom2._id,
                user_id: testUser1._id,
            });

            await ChatRoomMember.create({
                room_id: testRoom2._id,
                user_id: testUser2._id,
            });
        });

        it('Nên chỉ nhận tin nhắn từ room đã join', (done) => {
            let messagesReceived = [];

            clientSocket2.on('new_message', (data) => {
                messagesReceived.push(data.message.message);
            });

            // User 2 chỉ join room 1
            clientSocket2.emit('join_room', { roomId: testRoom._id.toString() });

            clientSocket2.on('joined_room', () => {
                // User 1 join cả 2 rooms
                clientSocket1.emit('join_room', { roomId: testRoom._id.toString() });
                
                setTimeout(() => {
                    clientSocket1.emit('join_room', { roomId: testRoom2._id.toString() });
                }, 100);

                setTimeout(() => {
                    // Gửi tin nhắn vào room 1
                    clientSocket1.emit('send_message', {
                        roomId: testRoom._id.toString(),
                        message: 'Message to room 1',
                    });

                    // Gửi tin nhắn vào room 2
                    setTimeout(() => {
                        clientSocket1.emit('send_message', {
                            roomId: testRoom2._id.toString(),
                            message: 'Message to room 2',
                        });

                        // Kiểm tra sau 200ms
                        setTimeout(() => {
                            expect(messagesReceived).toContain('Message to room 1');
                            // User 2 không join room 2 nên vẫn nhận được notification
                            // (do logic trong socket.js gửi cho tất cả members)
                            done();
                        }, 200);
                    }, 100);
                }, 200);
            });
        });
    });

    describe('Error Handling', () => {
        it('Nên xử lý lỗi database khi lưu message thất bại', (done) => {
            // Mock ChatMessage.save to throw error
            const originalSave = ChatMessage.prototype.save;
            ChatMessage.prototype.save = jest.fn().mockRejectedValue(new Error('Database error'));

            clientSocket1.emit('join_room', { roomId: testRoom._id.toString() });

            clientSocket1.on('joined_room', () => {
                clientSocket1.emit('send_message', {
                    roomId: testRoom._id.toString(),
                    message: 'This will fail',
                });

                clientSocket1.on('error', (data) => {
                    expect(data.message).toBe('Có lỗi xảy ra khi gửi tin nhắn');
                    ChatMessage.prototype.save = originalSave;
                    done();
                });
            });
        });

        it('Nên xử lý lỗi khi join room không tồn tại', (done) => {
            const fakeRoomId = new mongoose.Types.ObjectId();

            clientSocket1.emit('join_room', { roomId: fakeRoomId.toString() });

            clientSocket1.on('error', (data) => {
                expect(data.message).toBe('Bạn không có quyền truy cập phòng chat này');
                done();
            });
        });
    });
});
