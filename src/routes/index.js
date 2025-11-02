// chứa route của các api
const express = require('express');
const route = express.Router();
const authRoutes = require('./auth');
const listRoutes = require('./listRoutes');
const taskRoutes = require('./taskRoutes');
const projectRoutes = require('./projectRoutes');
route.use('/auth', authRoutes);
route.use('/lists', listRoutes);
route.use('/tasks', taskRoutes);
route.get('/', (req, res) => {
    res.send('API is running...');
});
route.use('/projects', projectRoutes);

module.exports = route;
