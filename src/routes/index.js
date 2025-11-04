// chứa route của các api
const express = require('express');
const route = express.Router();
const authRoutes = require('./auth');
const listRoutes = require('./listRoutes');
const taskRoutes = require('./taskRoutes');
const projectRoutes = require('./projectRoutes');
const projectMemberRoutes = require('./projectMemberRoutes');
route.use('/auth', authRoutes);
route.use('/lists', listRoutes);
route.use('/tasks', taskRoutes);
route.use('/projects', projectRoutes);
route.get('/', (req, res) => {
    res.send('API is running...');
});
route.use('/projects', projectRoutes);
route.use('/project_member', projectMemberRoutes);
module.exports = route;
