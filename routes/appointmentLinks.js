const express = require('express');
const router = express.Router();
const {
  generateLink,
  getLinkInfo,
  getAvailableSlots,
  scheduleAppointment
} = require('../controllers/appointmentLinkController');
const { authenticate, authorize } = require('../middleware/auth');

// Public routes (no authentication required)
router.get('/public/:token', getLinkInfo);
router.get('/public/:token/slots', getAvailableSlots);
router.post('/public/:token/schedule', scheduleAppointment);

// Protected routes (staff only)
router.post('/generate', authenticate, authorize('admin', 'receptionist'), generateLink);

module.exports = router;

