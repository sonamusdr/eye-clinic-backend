const express = require('express');
const router = express.Router();
const {
  createVideoSession,
  getVideoSession,
  endVideoSession
} = require('../controllers/telemedicineController');
const { authenticate } = require('../middleware/auth');

router.post('/sessions', authenticate, createVideoSession);
router.get('/sessions/:id', authenticate, getVideoSession);
router.patch('/sessions/:id/end', authenticate, endVideoSession);

module.exports = router;

