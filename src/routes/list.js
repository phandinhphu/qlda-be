const express = require('express');
const route = express.Router();
const ListController = require('../apis/controllers/ListController');
const authMiddleware = require('../middleware/auth');

// All routes require authentication
// Routes for individual lists: PUT /api/lists/:listId, DELETE /api/lists/:listId
route.put('/:listId', authMiddleware, ListController.updateList);
route.delete('/:listId', authMiddleware, ListController.deleteList);

module.exports = route;
