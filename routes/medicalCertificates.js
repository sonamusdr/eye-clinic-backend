const express = require('express');
const router = express.Router();
const {
  createMedicalCertificate,
  getMedicalCertificates,
  getMedicalCertificateById,
  updateMedicalCertificate,
  deleteMedicalCertificate
} = require('../controllers/medicalCertificateController');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/', authenticate, authorize('admin', 'receptionist', 'doctor'), createMedicalCertificate);
router.get('/', authenticate, getMedicalCertificates);
router.get('/:id', authenticate, getMedicalCertificateById);
router.put('/:id', authenticate, authorize('admin', 'receptionist', 'doctor'), updateMedicalCertificate);
router.delete('/:id', authenticate, authorize('admin', 'receptionist'), deleteMedicalCertificate);

module.exports = router;

