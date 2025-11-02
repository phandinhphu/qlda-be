const express = require('express');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const route = express.Router();
const AuthController = require('../apis/controllers/AuthController');
const authMiddleware = require('../middleware/auth');
const { JWT_SECRET, JWT_EXPIRES_IN, FRONTEND_URL } = require('../util/constants');

route.post('/register', AuthController.register);
route.post('/login', AuthController.login);
route.post('/logout', AuthController.logout);
route.get('/me', authMiddleware, AuthController.getMe);

// Google authentication
route.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// Google callback
route.get('/google/callback', passport.authenticate('google', { session: false }), (req, res) => {
    const token = jwt.sign({ id: req.user._id }, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN,
    });
    res.cookie('token', token, {
        httpOnly: true, // Không cho JS truy cập
        secure: true,
        sameSite: 'None',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
    });
    res.redirect(`${FRONTEND_URL}/`);
});

route.post('/forgot-password', AuthController.forgotPassword);
route.post('/reset-password/:token', AuthController.resetPassword);
module.exports = route;
