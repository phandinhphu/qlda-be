const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../../util/constants');

class AuthController {
    // [POST] /auth/register
    async register(req, res) {
        const { name, email, password } = req.body;

        try {
            // Check if user already exists
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.status(400).json({ message: 'Email đã tồn tại' });
            }

            // Hash the password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Create a new user
            const newUser = new User({
                name,
                email,
                password: hashedPassword,
            });

            await newUser.save();
            return res.status(201).json({
                message: 'Đăng ký thành công. Vui lòng đăng nhập để tiếp tục!',
            });
        } catch (error) {
            return res.status(500).json({ message: 'Có lỗi xảy ra. Vui lòng thử lại sau!!!' });
        }
    }

    // [POST] /auth/login
    async login(req, res, next) {
        const { email, password } = req.body;

        try {
            // Check if user exists
            const user = await User.findOne({ email });
            if (!user) {
                return res.status(400).json({ message: 'Email hoặc mật khẩu không hợp lệ' });
            }

            // Check password
            const isPasswordValid = await bcrypt.compare(password, user.password);
            if (!isPasswordValid) {
                return res.status(400).json({ message: 'Email hoặc mật khẩu không hợp lệ' });
            }

            // Generate JWT token
            const token = jwt.sign(
                {
                    id: user._id,
                },
                JWT_SECRET,
                { expiresIn: JWT_EXPIRES_IN },
            );

            res.cookie('token', token, {
                httpOnly: true, // Không cho JS truy cập
                secure: true, // bắt buộc khi sameSite: 'None'
                sameSite: 'None',
                maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
            });

            res.json({ message: 'Đăng nhập thành công' });
        } catch (error) {
            return res.status(500).json({ message: 'Có lỗi xảy ra. Vui lòng thử lại sau!!!' });
        }
    }

    // [POST] /auth/logout
    async logout(req, res, next) {
        try {
            res.clearCookie('token', {
                httpOnly: true,
                secure: true,
                sameSite: 'None',
                path: '/',
            });
            return res.status(200).json({ message: 'Đăng xuất thành công' });
        } catch (error) {
            return res.status(500).json({ message: 'Có lỗi xảy ra. Vui lòng thử lại sau!!!' });
        }
    }

    // [GET] /auth/me
    async getMe(req, res, next) {
        try {
            const userId = req.user._id;
            const user = await User.findById(userId).select('-password');
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }
            return res.status(200).json({ user });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ message: 'Có lỗi xảy ra. Vui lòng thử lại sau!!!' });
        }
    }
}

module.exports = new AuthController();
