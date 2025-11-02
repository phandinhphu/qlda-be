const express = require('express');
const route = express.Router();
const ProjectController = require('../apis/controllers/ProjectController');
const ListController = require('../apis/controllers/ListController');
const authMiddleware = require('../middleware/auth');

// Project routes
route.get('/', authMiddleware, ProjectController.getAllProjects);
route.post('/', authMiddleware, ProjectController.createProject);

// Nested list routes: /api/projects/:projectId/lists
// Must be defined BEFORE /:id route to avoid route conflicts
route.get('/:projectId/lists', authMiddleware, ListController.getListsByProject);
route.post('/:projectId/lists', authMiddleware, ListController.createList);
route.put('/:projectId/lists/reorder', authMiddleware, ListController.reorderLists);

// Individual project routes
route.get('/:id', ProjectController.getProjectById);
route.put('/:id', ProjectController.updateProject);
route.delete('/:id', ProjectController.deleteProject);

module.exports = route;
