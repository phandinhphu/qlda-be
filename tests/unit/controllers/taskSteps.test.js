const request = require('supertest');
const express = require('express');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');

const Task = require('../../../src/apis/models/Task');
const TaskStep = require('../../../src/apis/models/TaskStep');
const taskRoutes = require('../../../src/routes/taskRoutes');

const {
    createTestUserWithToken,
} = require('../../helpers/testHelpers');

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/tasks', taskRoutes);

describe('TaskStep Tests', () => {
    let testUser;
    let testToken;
    let testTask;

    beforeEach(async () => {
        const { user, token } = await createTestUserWithToken();
        testUser = user;
        testToken = token;

        testTask = new Task({
            title: 'Test Task',
            description: 'Test Description',
            list_id: new mongoose.Types.ObjectId(),
            project_id: new mongoose.Types.ObjectId(),
            created_by: testUser._id,
        });
        await testTask.save();
    });

    describe('POST /api/tasks/:id/steps - addStep', () => {
        it('Nên tạo step thành công với dữ liệu hợp lệ', async () => {
            const stepData = {
                title: 'Test Step 1',
            };

            const response = await request(app)
                .post(`/api/tasks/${testTask._id}/steps`)
                .set('Cookie', [`token=${testToken}`])
                .send(stepData);

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('_id');
            expect(response.body.title).toBe(stepData.title);
            expect(response.body.task_id).toBe(testTask._id.toString());
            expect(response.body.is_completed).toBe(false);
            expect(response.body.position).toBe(0);
        });

        it('Nên tạo step với position đúng khi đã có các steps khác', async () => {
            await TaskStep.create({
                task_id: testTask._id,
                title: 'Existing Step 1',
                position: 0,
            });
            await TaskStep.create({
                task_id: testTask._id,
                title: 'Existing Step 2',
                position: 1,
            });

            const stepData = {
                title: 'New Step',
            };

            const response = await request(app)
                .post(`/api/tasks/${testTask._id}/steps`)
                .set('Cookie', [`token=${testToken}`])
                .send(stepData);

            expect(response.status).toBe(201);
            expect(response.body.position).toBe(2);
        });

        it('Nên trả về lỗi 400 khi thiếu title', async () => {
            const response = await request(app)
                .post(`/api/tasks/${testTask._id}/steps`)
                .set('Cookie', [`token=${testToken}`])
                .send({});

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('message');
            expect(response.body.message).toBe('Vui lòng cung cấp title cho step');
        });

        it('Nên trả về lỗi 404 khi task không tồn tại', async () => {
            const fakeTaskId = new mongoose.Types.ObjectId();
            const stepData = {
                title: 'Test Step',
            };

            const response = await request(app)
                .post(`/api/tasks/${fakeTaskId}/steps`)
                .set('Cookie', [`token=${testToken}`])
                .send(stepData);

            expect(response.status).toBe(404);
            expect(response.body).toHaveProperty('message');
            expect(response.body.message).toBe('Không tìm thấy task');
        });

        it('Nên trả về lỗi 401 khi không có token', async () => {
            const stepData = {
                title: 'Test Step',
            };

            const response = await request(app)
                .post(`/api/tasks/${testTask._id}/steps`)
                .send(stepData);

            expect(response.status).toBe(401);
        });
    });

    describe('GET /api/tasks/:taskId/steps - getTaskSteps', () => {
        it('Nên lấy danh sách steps thành công', async () => {
            await TaskStep.create([
                {
                    task_id: testTask._id,
                    title: 'Step 1',
                    position: 0,
                    is_completed: false,
                },
                {
                    task_id: testTask._id,
                    title: 'Step 2',
                    position: 1,
                    is_completed: true,
                },
                {
                    task_id: testTask._id,
                    title: 'Step 3',
                    position: 2,
                    is_completed: false,
                },
            ]);

            const response = await request(app)
                .get(`/api/tasks/${testTask._id}/steps`)
                .set('Cookie', [`token=${testToken}`]);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(3);
            expect(response.body.data[0].title).toBe('Step 1');
            expect(response.body.data[1].title).toBe('Step 2');
            expect(response.body.data[2].title).toBe('Step 3');
            expect(response.body.message).toBe('Lấy danh sách steps thành công');
        });

        it('Nên trả về mảng rỗng khi task không có steps', async () => {
            const response = await request(app)
                .get(`/api/tasks/${testTask._id}/steps`)
                .set('Cookie', [`token=${testToken}`]);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(0);
        });

        it('Nên trả về lỗi 404 khi task không tồn tại', async () => {
            const fakeTaskId = new mongoose.Types.ObjectId();

            const response = await request(app)
                .get(`/api/tasks/${fakeTaskId}/steps`)
                .set('Cookie', [`token=${testToken}`]);

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Không tìm thấy task');
        });

        it('Nên trả về steps theo thứ tự position', async () => {
            await TaskStep.create([
                {
                    task_id: testTask._id,
                    title: 'Step 3',
                    position: 2,
                },
                {
                    task_id: testTask._id,
                    title: 'Step 1',
                    position: 0,
                },
                {
                    task_id: testTask._id,
                    title: 'Step 2',
                    position: 1,
                },
            ]);

            const response = await request(app)
                .get(`/api/tasks/${testTask._id}/steps`)
                .set('Cookie', [`token=${testToken}`]);

            expect(response.status).toBe(200);
            expect(response.body.data[0].position).toBe(0);
            expect(response.body.data[1].position).toBe(1);
            expect(response.body.data[2].position).toBe(2);
        });

        it('Nên trả về lỗi 401 khi không có token', async () => {
            const response = await request(app)
                .get(`/api/tasks/${testTask._id}/steps`);

            expect(response.status).toBe(401);
        });
    });

    describe('PATCH /api/tasks/:taskId/steps/:stepId/toggle-completed - toggleStepComplete', () => {
        let testStep;

        beforeEach(async () => {
            testStep = new TaskStep({
                task_id: testTask._id,
                title: 'Test Step',
                position: 0,
                is_completed: false,
            });
            await testStep.save();
        });

        it('Nên toggle step từ chưa hoàn thành sang hoàn thành', async () => {
            const response = await request(app)
                .patch(`/api/tasks/${testTask._id}/steps/${testStep._id}/toggle-completed`)
                .set('Cookie', [`token=${testToken}`]);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.is_completed).toBe(true);
            expect(response.body.message).toBe('Step đã được đánh dấu hoàn thành');

            const updatedStep = await TaskStep.findById(testStep._id);
            expect(updatedStep.is_completed).toBe(true);
        });

        it('Nên toggle step từ hoàn thành sang chưa hoàn thành', async () => {
            testStep.is_completed = true;
            await testStep.save();

            const response = await request(app)
                .patch(`/api/tasks/${testTask._id}/steps/${testStep._id}/toggle-completed`)
                .set('Cookie', [`token=${testToken}`]);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.is_completed).toBe(false);
            expect(response.body.message).toBe('Step đã được đánh dấu chưa hoàn thành');

            const updatedStep = await TaskStep.findById(testStep._id);
            expect(updatedStep.is_completed).toBe(false);
        });

        it('Nên toggle step nhiều lần', async () => {
            const response1 = await request(app)
                .patch(`/api/tasks/${testTask._id}/steps/${testStep._id}/toggle-completed`)
                .set('Cookie', [`token=${testToken}`]);

            expect(response1.body.data.is_completed).toBe(true);

            const response2 = await request(app)
                .patch(`/api/tasks/${testTask._id}/steps/${testStep._id}/toggle-completed`)
                .set('Cookie', [`token=${testToken}`]);

            expect(response2.body.data.is_completed).toBe(false);

            const response3 = await request(app)
                .patch(`/api/tasks/${testTask._id}/steps/${testStep._id}/toggle-completed`)
                .set('Cookie', [`token=${testToken}`]);

            expect(response3.body.data.is_completed).toBe(true);
        });

        it('Nên trả về lỗi 404 khi step không tồn tại', async () => {
            const fakeStepId = new mongoose.Types.ObjectId();

            const response = await request(app)
                .patch(`/api/tasks/${testTask._id}/steps/${fakeStepId}/toggle-completed`)
                .set('Cookie', [`token=${testToken}`]);

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Không tìm thấy step');
        });

        it('Nên trả về lỗi 404 khi step không thuộc về task', async () => {
            const anotherTask = new Task({
                title: 'Another Task',
                list_id: new mongoose.Types.ObjectId(),
                project_id: new mongoose.Types.ObjectId(),
                created_by: testUser._id,
            });
            await anotherTask.save();

            const response = await request(app)
                .patch(`/api/tasks/${anotherTask._id}/steps/${testStep._id}/toggle-completed`)
                .set('Cookie', [`token=${testToken}`]);

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Không tìm thấy step');
        });

        it('Nên trả về lỗi 401 khi không có token', async () => {
            const response = await request(app)
                .patch(`/api/tasks/${testTask._id}/steps/${testStep._id}/toggle-completed`);

            expect(response.status).toBe(401);
        });
    });
});
