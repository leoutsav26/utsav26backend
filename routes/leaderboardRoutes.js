const express = require('express');
const router = express.Router();

const {
  getLeaderboard,
  upsertScore,
  getWinners,
  completeEvent
} = require('../controllers/leaderboardController');

const { authMiddleware, requireRole } = require('../middleware/authMiddleware');

// Get leaderboard for an event
router.get('/:eventId', authMiddleware, getLeaderboard);

// Add or update score (UPSERT)
router.post('/:eventId', authMiddleware, requireRole('coordinator'), upsertScore);

// Get winners of event
router.get('/:eventId/winners', authMiddleware, getWinners);

// Complete event and set winners
router.post('/:eventId/complete', authMiddleware, requireRole('coordinator'), completeEvent);

module.exports = router;
