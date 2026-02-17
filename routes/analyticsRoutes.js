const express = require('express');
const router = express.Router();
const { recordVisit, getVisits } = require('../controllers/analyticsController');
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');

router.post('/visit', recordVisit);
router.get('/', authMiddleware, requireRole('admin'), getVisits);

module.exports = router;
