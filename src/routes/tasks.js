const express = require('express');
const route = express.Router();
const TaskController = require('../apis/controllers/TaskController');
const authMiddleware = require('../middleware/auth');

// All routes require authentication
// Routes for individual tasks: /api/tasks/:taskId
route.put('/:taskId', authMiddleware, TaskController.updateTask);
route.delete('/:taskId', authMiddleware, TaskController.deleteTask);
route.patch('/:taskId/toggle-complete', authMiddleware, TaskController.toggleTaskComplete);
route.put('/:taskId/move', authMiddleware, TaskController.moveTask);

module.exports = route;
