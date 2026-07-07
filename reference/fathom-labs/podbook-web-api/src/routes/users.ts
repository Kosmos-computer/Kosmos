import { Router } from 'express';
import { AuthRequest } from '../middleware/auth';

const { prisma } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

const router = Router();

// Get user profile
router.get('/profile', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        bio: true,
        website: true,
        avatar: true,
        role: true,
        subscriptionTier: true,
        credits: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update user profile
router.put('/profile', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user.id;
    const { name, bio, website } = req.body;

    // Validate required fields
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Name is required' });
    }

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name: name.trim(),
        bio: bio?.trim() || null,
        website: website?.trim() || null,
        updatedAt: new Date()
      },
      select: {
        id: true,
        name: true,
        email: true,
        bio: true,
        website: true,
        avatar: true,
        role: true,
        subscriptionTier: true,
        credits: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json({ 
      message: 'Profile updated successfully',
      user: updatedUser 
    });
  } catch (error) {
    console.error('Update user profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all users (admin only)
router.get('/', async (req, res) => {
  try {
    // TODO: Implement database query when Prisma is fully set up
    res.json({ message: 'Users endpoint - database integration pending', users: [] });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // TODO: Implement database query when Prisma is fully set up
    res.json({ message: `User ${id} endpoint - database integration pending`, user: null });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
