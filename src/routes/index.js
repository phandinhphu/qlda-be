// chứa route của các api
const express = require('express');
const route = express.Router();
const authRoutes = require('./auth');

route.use('/auth', authRoutes);

route.get('/', (req, res) => {
    res.send('API is running...');
});

module.exports = route;
