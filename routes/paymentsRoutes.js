const express = require('express');
const router = express.Router();

const { create, getSummary } = require('../controllers/paymentsController');
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');
const { authss } = require('../middleware/authss');
const upload = require('../middleware/upload');

router.post(
  '/',
  authss,
  upload.single("screenshot"),
  create
);

router.get(
  '/summary',
  authMiddleware,
  requireRole('admin'),
  getSummary
);

module.exports = router;
