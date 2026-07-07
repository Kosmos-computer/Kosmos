const { Router } = require('express');
const { prisma } = require('../config/database');

const router = Router();

// Get all projects
router.get('/', async (req, res) => {
  try {
    // TODO: Implement database query when Prisma is fully set up
    res.json({ message: 'Projects endpoint - database integration pending', projects: [] });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get project by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // TODO: Implement database query when Prisma is fully set up
    res.json({ message: `Project ${id} endpoint - database integration pending`, project: null });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create new project
router.post('/', async (req, res) => {
  try {
    const { title, description, rssFeed, textContent } = req.body;
    
    // TODO: Implement database creation when Prisma is fully set up
    res.status(201).json({ 
      message: 'Project creation endpoint - database integration pending',
      project: { title, description, rssFeed, textContent, status: 'DRAFT' }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
