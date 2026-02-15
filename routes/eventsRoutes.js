const express = require('express');
const router = express.Router();
const { getAll, getById, create, update, updateStatus, getPasses } = require('../controllers/eventsController');
const { getByEvent } = require('../controllers/participationsController');
const { getCoordinatorsByEvent } = require('../controllers/coordinatorsController');
const { getLeaderboard, upsertScore, getWinners, completeEvent } = require('../controllers/leaderboardController');
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');

router.get('/', getAll);
router.get('/:eventId/participations', authMiddleware, getByEvent);
router.get('/:eventId/coordinators', getCoordinatorsByEvent);
router.get('/:eventId/leaderboard', authMiddleware, getLeaderboard);
router.patch('/:eventId/leaderboard', authMiddleware, requireRole('admin', 'coordinator'), upsertScore);
router.get('/:eventId/winners', authMiddleware, getWinners);
router.patch('/:eventId/complete', authMiddleware, requireRole('admin'), completeEvent);
router.get('/:eventId/passes', getPasses);
router.get('/:id', getById);
router.post('/', authMiddleware, requireRole('admin'), create);
router.put('/:id', authMiddleware, requireRole('admin'), update);
router.patch('/:id/status', authMiddleware, requireRole('admin'), updateStatus);

module.exports = router;
