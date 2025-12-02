const express = require('express');
const router = express.Router();
const {
  createPatient,
  getPatients,
  getPatientById,
  updatePatient,
  deletePatient,
  getPatientHistory
} = require('../controllers/patientController');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/', authenticate, authorize('admin', 'receptionist', 'doctor'), createPatient);
router.get('/', authenticate, getPatients);
router.get('/:id', authenticate, getPatientById);
router.put('/:id', authenticate, authorize('admin', 'receptionist', 'doctor'), updatePatient);
router.delete('/:id', authenticate, authorize('admin'), deletePatient);
router.get('/:id/history', authenticate, getPatientHistory);

module.exports = router;

