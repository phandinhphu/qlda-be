const express = require('express');
const router = express.Router();
const TaskController = require('../apis/controllers/TaskController.js');
const verifyToken = require('../middleware/auth.js');
const upload = require('../middleware/upload.js');

router.use(verifyToken);

/**
 * @route   [POST] /api/tasks
 * @desc    Tạo một task mới
 */
router.post('/', TaskController.createTask);

/**
 * @route   [GET] /api/tasks/list/:list_id
 * @desc    Lấy tất cả task thuộc về một List
 */
router.get('/list/:list_id', TaskController.getTasksByList);

/**
 * @route   [GET] /api/tasks/:taskId/members
 * @desc    Lấy danh sách thành viên của task
 */
router.get('/:taskId/members', TaskController.getTaskMembers);

/**
 * @route   [POST] /api/tasks/:taskId/members
 * @desc    Gán thành viên vào task
 */
router.post('/:taskId/members', TaskController.addTaskMember);

/**
 * @route   [DELETE] /api/tasks/:taskId/members/:userId
 * @desc    Xóa thành viên khỏi task
 */
router.delete('/:taskId/members/:userId', TaskController.removeTaskMember);

/**
 * @route   [GET] /api/tasks/:id
 * @desc    Lấy chi tiết một task
 */
router.get('/:id', TaskController.getTaskById);

/**
 * @route   [PUT] /api/tasks/:id
 * @desc    Cập nhật một task
 */
router.put('/:id', TaskController.updateTask);

/**
 * @route   [DELETE] /api/tasks/:id
 * @desc    Xóa một task
 */
router.delete('/:id', TaskController.deleteTask);

/**
 * @route [POST] /api/tasks/:id/steps
 * @dest thêm step vào task
 */
router.post('/:id/steps', TaskController.addStep);

/**
 * @route [POST] /api/tasks/:id/labels
 * @dest thêm labels vào task
 */
router.post('/:id/labels', TaskController.addLabel);

/**
 * @route [GET] /api/tasks/:taskId/labels
 * @desc Lấy danh sách labels của task
 */
router.get('/:taskId/labels', TaskController.getTaskLabels);

/**
 * @route [PUT] /api/tasks/:taskId/labels/:labelId
 * @desc Cập nhật label (tên, màu)
 */
router.put('/:taskId/labels/:labelId', TaskController.updateLabel);

/**
 * @route [DELETE] /api/tasks/:taskId/labels/:labelId
 * @desc Xóa label khỏi task
 */
router.delete('/:taskId/labels/:labelId', TaskController.deleteLabel);

/**
 * @route [POST] /api/tasks/:id/comments
 * @dest thêm comments vào task
 */
router.post('/:id/comments', TaskController.addComment);

/**
 * @route [GET] /api/tasks/:taskId/steps
 * @desc  Lấy tất cả các bước (steps) của task
 */
router.get('/:taskId/steps', TaskController.getTaskSteps);

/**
 * @route [PATCH] /api/tasks/:taskId/steps/:stepId/toggle-complete
 * @desc  Đánh dấu hoàn thành/chưa hoàn thành một bước (step) của task
 */
router.patch('/:taskId/steps/:stepId/toggle-completed', TaskController.toggleStepComplete);

/**
 * @route [POST] /api/tasks/:taskId/uploads
 * @dest thực hiện uploads file
 */
router.post('/:taskId/uploads', upload.single('file'), TaskController.uploadFile);

/**
 * @route [GET] /api/tasks/:taskId/files
 * @dest lấy các file của task
 */
router.get('/:taskId/files', TaskController.getTaskFiles);

module.exports = router;
