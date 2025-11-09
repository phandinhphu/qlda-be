const express = require('express');
const router = express.Router();
const UserController = require('../apis/controllers/UserController'); // Giả sử
const authMiddleware = require('../middleware/auth');

router.get('/me/stats', authMiddleware, UserController.getUserStats);
module.exports = router;
