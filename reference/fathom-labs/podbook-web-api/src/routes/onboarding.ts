const { Router } = require('express');
const { authMiddleware } = require('../middleware/auth');
const {
  saveOnboardingData,
  getOnboardingData,
  completeOnboarding
} = require('../controllers/onboarding');

const router = Router();

// Save onboarding data
router.post('/save', authMiddleware, saveOnboardingData);

// Get onboarding data for a user
router.get('/get', authMiddleware, getOnboardingData);

// Mark onboarding as completed
router.post('/complete', authMiddleware, completeOnboarding);

module.exports = router;
