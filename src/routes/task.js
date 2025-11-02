const express = require('express');
const route = express.Router();
const TaskController = require('../apis/controllers/TaskController');
const authMiddleware = require('../middleware/auth');

// All routes require authentication
// Routes for list-specific tasks: /api/lists/:listId/tasks
route.get('/:listId/tasks', authMiddleware, TaskController.getTasksByList);
route.post('/:listId/tasks', authMiddleware, TaskController.createTask);
route.put('/:listId/tasks/reorder', authMiddleware, TaskController.reorderTasks);

module.exports = route;
