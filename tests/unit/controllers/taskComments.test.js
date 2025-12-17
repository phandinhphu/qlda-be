/**
 * Unit Tests cho Task Comments Controller
 * 
 * Test các chức năng:
 * - POST /api/tasks/:id/comments - Thêm bình luận
 * - GET /api/tasks/:taskId/comments - Lấy danh sách bình luận
 * - PUT /api/tasks/:taskId/comments/:commentId - Cập nhật bình luận
 * - DELETE /api/tasks/:taskId/comments/:commentId - Xóa bình luận
 */

const request = require('supertest');
const express = require('express');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');

const Task = require('../../../src/apis/models/Task');
const TaskComment = require('../../../src/apis/models/TaskComment');
const List = require('../../../src/apis/models/List');
const taskRoutes = require('../../../src/routes/taskRoutes');

const {
    createTestUserWithToken,
} = require('../../helpers/testHelpers');

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/tasks', taskRoutes);

describe('Task Comments Tests', () => {
    let testUser;
    let testToken;
    let testTask;
    let anotherUser;
    let anotherUserToken;

    beforeEach(async () => {
        // Tạo user chính
        const { user, token } = await createTestUserWithToken({
            name: 'Test User',
            email: 'test@example.com',
        });
        testUser = user;
        testToken = token;

        // Tạo user khác để test permission
        const { user: otherUser, token: otherToken } = await createTestUserWithToken({
            name: 'Another User',
            email: 'another@example.com',
        });
        anotherUser = otherUser;
        anotherUserToken = otherToken;

        // Tạo task
        testTask = new Task({
            title: 'Test Task',
            description: 'Test Description',
            list_id: new mongoose.Types.ObjectId(),
            project_id: new mongoose.Types.ObjectId(),
            created_by: testUser._id,
        });
        await testTask.save();
    });

    describe('POST /api/tasks/:id/comments - addComment', () => {
        it('Nên tạo comment thành công với dữ liệu hợp lệ', async () => {
            const commentData = {
                content: 'Đây là bình luận test',
            };

            const response = await request(app)
                .post(`/api/tasks/${testTask._id}/comments`)
                .set('Cookie', [`token=${testToken}`])
                .send(commentData);

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('_id');
            expect(response.body.content).toBe(commentData.content);
            expect(response.body.task_id).toBe(testTask._id.toString());
            expect(response.body.user_id).toHaveProperty('_id');
            expect(response.body.user_id._id).toBe(testUser._id.toString());
            expect(response.body.user_id).toHaveProperty('name');
            expect(response.body.user_id).toHaveProperty('email');

            // Verify comment được lưu trong database
            const comment = await TaskComment.findById(response.body._id);
            expect(comment).toBeTruthy();
            expect(comment.content).toBe(commentData.content);
        });

        it('Nên trả về lỗi 400 khi thiếu content', async () => {
            const response = await request(app)
                .post(`/api/tasks/${testTask._id}/comments`)
                .set('Cookie', [`token=${testToken}`])
                .send({});

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('message');
            expect(response.body.message).toBe('Vui lòng nhập nội dung bình luận');
        });

        it('Nên trả về lỗi 400 khi content rỗng', async () => {
            const response = await request(app)
                .post(`/api/tasks/${testTask._id}/comments`)
                .set('Cookie', [`token=${testToken}`])
                .send({ content: '' });

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('message');
        });

        it('Nên trả về lỗi 404 khi task không tồn tại', async () => {
            const fakeTaskId = new mongoose.Types.ObjectId();
            const commentData = {
                content: 'Test comment',
            };

            const response = await request(app)
                .post(`/api/tasks/${fakeTaskId}/comments`)
                .set('Cookie', [`token=${testToken}`])
                .send(commentData);

            expect(response.status).toBe(404);
            expect(response.body).toHaveProperty('message');
            expect(response.body.message).toBe('Không tìm thấy task');
        });

        it('Nên trả về lỗi 401 khi không có token', async () => {
            const commentData = {
                content: 'Test comment',
            };

            const response = await request(app)
                .post(`/api/tasks/${testTask._id}/comments`)
                .send(commentData);

            expect(response.status).toBe(401);
        });

        it('Nên populate user info trong response', async () => {
            const commentData = {
                content: 'Test comment với user info',
            };

            const response = await request(app)
                .post(`/api/tasks/${testTask._id}/comments`)
                .set('Cookie', [`token=${testToken}`])
                .send(commentData);

            expect(response.status).toBe(201);
            expect(response.body.user_id).toHaveProperty('name');
            expect(response.body.user_id).toHaveProperty('email');
            expect(response.body.user_id.name).toBe(testUser.name);
            expect(response.body.user_id.email).toBe(testUser.email);
        });
    });

    describe('GET /api/tasks/:taskId/comments - getTaskComments', () => {
        it('Nên lấy danh sách comments thành công', async () => {
            // Tạo một số comments
            await TaskComment.create([
                {
                    task_id: testTask._id,
                    user_id: testUser._id,
                    content: 'Comment 1',
                },
                {
                    task_id: testTask._id,
                    user_id: testUser._id,
                    content: 'Comment 2',
                },
                {
                    task_id: testTask._id,
                    user_id: testUser._id,
                    content: 'Comment 3',
                },
            ]);

            const response = await request(app)
                .get(`/api/tasks/${testTask._id}/comments`)
                .set('Cookie', [`token=${testToken}`]);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(3);
            expect(response.body.data[0].content).toBe('Comment 1');
            expect(response.body.data[1].content).toBe('Comment 2');
            expect(response.body.data[2].content).toBe('Comment 3');
            expect(response.body.message).toBe('Lấy danh sách comments thành công');
        });

        it('Nên trả về mảng rỗng khi task không có comments', async () => {
            const response = await request(app)
                .get(`/api/tasks/${testTask._id}/comments`)
                .set('Cookie', [`token=${testToken}`]);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(0);
        });

        it('Nên populate user info trong mỗi comment', async () => {
            await TaskComment.create({
                task_id: testTask._id,
                user_id: testUser._id,
                content: 'Test comment',
            });

            const response = await request(app)
                .get(`/api/tasks/${testTask._id}/comments`)
                .set('Cookie', [`token=${testToken}`]);

            expect(response.status).toBe(200);
            expect(response.body.data[0].user_id).toHaveProperty('_id');
            expect(response.body.data[0].user_id).toHaveProperty('name');
            expect(response.body.data[0].user_id).toHaveProperty('email');
            expect(response.body.data[0].user_id.name).toBe(testUser.name);
        });

        it('Nên sắp xếp comments theo created_at tăng dần', async () => {
            const comment1 = await TaskComment.create({
                task_id: testTask._id,
                user_id: testUser._id,
                content: 'First comment',
            });

            // Đợi một chút để đảm bảo timestamp khác nhau
            await new Promise((resolve) => setTimeout(resolve, 10));

            const comment2 = await TaskComment.create({
                task_id: testTask._id,
                user_id: testUser._id,
                content: 'Second comment',
            });

            const response = await request(app)
                .get(`/api/tasks/${testTask._id}/comments`)
                .set('Cookie', [`token=${testToken}`]);

            expect(response.status).toBe(200);
            expect(response.body.data[0].content).toBe('First comment');
            expect(response.body.data[1].content).toBe('Second comment');
        });

        it('Nên trả về lỗi 404 khi task không tồn tại', async () => {
            const fakeTaskId = new mongoose.Types.ObjectId();

            const response = await request(app)
                .get(`/api/tasks/${fakeTaskId}/comments`)
                .set('Cookie', [`token=${testToken}`]);

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Không tìm thấy task');
        });

        it('Nên trả về lỗi 401 khi không có token', async () => {
            const response = await request(app)
                .get(`/api/tasks/${testTask._id}/comments`);

            expect(response.status).toBe(401);
        });
    });

    describe('PUT /api/tasks/:taskId/comments/:commentId - updateComment', () => {
        let testComment;

        beforeEach(async () => {
            testComment = await TaskComment.create({
                task_id: testTask._id,
                user_id: testUser._id,
                content: 'Original comment',
            });
        });

        it('Nên cập nhật comment thành công khi user là chủ sở hữu', async () => {
            const updateData = {
                content: 'Updated comment content',
            };

            const response = await request(app)
                .put(`/api/tasks/${testTask._id}/comments/${testComment._id}`)
                .set('Cookie', [`token=${testToken}`])
                .send(updateData);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.content).toBe(updateData.content);
            expect(response.body.data._id.toString()).toBe(testComment._id.toString());
            expect(response.body.message).toBe('Cập nhật comment thành công');

            // Verify comment được cập nhật trong database
            const updatedComment = await TaskComment.findById(testComment._id);
            expect(updatedComment.content).toBe(updateData.content);
        });

        it('Nên populate user info trong response sau khi cập nhật', async () => {
            const updateData = {
                content: 'Updated comment',
            };

            const response = await request(app)
                .put(`/api/tasks/${testTask._id}/comments/${testComment._id}`)
                .set('Cookie', [`token=${testToken}`])
                .send(updateData);

            expect(response.status).toBe(200);
            expect(response.body.data.user_id).toHaveProperty('name');
            expect(response.body.data.user_id).toHaveProperty('email');
        });

        it('Nên trả về lỗi 403 khi user không phải chủ sở hữu', async () => {
            const updateData = {
                content: 'Trying to update someone else comment',
            };

            const response = await request(app)
                .put(`/api/tasks/${testTask._id}/comments/${testComment._id}`)
                .set('Cookie', [`token=${anotherUserToken}`])
                .send(updateData);

            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Bạn không có quyền chỉnh sửa comment này');
        });

        it('Nên trả về lỗi 400 khi thiếu content', async () => {
            const response = await request(app)
                .put(`/api/tasks/${testTask._id}/comments/${testComment._id}`)
                .set('Cookie', [`token=${testToken}`])
                .send({});

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Vui lòng nhập nội dung bình luận');
        });

        it('Nên trả về lỗi 404 khi comment không tồn tại', async () => {
            const fakeCommentId = new mongoose.Types.ObjectId();
            const updateData = {
                content: 'Updated content',
            };

            const response = await request(app)
                .put(`/api/tasks/${testTask._id}/comments/${fakeCommentId}`)
                .set('Cookie', [`token=${testToken}`])
                .send(updateData);

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Không tìm thấy comment');
        });

        it('Nên trả về lỗi 404 khi comment không thuộc về task', async () => {
            const anotherTask = new Task({
                title: 'Another Task',
                list_id: new mongoose.Types.ObjectId(),
                project_id: new mongoose.Types.ObjectId(),
                created_by: testUser._id,
            });
            await anotherTask.save();

            const updateData = {
                content: 'Updated content',
            };

            const response = await request(app)
                .put(`/api/tasks/${anotherTask._id}/comments/${testComment._id}`)
                .set('Cookie', [`token=${testToken}`])
                .send(updateData);

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Không tìm thấy comment');
        });

        it('Nên trả về lỗi 401 khi không có token', async () => {
            const updateData = {
                content: 'Updated content',
            };

            const response = await request(app)
                .put(`/api/tasks/${testTask._id}/comments/${testComment._id}`)
                .send(updateData);

            expect(response.status).toBe(401);
        });
    });

    describe('DELETE /api/tasks/:taskId/comments/:commentId - deleteComment', () => {
        let testComment;

        beforeEach(async () => {
            testComment = await TaskComment.create({
                task_id: testTask._id,
                user_id: testUser._id,
                content: 'Comment to be deleted',
            });
        });

        it('Nên xóa comment thành công khi user là chủ sở hữu', async () => {
            const response = await request(app)
                .delete(`/api/tasks/${testTask._id}/comments/${testComment._id}`)
                .set('Cookie', [`token=${testToken}`]);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Xóa comment thành công');

            // Verify comment đã bị xóa khỏi database
            const deletedComment = await TaskComment.findById(testComment._id);
            expect(deletedComment).toBeNull();
        });

        it('Nên trả về lỗi 403 khi user không phải chủ sở hữu', async () => {
            const response = await request(app)
                .delete(`/api/tasks/${testTask._id}/comments/${testComment._id}`)
                .set('Cookie', [`token=${anotherUserToken}`]);

            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Bạn không có quyền xóa comment này');

            // Verify comment vẫn còn trong database
            const comment = await TaskComment.findById(testComment._id);
            expect(comment).toBeTruthy();
        });

        it('Nên trả về lỗi 404 khi comment không tồn tại', async () => {
            const fakeCommentId = new mongoose.Types.ObjectId();

            const response = await request(app)
                .delete(`/api/tasks/${testTask._id}/comments/${fakeCommentId}`)
                .set('Cookie', [`token=${testToken}`]);

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Không tìm thấy comment');
        });

        it('Nên trả về lỗi 404 khi comment không thuộc về task', async () => {
            const anotherTask = new Task({
                title: 'Another Task',
                list_id: new mongoose.Types.ObjectId(),
                project_id: new mongoose.Types.ObjectId(),
                created_by: testUser._id,
            });
            await anotherTask.save();

            const response = await request(app)
                .delete(`/api/tasks/${anotherTask._id}/comments/${testComment._id}`)
                .set('Cookie', [`token=${testToken}`]);

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Không tìm thấy comment');
        });

        it('Nên trả về lỗi 401 khi không có token', async () => {
            const response = await request(app)
                .delete(`/api/tasks/${testTask._id}/comments/${testComment._id}`);

            expect(response.status).toBe(401);
        });
    });

    describe('Integration Tests', () => {
        it('Nên thực hiện đầy đủ workflow: thêm, lấy, cập nhật, xóa comment', async () => {
            // 1. Thêm comment
            const addResponse = await request(app)
                .post(`/api/tasks/${testTask._id}/comments`)
                .set('Cookie', [`token=${testToken}`])
                .send({ content: 'Integration test comment' });

            expect(addResponse.status).toBe(201);
            const commentId = addResponse.body._id;

            // 2. Lấy danh sách comments
            const getResponse = await request(app)
                .get(`/api/tasks/${testTask._id}/comments`)
                .set('Cookie', [`token=${testToken}`]);

            expect(getResponse.status).toBe(200);
            expect(getResponse.body.data).toHaveLength(1);
            expect(getResponse.body.data[0].content).toBe('Integration test comment');

            // 3. Cập nhật comment
            const updateResponse = await request(app)
                .put(`/api/tasks/${testTask._id}/comments/${commentId}`)
                .set('Cookie', [`token=${testToken}`])
                .send({ content: 'Updated integration test comment' });

            expect(updateResponse.status).toBe(200);
            expect(updateResponse.body.data.content).toBe('Updated integration test comment');

            // 4. Xóa comment
            const deleteResponse = await request(app)
                .delete(`/api/tasks/${testTask._id}/comments/${commentId}`)
                .set('Cookie', [`token=${testToken}`]);

            expect(deleteResponse.status).toBe(200);

            // 5. Verify comment đã bị xóa
            const finalGetResponse = await request(app)
                .get(`/api/tasks/${testTask._id}/comments`)
                .set('Cookie', [`token=${testToken}`]);

            expect(finalGetResponse.status).toBe(200);
            expect(finalGetResponse.body.data).toHaveLength(0);
        });

        it('Nên xử lý nhiều comments từ nhiều users', async () => {
            // User 1 thêm comment
            const comment1 = await request(app)
                .post(`/api/tasks/${testTask._id}/comments`)
                .set('Cookie', [`token=${testToken}`])
                .send({ content: 'Comment from user 1' });

            // User 2 thêm comment
            const comment2 = await request(app)
                .post(`/api/tasks/${testTask._id}/comments`)
                .set('Cookie', [`token=${anotherUserToken}`])
                .send({ content: 'Comment from user 2' });

            // Lấy tất cả comments
            const getResponse = await request(app)
                .get(`/api/tasks/${testTask._id}/comments`)
                .set('Cookie', [`token=${testToken}`]);

            expect(getResponse.status).toBe(200);
            expect(getResponse.body.data).toHaveLength(2);

            // User 1 chỉ có thể xóa comment của mình
            const deleteResponse = await request(app)
                .delete(`/api/tasks/${testTask._id}/comments/${comment1.body._id}`)
                .set('Cookie', [`token=${testToken}`]);

            expect(deleteResponse.status).toBe(200);

            // User 1 không thể xóa comment của user 2
            const deleteOtherResponse = await request(app)
                .delete(`/api/tasks/${testTask._id}/comments/${comment2.body._id}`)
                .set('Cookie', [`token=${testToken}`]);

            expect(deleteOtherResponse.status).toBe(403);
        });
    });
});

