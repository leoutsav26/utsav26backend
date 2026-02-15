const express = require('express');
const router = express.Router();
const { create, getSummary } = require('../controllers/paymentsController');
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');

router.post('/', authMiddleware, create);
router.get('/summary', authMiddleware, requireRole('admin'), getSummary);

module.exports = router;
