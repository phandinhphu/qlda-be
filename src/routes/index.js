// chứa route của các api
const express = require('express');
const route = express.Router();
const authRoutes = require('./auth');
const projectRoutes = require('./project');
const listRoutes = require('./list');
const taskRoutes = require('./task');
const tasksRoutes = require('./tasks');

route.use('/auth', authRoutes);
route.use('/projects', projectRoutes);
// Register task routes before list routes to ensure /lists/:listId/tasks matches before /lists/:listId
route.use('/lists', taskRoutes); // GET /api/lists/:listId/tasks, POST /api/lists/:listId/tasks, PUT /api/lists/:listId/tasks/reorder
route.use('/lists', listRoutes); // PUT /api/lists/:listId, DELETE /api/lists/:listId
route.use('/tasks', tasksRoutes); // PUT /api/tasks/:taskId, DELETE /api/tasks/:taskId, PATCH /api/tasks/:taskId/toggle-complete, PUT /api/tasks/:taskId/move

route.get('/', (req, res) => {
    res.send('API is running...');
});

module.exports = route;
