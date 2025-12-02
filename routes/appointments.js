const express = require('express');
const router = express.Router();
const {
  createAppointment,
  getAppointments,
  getAppointmentById,
  updateAppointment,
  cancelAppointment,
  getAvailableSlots,
  getDoctorSchedule
} = require('../controllers/appointmentController');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/', authenticate, authorize('admin', 'receptionist', 'doctor'), createAppointment);
router.get('/', authenticate, getAppointments);
router.get('/available-slots', authenticate, getAvailableSlots);
router.get('/doctor/:doctorId/schedule', authenticate, getDoctorSchedule);
router.get('/:id', authenticate, getAppointmentById);
router.put('/:id', authenticate, authorize('admin', 'receptionist', 'doctor'), updateAppointment);
router.patch('/:id/cancel', authenticate, cancelAppointment);

module.exports = router;

