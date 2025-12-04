const express = require('express');
const router = express.Router();
const {
  createProcedure,
  getProcedures,
  getProcedureById,
  updateProcedure,
  deleteProcedure
} = require('../controllers/procedureController');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/', authenticate, authorize('admin', 'receptionist', 'doctor'), createProcedure);
router.get('/', authenticate, getProcedures);
router.get('/:id', authenticate, getProcedureById);
router.put('/:id', authenticate, authorize('admin', 'receptionist', 'doctor'), updateProcedure);
router.delete('/:id', authenticate, authorize('admin', 'receptionist'), deleteProcedure);

module.exports = router;

