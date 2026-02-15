const express = require('express');
const router = express.Router();
const { getByEvent, getAll, create, remove, update } = require('../controllers/participationsController');
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');

router.get('/', authMiddleware, getAll);
router.post('/', authMiddleware, create);
router.delete('/:id', authMiddleware, remove);
router.patch('/:id', authMiddleware, update);

module.exports = router;
