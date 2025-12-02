const express = require('express');
const router = express.Router();
const {
  getPatientReport,
  getFinancialReport,
  getOperationalReport,
  getAppointmentStats
} = require('../controllers/reportController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/patients/:patientId', authenticate, getPatientReport);
router.get('/financial', authenticate, authorize('admin', 'receptionist'), getFinancialReport);
router.get('/operational', authenticate, authorize('admin'), getOperationalReport);
router.get('/appointments/stats', authenticate, getAppointmentStats);

module.exports = router;

