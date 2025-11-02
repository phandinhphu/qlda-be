const express = require('express');
const router = express.Router();
const TaskController = require('../apis/controllers/TaskController.js');

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
 * @route [POST] /api/tasks/:id/comments
 * @dest thêm comments vào task
 */
router.post('/:id/comments', TaskController.addComment);
module.exports = router;
