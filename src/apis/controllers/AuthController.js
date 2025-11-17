const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../../util/constants');
const sendEmail = require('../../util/email');
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

            if (user.password == null) {
                return res.status(400).json({ message: 'Vui lòng đăng nhập bằng phương thức khác' });
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
            console.error(error);
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

    async forgotPassword(req, res) {
        // 1. Tìm user
        const user = await User.findOne({ email: req.body.email });
        if (!user) {
            // Luôn trả về 200 (bảo mật, không cho biết email có tồn tại hay không)
            return res.status(200).json({ message: 'Link reset đã được gửi.' });
        }

        try {
            // 2. Tạo token
            const resetToken = user.createPasswordResetToken();
            await user.save({ validateBeforeSave: false }); // Lưu token (đã hash) và hạn dùng

            // 3. Gửi mail chứa token GỐC
            // ĐỔI LẠI URL NÀY thành URL của frontend
            const resetURL = `http://localhost:5173/reset-password/${resetToken}`;

            const message = `Vui lòng nhấp vào link sau để đặt lại mật khẩu (hiệu lực 10 phút): ${resetURL}`;

            await sendEmail({
                email: user.email,
                subject: 'Yêu cầu đặt lại mật khẩu',
                message: message,
            });

            res.status(200).json({ message: 'Link reset đã được gửi.' });
        } catch (err) {
            // Nếu lỗi, xóa token để user thử lại
            console.error('LỖI THẬT SỰ TRONG FORGOTPASSWORD:', err);

            // Lỗi của SendGrid thường nằm trong 'response.body'
            if (err.response) {
                console.error('CHI TIẾT LỖI TỪ SENDGRID:', err.response.body);
            }
            user.passwordResetToken = null;
            user.passwordResetExpires = null;
            await user.save({ validateBeforeSave: false });
            res.status(500).json({ message: 'Lỗi gửi email, vui lòng thử lại.' });
        }
    }

    // [POST] /api/auth/reset-password/:token
    async resetPassword(req, res) {
        try {
            // 1. Hash token GỐC từ URL
            const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

            // 2. Tìm user bằng token (đã hash) và chưa hết hạn
            const user = await User.findOne({
                passwordResetToken: hashedToken,
                passwordResetExpires: { $gt: Date.now() }, // $gt = Lớn hơn (còn hạn)
            });

            // 3. Nếu token sai hoặc hết hạn
            if (!user) {
                return res.status(400).json({ message: 'Token không hợp lệ hoặc đã hết hạn.' });
            }

            // 4. Cập nhật mật khẩu
            user.password = await bcrypt.hash(req.body.password, 10);

            // 5. Xóa token
            user.passwordResetToken = null;
            user.passwordResetExpires = null;
            await user.save();

            res.status(200).json({ message: 'Đặt lại mật khẩu thành công!' });
        } catch (error) {
            res.status(500).json({ message: 'Có lỗi xảy ra.' });
        }
    }
}

module.exports = new AuthController();
