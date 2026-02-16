const express = require('express');
const router = express.Router();
const { listCoordinators, updateCoordinatorStatus } = require('../controllers/coordinatorsController');
const { createUser } = require('../controllers/authController');
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');

router.get('/coordinators', authMiddleware, requireRole('admin'), listCoordinators);
router.patch('/coordinators/:id/status', authMiddleware, requireRole('admin'), updateCoordinatorStatus);
router.post(/^\/?$/, authMiddleware, requireRole('admin'), createUser);

module.exports = router;
