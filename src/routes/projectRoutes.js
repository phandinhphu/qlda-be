const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const ListController = require('../apis/controllers/ListController');
const ProjectController = require('../apis/controllers/ProjectController');

/**
 * @route   GET /api/projects/projecstUserJoined
 * @desc    Lấy danh sách dự án mà user tạo
 */
router.get('/projectsUserJoined', authMiddleware, ProjectController.getProjectsUserJoined);
/**
 * @route   GET /api/projects/user/:userId
 * @desc    Lấy danh sách dự án mà user tạo
 */
router.get('/user/:userId', ProjectController.getProjectsByUser);

/**
 * @route   GET /api/projects/search
 * @desc    Tìm kiếm dự án theo tên
 */
router.get('/search', authMiddleware, ProjectController.searchProjectsByName);

router.get('/', authMiddleware, ProjectController.getAllProjects);
router.post('/', authMiddleware, ProjectController.createProject);

// Nested list routes: /api/projects/:projectId/lists
// Must be defined BEFORE /:id route to avoid route conflicts
router.get('/:projectId/lists', authMiddleware, ListController.getListsByProject);
router.post('/:projectId/lists', authMiddleware, ListController.createList);
router.put('/:projectId/lists/reorder', authMiddleware, ListController.reorderLists);

// Individual project routes
router.get('/:id', ProjectController.getProjectById);
router.put('/:id', ProjectController.updateProject);
router.delete('/:id', ProjectController.deleteProject);
module.exports = router;
