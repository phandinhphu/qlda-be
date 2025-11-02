const express = require('express');
const router = express.Router();
const ProjectController = require('../apis/controllers/ProjectController');

/**
 * @route   GET /api/projects/user/:userId
 * @desc    Lấy danh sách dự án của User cụ thể
 */
router.get('/user/:userId', ProjectController.getProjectsByUser);

module.exports = router;
