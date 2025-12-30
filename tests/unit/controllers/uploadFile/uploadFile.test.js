const request = require('supertest');
const express = require('express');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

// Import models và routes
// Lưu ý: Đã thêm ../ để phù hợp với thư mục uploadFile/
const TaskFile = require('../../../../src/apis/models/TaskFile');
const taskRoutes = require('../../../../src/routes/taskRoutes');
const { createTestUserWithToken } = require('../../../helpers/testHelpers');

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/tasks', taskRoutes);

describe('Task Attachment API Tests', () => {
    // Đường dẫn tới một file test giả lập
    const testFilePath = path.join(__dirname, 'test-image.png');

    // Tạo một file nhỏ để dùng cho việc test upload
    beforeAll(() => {
        fs.writeFileSync(testFilePath, 'fake-image-content');
    });

    afterAll(() => {
        if (fs.existsSync(testFilePath)) {
            fs.unlinkSync(testFilePath);
        }
    });

    // --- TEST UPLOAD FILE ---
    describe('POST /api/tasks/:taskId/uploads', () => {
        it('Nên upload file thành công khi dữ liệu hợp lệ', async () => {
            const { user, token } = await createTestUserWithToken();
            const taskId = new mongoose.Types.ObjectId();

            const response = await request(app)
                .post(`/api/tasks/${taskId}/uploads`)
                .set('Cookie', [`token=${token}`])
                .attach('file', testFilePath)
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('file_url');
            expect(response.body.data.task_id).toBe(taskId.toString());

            const savedFile = await TaskFile.findOne({ task_id: taskId });
            expect(savedFile).toBeTruthy();
            expect(savedFile.uploaded_by.toString()).toBe(user._id.toString());
        });

        it('Nên trả về lỗi 400 nếu không có file đính kèm', async () => {
            const { token } = await createTestUserWithToken();
            const taskId = new mongoose.Types.ObjectId();

            const response = await request(app)
                .post(`/api/tasks/${taskId}/uploads`)
                .set('Cookie', [`token=${token}`])
                .expect(400);

            expect(response.body.message).toBe('Vui lòng chọn file để tải lên.');
        });

        it('Nên trả về lỗi 401 khi chưa đăng nhập', async () => {
            const taskId = new mongoose.Types.ObjectId();

            const response = await request(app)
                .post(`/api/tasks/${taskId}/uploads`)
                .expect(401);

            expect(response.body).toHaveProperty('message');
        });

        it('Nên tự động đổi tên file nếu tên file đã tồn tại trên server', async () => {
            const { token } = await createTestUserWithToken();
            const taskId = new mongoose.Types.ObjectId();

            // Upload lần đầu
            await request(app)
                .post(`/api/tasks/${taskId}/uploads`)
                .set('Cookie', [`token=${token}`])
                .attach('file', testFilePath);

            // Upload lần thứ hai với cùng một file (cùng tên test-image.png)
            const response = await request(app)
                .post(`/api/tasks/${taskId}/uploads`)
                .set('Cookie', [`token=${token}`])
                .attach('file', testFilePath)
                .expect(201);

            // Kiểm tra xem tên file trong URL có chứa hậu tố "[1]" hay không
            expect(response.body.data.file_url).toMatch(/\[1\]/);
            
            // Đảm bảo tệp vẫn thuộc về đúng taskId
            expect(response.body.data.task_id).toBe(taskId.toString());
        });
    });

    // --- TEST LẤY DANH SÁCH FILE ---
    describe('GET /api/tasks/:taskId/files', () => {
        it('Nên lấy danh sách file thành công và populate thông tin người upload', async () => {
            const { user, token } = await createTestUserWithToken();
            const taskId = new mongoose.Types.ObjectId();

            // Giả lập dữ liệu file trong DB
            await TaskFile.create([
                {
                    task_id: taskId,
                    file_url: 'http://localhost/uploads/test1.jpg',
                    uploaded_by: user._id,
                },
                {
                    task_id: taskId,
                    file_url: 'http://localhost/uploads/test2.pdf',
                    uploaded_by: user._id,
                }
            ]);

            const response = await request(app)
                .get(`/api/tasks/${taskId}/files`)
                .set('Cookie', [`token=${token}`])
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(2);
            // Kiểm tra populate 'uploaded_by'
            expect(response.body.data[0].uploaded_by).toHaveProperty('name', user.name);
            expect(response.body.data[0].uploaded_by).toHaveProperty('email', user.email);
        });

        it('Nên trả về mảng rỗng nếu task chưa có đính kèm nào', async () => {
            const { token } = await createTestUserWithToken();
            const taskId = new mongoose.Types.ObjectId();

            const response = await request(app)
                .get(`/api/tasks/${taskId}/files`)
                .set('Cookie', [`token=${token}`])
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toEqual([]);
        });

        it('Nên trả về lỗi 500 khi taskId sai định dạng', async () => {
            const { token } = await createTestUserWithToken();
            const invalidId = 'not-an-object-id';

            const response = await request(app)
                .get(`/api/tasks/${invalidId}/files`)
                .set('Cookie', [`token=${token}`])
                .expect(500);

            expect(response.body.message).toBe('Lỗi server');
        });

        it('Nên chặn truy cập (401) nếu không gửi token qua cookie', async () => {
            const taskId = new mongoose.Types.ObjectId();

            const response = await request(app)
                .get(`/api/tasks/${taskId}/files`)
                .expect(401);

            expect(response.body).toHaveProperty('message');
        });

        it('Nên trả về đầy đủ các trường thông tin của người upload sau khi populate', async () => {
            const { user, token } = await createTestUserWithToken();
            const taskId = new mongoose.Types.ObjectId();

            await TaskFile.create({
                task_id: taskId,
                file_url: 'http://localhost/uploads/check-populate.png',
                uploaded_by: user._id,
            });

            const response = await request(app)
                .get(`/api/tasks/${taskId}/files`)
                .set('Cookie', [`token=${token}`])
                .expect(200);

            const fileData = response.body.data[0];
            
            // Kiểm tra các trường thông tin cụ thể của User Model
            expect(fileData.uploaded_by).toHaveProperty('_id', user._id.toString());
            expect(fileData.uploaded_by).toHaveProperty('name', user.name);
            expect(fileData.uploaded_by).toHaveProperty('email', user.email);
            // Password không được xuất hiện (nếu Model User đã được cấu hình ẩn password)
            expect(fileData.uploaded_by).not.toHaveProperty('password');
        });

        it('Nên chỉ trả về tệp thuộc về taskId được yêu cầu (tính phân tách)', async () => {
            const { user, token } = await createTestUserWithToken();
            const taskIdA = new mongoose.Types.ObjectId();
            const taskIdB = new mongoose.Types.ObjectId();

            // Tạo tệp cho Task A
            await TaskFile.create({
                task_id: taskIdA,
                file_url: 'http://localhost/uploads/taskA.png',
                uploaded_by: user._id,
            });

            // Tạo tệp cho Task B
            await TaskFile.create({
                task_id: taskIdB,
                file_url: 'http://localhost/uploads/taskB.png',
                uploaded_by: user._id,
            });

            // Yêu cầu lấy tệp của Task A
            const response = await request(app)
                .get(`/api/tasks/${taskIdA}/files`)
                .set('Cookie', [`token=${token}`])
                .expect(200);

            // Chỉ được trả về 1 tệp và phải là tệp của Task A
            expect(response.body.data).toHaveLength(1);
            expect(response.body.data[0].file_url).toContain('taskA.png');
            expect(response.body.data[0].task_id).toBe(taskIdA.toString());
        });
    });
});