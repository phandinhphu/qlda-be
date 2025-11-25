const jwt = require('jsonwebtoken');
const userSchema = require('../apis/models/User');
const { JWT_SECRET } = require('../util/constants');

module.exports = async (req, res, next) => {
    // Get token from cookie or Authorization header
    let token = req.cookies.token;
    if (!token && req.headers['authorization']) {
        const authHeader = req.headers['authorization'];
        const parts = authHeader.split(' ');
        token = parts.length === 2 ? parts[1] : null;
    }

    if (!token) {
        return res.status(401).json({ message: 'No token provided' });
    }

    try {
        // Verify the token
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = await userSchema.findById(decoded.id).select('-password');

        if (!req.user) {
            return res.status(404).json({ message: 'User not found' });
        }

        next(); // Proceed to the next middleware or route handler
    } catch (error) {
        // JWT verification errors (expired, invalid) should return 401, not 500
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token không hợp lệ hoặc đã hết hạn' });
        }
        // Other errors (database, etc.) return 500
        return res.status(500).json({
            message: 'Có lỗi xảy ra. Vui lòng thử lại sau!',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
};
