/**
 * Unit Tests cho Auth Controller
 * 
 * Hướng dẫn cho thành viên nhóm:
 * - File này test các chức năng authentication: register, login, logout, getMe
 * - Các test khác nên tạo file tương tự trong thư mục tests/unit/controllers/
 * - Sử dụng các helper functions trong tests/helpers/ để tránh lặp code
 * - Chạy test: npm test
 * - Chạy test với coverage: npm run test:coverage
 */

const request = require('supertest');
const express = require('express');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const User = require('../../../src/apis/models/User');
const authRoutes = require('../../../src/routes/auth');
const {
    createTestUser,
    createTestUserWithToken,
    getCookieFromResponse,
} = require('../../helpers/testHelpers');
const { mockUsers } = require('../../helpers/mockData');

// Setup Express app cho testing
const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/auth', authRoutes);

describe('Auth Controller Tests', () => {
    describe('POST /auth/register', () => {
        it('Nên đăng ký thành công với dữ liệu hợp lệ', async () => {
            const response = await request(app)
                .post('/auth/register')
                .send(mockUsers.validUser)
                .expect(201);

            expect(response.body).toHaveProperty('message');
            expect(response.body.message).toContain('Đăng ký thành công');

            // Verify user được tạo trong database
            const user = await User.findOne({ email: mockUsers.validUser.email });
            expect(user).toBeTruthy();
            expect(user.name).toBe(mockUsers.validUser.name);
            expect(user.email).toBe(mockUsers.validUser.email);

            // Verify password được hash
            const isPasswordHashed = await bcrypt.compare(
                mockUsers.validUser.password,
                user.password
            );
            expect(isPasswordHashed).toBe(true);
        });

        it('Nên trả về lỗi 400 khi email đã tồn tại', async () => {
            // Tạo user trước
            await createTestUser({
                email: mockUsers.validUser.email,
            });

            // Thử đăng ký với email đã tồn tại
            const response = await request(app)
                .post('/auth/register')
                .send(mockUsers.validUser)
                .expect(400);

            expect(response.body.message).toContain('Email đã tồn tại');
        });

        it('Nên trả về lỗi khi thiếu thông tin bắt buộc', async () => {
            const response = await request(app)
                .post('/auth/register')
                .send({
                    name: 'Test User',
                    // Thiếu email và password
                })
                .expect(500);

            expect(response.body).toHaveProperty('message');
        });
    });

    describe('POST /auth/login', () => {
        it('Nên đăng nhập thành công với thông tin hợp lệ', async () => {
            // Tạo user với password đã hash
            const hashedPassword = await bcrypt.hash(
                mockUsers.validUser.password,
                10
            );
            await createTestUser({
                email: mockUsers.validUser.email,
                password: hashedPassword,
            });

            // Login
            const response = await request(app)
                .post('/auth/login')
                .send({
                    email: mockUsers.validUser.email,
                    password: mockUsers.validUser.password,
                })
                .expect(200);

            expect(response.body.message).toContain('Đăng nhập thành công');

            // Verify JWT token được set trong cookie
            const token = getCookieFromResponse(response, 'token');
            expect(token).toBeTruthy();
        });

        it('Nên trả về lỗi 400 khi email không tồn tại', async () => {
            const response = await request(app)
                .post('/auth/login')
                .send({
                    email: 'notexist@example.com',
                    password: 'password123',
                })
                .expect(400);

            expect(response.body.message).toContain(
                'Email hoặc mật khẩu không hợp lệ'
            );
        });

        it('Nên trả về lỗi 400 khi password không đúng', async () => {
            const hashedPassword = await bcrypt.hash('correctpassword', 10);
            await createTestUser({
                email: mockUsers.validUser.email,
                password: hashedPassword,
            });

            const response = await request(app)
                .post('/auth/login')
                .send({
                    email: mockUsers.validUser.email,
                    password: 'wrongpassword',
                })
                .expect(400);

            expect(response.body.message).toContain(
                'Email hoặc mật khẩu không hợp lệ'
            );
        });

        it('Nên trả về lỗi khi thiếu thông tin đăng nhập', async () => {
            const response = await request(app)
                .post('/auth/login')
                .send({
                    email: mockUsers.validUser.email,
                    // Thiếu password
                })
                .expect(400);

            expect(response.body).toHaveProperty('message');
        });
    });

    describe('POST /auth/logout', () => {
        it('Nên đăng xuất thành công', async () => {
            const response = await request(app)
                .post('/auth/logout')
                .expect(200);

            expect(response.body.message).toContain('Đăng xuất thành công');

            // Verify cookie được clear
            const cookies = response.headers['set-cookie'];
            expect(cookies).toBeTruthy();
            const tokenCookie = cookies.find((c) => c.startsWith('token='));
            expect(tokenCookie).toBeTruthy();
            // Cookie value should be empty or expired
            expect(tokenCookie).toMatch(/token=;|token=([^;]*);.*Max-Age=0/);
        });
    });

    describe('GET /auth/me', () => {
        it('Nên trả về thông tin user khi đã đăng nhập', async () => {
            const { user, token } = await createTestUserWithToken({
                name: 'Test User',
                email: 'test@example.com',
            });

            const response = await request(app)
                .get('/auth/me')
                .set('Cookie', [`token=${token}`])
                .expect(200);

            expect(response.body).toHaveProperty('user');
            expect(response.body.user.email).toBe(user.email);
            expect(response.body.user.name).toBe(user.name);
            // Verify password không được trả về
            expect(response.body.user.password).toBeUndefined();
        });

        it('Nên trả về lỗi 401 khi không có token', async () => {
            const response = await request(app)
                .get('/auth/me')
                .expect(401);

            expect(response.body).toHaveProperty('message');
        });

        it('Nên trả về lỗi khi token không hợp lệ', async () => {
            const response = await request(app)
                .get('/auth/me')
                .set('Cookie', ['token=invalid-token'])
                .expect(500);

            expect(response.body).toHaveProperty('message');
        });

        it('Nên trả về lỗi khi user không tồn tại', async () => {
            const { token } = await createTestUserWithToken();
            
            // Xóa user khỏi database
            await User.deleteMany({});

            const response = await request(app)
                .get('/auth/me')
                .set('Cookie', [`token=${token}`])
                .expect(500);

            expect(response.body).toHaveProperty('message');
        });
    });
});
