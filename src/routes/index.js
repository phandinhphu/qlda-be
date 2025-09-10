// chứa route của các api
const express = require('express');
const route = express.Router();

route.get('/', (req, res) => {
    res.send('API is running...');
});

module.exports = route;
