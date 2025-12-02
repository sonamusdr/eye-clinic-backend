const { Appointment, Patient, User, Notification, AuditLog } = require('../models');
const { Op } = require('sequelize');
const moment = require('moment');
const { sendEmail, sendSMS } = require('../utils/notifications');

exports.createAppointment = async (req, res) => {
  try {
    const { patientId, doctorId, appointmentType, appointmentDate, startTime, endTime, reason } = req.body;

    // Check for conflicts
    const conflict = await Appointment.findOne({
      where: {
        doctorId,
        appointmentDate: moment(appointmentDate).format('YYYY-MM-DD'),
        [Op.or]: [
          {
            startTime: { [Op.between]: [startTime, endTime] }
          },
          {
            endTime: { [Op.between]: [startTime, endTime] }
          }
        ],
        status: { [Op.notIn]: ['cancelled', 'no_show'] }
      }
    });

    if (conflict) {
      return res.status(400).json({ message: 'Time slot is already booked' });
    }

    const appointment = await Appointment.create({
      patientId,
      doctorId,
      appointmentType,
      appointmentDate,
      startTime,
      endTime,
      reason,
      status: 'scheduled'
    });

    const patient = await Patient.findByPk(patientId);
    const doctor = await User.findByPk(doctorId);

    // Create notifications
    await Notification.create({
      userId: doctorId,
      type: 'appointment_reminder',
      title: 'New Appointment Scheduled',
      message: `New appointment with ${patient.firstName} ${patient.lastName} on ${moment(appointmentDate).format('MMM DD, YYYY')} at ${startTime}`,
      link: `/appointments/${appointment.id}`
    });

    // Send reminder email/SMS
    if (patient.email) {
      await sendEmail(patient.email, 'Appointment Scheduled', {
        patientName: `${patient.firstName} ${patient.lastName}`,
        doctorName: `${doctor.firstName} ${doctor.lastName}`,
        date: moment(appointmentDate).format('MMMM DD, YYYY'),
        time: startTime
      });
    }

    await AuditLog.create({
      userId: req.user.id,
      action: 'APPOINTMENT_CREATED',
      entityType: 'Appointment',
      entityId: appointment.id,
      changes: req.body,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(201).json({
      success: true,
      appointment
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAppointments = async (req, res) => {
  try {
    const { date, doctorId, patientId, status, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (date) {
      where.appointmentDate = moment(date).format('YYYY-MM-DD');
    }
    if (doctorId) {
      where.doctorId = doctorId;
    }
    if (patientId) {
      where.patientId = patientId;
    }
    if (status) {
      where.status = status;
    }

    // If user is a doctor, only show their appointments
    if (req.user.role === 'doctor') {
      where.doctorId = req.user.id;
    }

    const { count, rows } = await Appointment.findAndCountAll({
      where,
      include: [
        { model: Patient, attributes: ['id', 'firstName', 'lastName', 'phone', 'email'] },
        { model: User, as: 'doctor', attributes: ['id', 'firstName', 'lastName', 'specialization'] }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['appointmentDate', 'ASC'], ['startTime', 'ASC']]
    });

    res.json({
      success: true,
      appointments: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAppointmentById = async (req, res) => {
  try {
    const appointment = await Appointment.findByPk(req.params.id, {
      include: [
        { model: Patient },
        { model: User, as: 'doctor' }
      ]
    });

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    res.json({
      success: true,
      appointment
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findByPk(req.params.id);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    const oldData = { ...appointment.toJSON() };
    await appointment.update(req.body);

    await AuditLog.create({
      userId: req.user.id,
      action: 'APPOINTMENT_UPDATED',
      entityType: 'Appointment',
      entityId: appointment.id,
      changes: { old: oldData, new: req.body },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({
      success: true,
      appointment
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.cancelAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findByPk(req.params.id, {
      include: [{ model: Patient }]
    });

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    await appointment.update({ status: 'cancelled' });

    // Notify patient
    if (appointment.Patient.email) {
      await sendEmail(appointment.Patient.email, 'Appointment Cancelled', {
        patientName: `${appointment.Patient.firstName} ${appointment.Patient.lastName}`,
        date: moment(appointment.appointmentDate).format('MMMM DD, YYYY'),
        time: appointment.startTime
      });
    }

    await AuditLog.create({
      userId: req.user.id,
      action: 'APPOINTMENT_CANCELLED',
      entityType: 'Appointment',
      entityId: appointment.id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({
      success: true,
      message: 'Appointment cancelled successfully'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAvailableSlots = async (req, res) => {
  try {
    const { doctorId, date } = req.query;
    if (!doctorId || !date) {
      return res.status(400).json({ message: 'Doctor ID and date are required' });
    }

    const bookedSlots = await Appointment.findAll({
      where: {
        doctorId,
        appointmentDate: moment(date).format('YYYY-MM-DD'),
        status: { [Op.notIn]: ['cancelled', 'no_show'] }
      },
      attributes: ['startTime', 'endTime']
    });

    // Generate available slots (9 AM to 5 PM, 30-minute intervals)
    const availableSlots = [];
    const startHour = 9;
    const endHour = 17;
    const interval = 30; // minutes

    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += interval) {
        const slotStart = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;
        const slotEnd = minute + interval >= 60 
          ? `${(hour + 1).toString().padStart(2, '0')}:${((minute + interval) % 60).toString().padStart(2, '0')}:00`
          : `${hour.toString().padStart(2, '0')}:${(minute + interval).toString().padStart(2, '0')}:00`;

        const isBooked = bookedSlots.some(slot => {
          return (slotStart >= slot.startTime && slotStart < slot.endTime) ||
                 (slotEnd > slot.startTime && slotEnd <= slot.endTime);
        });

        if (!isBooked) {
          availableSlots.push({ startTime: slotStart, endTime: slotEnd });
        }
      }
    }

    res.json({
      success: true,
      availableSlots
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getDoctorSchedule = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { startDate, endDate } = req.query;

    const where = { doctorId };
    if (startDate && endDate) {
      where.appointmentDate = {
        [Op.between]: [startDate, endDate]
      };
    }

    const appointments = await Appointment.findAll({
      where,
      include: [
        { model: Patient, attributes: ['id', 'firstName', 'lastName', 'phone'] }
      ],
      order: [['appointmentDate', 'ASC'], ['startTime', 'ASC']]
    });

    res.json({
      success: true,
      schedule: appointments
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

