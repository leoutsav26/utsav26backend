const express = require('express');
const router = express.Router();
const {
  getCoordinatorsByEvent,
  getMyEventIds,
  join,
  leaveById,
  leaveByEventId,
  listCoordinators,
  updateCoordinatorStatus,
} = require('../controllers/coordinatorsController');
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');

router.get('/me', authMiddleware, getMyEventIds);
router.post('/', authMiddleware, requireRole('coordinator'), join);
router.delete('/:id', authMiddleware, leaveById);
router.delete('/', authMiddleware, leaveByEventId);

module.exports = router;
