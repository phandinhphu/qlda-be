const mongoose = require('mongoose');
const crypto = require('crypto');
const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        password: {
            type: String,
            default: null,
        },
        avatar_url: {
            type: String,
            default: null,
        },
        googleId: {
            type: String,
            default: null,
        },
        passwordResetToken: {
            type: String,
            default: null,
        },
        passwordResetExpires: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
        collection: 'users',
    },
);

userSchema.methods.createPasswordResetToken = function () {
    // 1. Tạo token gốc (gửi cho user)
    const resetToken = crypto.randomBytes(32).toString('hex');

    // 2. Hash token này để lưu vào DB (bảo mật)
    this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    // 3. Đặt thời gian hết hạn (ví dụ: 10 phút)
    this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

    // 4. Trả về token GỐC
    return resetToken;
};
module.exports = mongoose.model('User', userSchema);
