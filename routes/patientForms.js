const express = require('express');
const router = express.Router();
const {
  generateFormLink,
  generateRegistrationFormLink,
  getFormByToken,
  submitForm,
  getFormStatus
} = require('../controllers/patientFormController');
const { authenticate, authorize } = require('../middleware/auth');

// Public routes (no authentication required)
router.get('/public/:token', getFormByToken);
router.post('/public/:token/submit', submitForm);

// Protected routes (staff only)
router.get('/appointment/:appointmentId/link', authenticate, generateFormLink);
router.get('/appointment/:appointmentId/status', authenticate, getFormStatus);
router.post('/patient/:patientId/registration-link', authenticate, authorize('admin', 'receptionist'), generateRegistrationFormLink);

module.exports = router;

