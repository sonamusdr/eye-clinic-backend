const express = require('express');
const router = express.Router();
const {
  createStudyResult,
  getStudyResults,
  getStudyResultById,
  updateStudyResult,
  deleteStudyResult
} = require('../controllers/studyResultController');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/', authenticate, authorize('admin', 'receptionist', 'doctor'), createStudyResult);
router.get('/', authenticate, getStudyResults);
router.get('/:id', authenticate, getStudyResultById);
router.put('/:id', authenticate, authorize('admin', 'receptionist', 'doctor'), updateStudyResult);
router.delete('/:id', authenticate, authorize('admin', 'receptionist'), deleteStudyResult);

module.exports = router;

