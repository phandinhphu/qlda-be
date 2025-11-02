const express = require('express');
const route = express.Router();
const ProjectController = require('../apis/controllers/ProjectController');
// const authMiddleware = require('../middleware/auth'); // TODO: Sẽ thêm sau khi có authentication

// Public routes (tạm thời, sau sẽ thêm authMiddleware)
route.get('/', ProjectController.getAllProjects);
route.get('/:id', ProjectController.getProjectById);
route.post('/', ProjectController.createProject);
route.put('/:id', ProjectController.updateProject);
route.delete('/:id', ProjectController.deleteProject);

// Protected routes (sau khi có authentication)
// route.get('/', authMiddleware, ProjectController.getAllProjects);
// route.get('/:id', authMiddleware, ProjectController.getProjectById);
// route.post('/', authMiddleware, ProjectController.createProject);
// route.put('/:id', authMiddleware, ProjectController.updateProject);
// route.delete('/:id', authMiddleware, ProjectController.deleteProject);

module.exports = route;
