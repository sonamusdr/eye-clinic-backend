const express = require('express');
const router = express.Router();
const {
  createMedicalRecord,
  getMedicalRecords,
  getMedicalRecordById,
  updateMedicalRecord,
  deleteMedicalRecord
} = require('../controllers/medicalRecordController');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/', authenticate, authorize('admin', 'doctor'), createMedicalRecord);
router.get('/', authenticate, getMedicalRecords);
router.get('/:id', authenticate, getMedicalRecordById);
router.put('/:id', authenticate, authorize('admin', 'doctor'), updateMedicalRecord);
router.delete('/:id', authenticate, authorize('admin'), deleteMedicalRecord);

module.exports = router;

