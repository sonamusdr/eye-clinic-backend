const express = require('express');
const router = express.Router();
const {
  getPatientReport,
  getFinancialReport,
  getOperationalReport,
  getAppointmentStats,
  getPatientsReport,
  getStaffReport,
  getInventoryReport,
  getAppointmentsReport
} = require('../controllers/reportController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/patients/:patientId', authenticate, getPatientReport);
router.get('/patients', authenticate, getPatientsReport);
router.get('/financial', authenticate, authorize('admin', 'receptionist'), getFinancialReport);
router.get('/operational', authenticate, authorize('admin'), getOperationalReport);
router.get('/appointments/stats', authenticate, getAppointmentStats);
router.get('/appointments', authenticate, getAppointmentsReport);
router.get('/staff', authenticate, getStaffReport);
router.get('/inventory', authenticate, getInventoryReport);

module.exports = router;

