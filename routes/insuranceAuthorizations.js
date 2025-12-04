const express = require('express');
const router = express.Router();
const {
  createInsuranceAuthorization,
  getInsuranceAuthorizations,
  getInsuranceAuthorizationById,
  updateInsuranceAuthorization,
  deleteInsuranceAuthorization
} = require('../controllers/insuranceAuthorizationController');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/', authenticate, authorize('admin', 'receptionist', 'doctor'), createInsuranceAuthorization);
router.get('/', authenticate, getInsuranceAuthorizations);
router.get('/:id', authenticate, getInsuranceAuthorizationById);
router.put('/:id', authenticate, authorize('admin', 'receptionist', 'doctor'), updateInsuranceAuthorization);
router.delete('/:id', authenticate, authorize('admin', 'receptionist'), deleteInsuranceAuthorization);

module.exports = router;

