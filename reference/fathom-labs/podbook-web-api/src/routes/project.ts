const { Router } = require('express');
const { authMiddleware } = require('../middleware/auth');
const {
  saveProjectData,
  getProjectData,
  completeProjectSetup,
  listUserProjects
} = require('../controllers/project');

const router = Router();

// Save project data
router.post('/save', authMiddleware, saveProjectData);

// Get project data for a user
router.get('/:projectId', authMiddleware, getProjectData);

// List projects for current user
router.get('/', authMiddleware, listUserProjects);

// Mark project setup as completed
router.post('/:projectId/complete', authMiddleware, completeProjectSetup);

module.exports = router;
