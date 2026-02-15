const express = require('express');
const router = express.Router();
const { listCoordinators, updateCoordinatorStatus } = require('../controllers/coordinatorsController');
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');

router.get('/coordinators', authMiddleware, requireRole('admin'), listCoordinators);
router.patch('/coordinators/:id/status', authMiddleware, requireRole('admin'), updateCoordinatorStatus);

module.exports = router;
