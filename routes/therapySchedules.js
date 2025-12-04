const express = require('express');
const router = express.Router();
const {
  createTherapySchedule,
  getTherapySchedules,
  getTherapyScheduleById,
  updateTherapySchedule,
  deleteTherapySchedule
} = require('../controllers/therapyScheduleController');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/', authenticate, authorize('admin', 'receptionist', 'doctor'), createTherapySchedule);
router.get('/', authenticate, getTherapySchedules);
router.get('/:id', authenticate, getTherapyScheduleById);
router.put('/:id', authenticate, authorize('admin', 'receptionist', 'doctor'), updateTherapySchedule);
router.delete('/:id', authenticate, authorize('admin', 'receptionist'), deleteTherapySchedule);

module.exports = router;

