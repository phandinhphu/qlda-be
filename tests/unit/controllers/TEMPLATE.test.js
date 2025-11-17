/**
 * Template cho Unit Test
 * 
 * Hướng dẫn sử dụng:
 * 1. Copy file này và đổi tên thành <feature>.test.js
 * 2. Thay thế các placeholder (YOUR_FEATURE, your-route, etc.)
 * 3. Viết test cases cho các endpoint của bạn
 * 4. Chạy: npm test
 */

const request = require('supertest');
const express = require('express');
const cookieParser = require('cookie-parser');

// TODO: Import models của bạn
// const YourModel = require('../../../src/apis/models/YourModel');

// TODO: Import routes của bạn
// const yourRoutes = require('../../../src/routes/your-route');

// Import helpers
const {
    createTestUser,
    createTestUserWithToken,
    getCookieFromResponse,
} = require('../../helpers/testHelpers');

// TODO: Import mock data (nếu có)
// const { mockYourFeature } = require('../../helpers/mockData');

// Setup Express app cho testing
const app = express();
app.use(express.json());
app.use(cookieParser());
// TODO: Thay 'your-route' bằng route thật của bạn
// app.use('/your-route', yourRoutes);

describe('YOUR_FEATURE Tests', () => {
    describe('GET /your-route/endpoint', () => {
        it('Nên thành công khi có dữ liệu hợp lệ', async () => {
            // Arrange: Setup dữ liệu test
            const { user, token } = await createTestUserWithToken();
            const testData = {
                // TODO: Thêm test data
            };

            // Act: Gọi API
            const response = await request(app)
                .get('/your-route/endpoint')
                .set('Cookie', [`token=${token}`])
                .expect(200);

            // Assert: Kiểm tra kết quả
            expect(response.body).toHaveProperty('data');
            // TODO: Thêm assertions khác
        });

        it('Nên trả về lỗi 401 khi chưa đăng nhập', async () => {
            // Act & Assert
            const response = await request(app)
                .get('/your-route/endpoint')
                .expect(401);

            expect(response.body).toHaveProperty('message');
        });

        it('Nên trả về lỗi 400 khi dữ liệu không hợp lệ', async () => {
            // Arrange
            const { token } = await createTestUserWithToken();

            // Act
            const response = await request(app)
                .get('/your-route/endpoint')
                .set('Cookie', [`token=${token}`])
                .expect(400);

            // Assert
            expect(response.body).toHaveProperty('message');
        });
    });

    describe('POST /your-route/endpoint', () => {
        it('Nên tạo mới thành công', async () => {
            // Arrange
            const { user, token } = await createTestUserWithToken();
            const newData = {
                // TODO: Thêm dữ liệu
            };

            // Act
            const response = await request(app)
                .post('/your-route/endpoint')
                .set('Cookie', [`token=${token}`])
                .send(newData)
                .expect(201);

            // Assert
            expect(response.body).toHaveProperty('data');
            // TODO: Verify data trong database nếu cần
            // const saved = await YourModel.findById(response.body.data._id);
            // expect(saved).toBeTruthy();
        });

        it('Nên trả về lỗi khi thiếu thông tin bắt buộc', async () => {
            // Arrange
            const { token } = await createTestUserWithToken();

            // Act
            const response = await request(app)
                .post('/your-route/endpoint')
                .set('Cookie', [`token=${token}`])
                .send({}) // Empty data
                .expect(400);

            // Assert
            expect(response.body).toHaveProperty('message');
        });
    });

    describe('PUT /your-route/endpoint/:id', () => {
        it('Nên cập nhật thành công', async () => {
            // Arrange
            const { user, token } = await createTestUserWithToken();
            // TODO: Tạo data cần update
            // const existing = await YourModel.create({ ... });
            
            const updateData = {
                // TODO: Thêm dữ liệu cập nhật
            };

            // Act
            const response = await request(app)
                .put('/your-route/endpoint/123')
                .set('Cookie', [`token=${token}`])
                .send(updateData)
                .expect(200);

            // Assert
            expect(response.body).toHaveProperty('data');
        });

        it('Nên trả về lỗi 404 khi không tìm thấy', async () => {
            // Arrange
            const { token } = await createTestUserWithToken();

            // Act
            const response = await request(app)
                .put('/your-route/endpoint/nonexistent-id')
                .set('Cookie', [`token=${token}`])
                .send({ /* update data */ })
                .expect(404);

            // Assert
            expect(response.body).toHaveProperty('message');
        });
    });

    describe('DELETE /your-route/endpoint/:id', () => {
        it('Nên xóa thành công', async () => {
            // Arrange
            const { user, token } = await createTestUserWithToken();
            // TODO: Tạo data cần xóa
            // const existing = await YourModel.create({ ... });

            // Act
            const response = await request(app)
                .delete('/your-route/endpoint/123')
                .set('Cookie', [`token=${token}`])
                .expect(200);

            // Assert
            expect(response.body).toHaveProperty('message');
            // TODO: Verify data đã bị xóa
            // const deleted = await YourModel.findById(existing._id);
            // expect(deleted).toBeNull();
        });

        it('Nên trả về lỗi 404 khi không tìm thấy', async () => {
            // Arrange
            const { token } = await createTestUserWithToken();

            // Act
            const response = await request(app)
                .delete('/your-route/endpoint/nonexistent-id')
                .set('Cookie', [`token=${token}`])
                .expect(404);

            // Assert
            expect(response.body).toHaveProperty('message');
        });
    });

    // TODO: Thêm các test cases khác nếu cần
    // - Test permissions (user không có quyền)
    // - Test edge cases
    // - Test validation rules
    // - Test relationships với models khác
});

/*
 * TIPS:
 * 
 * 1. AAA Pattern (Arrange-Act-Assert):
 *    - Arrange: Setup dữ liệu
 *    - Act: Thực hiện action
 *    - Assert: Kiểm tra kết quả
 * 
 * 2. Mô tả test rõ ràng:
 *    - Dùng tiếng Việt
 *    - Nói rõ điều kiện và kết quả mong đợi
 * 
 * 3. Test coverage:
 *    - Happy path (thành công)
 *    - Error cases (các trường hợp lỗi)
 *    - Edge cases (trường hợp đặc biệt)
 * 
 * 4. Helper functions:
 *    - Dùng createTestUserWithToken() cho routes có auth
 *    - Dùng createTestUser() cho routes public
 *    - Thêm helper mới vào testHelpers.js nếu cần
 * 
 * 5. Mock data:
 *    - Thêm vào helpers/mockData.js
 *    - Tái sử dụng trong nhiều tests
 */
