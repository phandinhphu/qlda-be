// chứa route của các api
const express = require('express');
const route = express.Router();
const authRoutes = require('./auth');
const projectRoutes = require('./project');

route.use('/auth', authRoutes);
route.use('/projects', projectRoutes);

route.get('/', (req, res) => {
    res.send('API is running...');
});

module.exports = route;
