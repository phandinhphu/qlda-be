const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../../src/apis/models/User');
const { JWT_SECRET } = require('../../src/util/constants');

/**
 * Tạo user mẫu cho testing
 * @param {Object} userData - Dữ liệu user tùy chỉnh
 * @returns {Promise<Object>} User đã được tạo
 */
const createTestUser = async (userData = {}) => {
    const defaultUser = {
        name: 'Test User',
        email: 'test@example.com',
        password: await bcrypt.hash('password123', 10),
    };

    const user = new User({ ...defaultUser, ...userData });
    await user.save();
    return user;
};

/**
 * Tạo JWT token cho user
 * @param {String} userId - ID của user
 * @returns {String} JWT token
 */
const generateTestToken = (userId) => {
    return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '7d' });
};

/**
 * Tạo user và token cho testing
 * @param {Object} userData - Dữ liệu user tùy chỉnh
 * @returns {Promise<Object>} Object chứa user và token
 */
const createTestUserWithToken = async (userData = {}) => {
    const user = await createTestUser(userData);
    const token = generateTestToken(user._id);
    return { user, token };
};

/**
 * Lấy cookie từ response
 * @param {Object} response - Response từ supertest
 * @param {String} cookieName - Tên của cookie
 * @returns {String|null} Giá trị cookie hoặc null
 */
const getCookieFromResponse = (response, cookieName) => {
    const cookies = response.headers['set-cookie'];
    if (!cookies) return null;

    const cookie = cookies.find((c) => c.startsWith(`${cookieName}=`));
    if (!cookie) return null;

    const match = cookie.match(new RegExp(`${cookieName}=([^;]+)`));
    return match ? match[1] : null;
};

module.exports = {
    createTestUser,
    generateTestToken,
    createTestUserWithToken,
    getCookieFromResponse,
};
