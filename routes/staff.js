const express = require('express');
const router = express.Router();
const {
  getStaff,
  getStaffById,
  createStaff,
  updateStaff,
  deleteStaff,
  getDoctors
} = require('../controllers/staffController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, getStaff);
router.get('/doctors', authenticate, getDoctors);
router.get('/:id', authenticate, getStaffById);
router.post('/', authenticate, authorize('admin'), createStaff);
router.put('/:id', authenticate, authorize('admin'), updateStaff);
router.delete('/:id', authenticate, authorize('admin'), deleteStaff);

module.exports = router;

