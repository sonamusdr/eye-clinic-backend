const { AppointmentLink, Appointment, Patient, User } = require('../models');
const { Op } = require('sequelize');
const moment = require('moment');
const crypto = require('crypto');

// Generate appointment scheduling link
exports.generateLink = async (req, res) => {
  try {
    const { doctorId, maxUses = 1, expiresInDays = 90 } = req.body;

    // Validate doctor if provided
    if (doctorId) {
      const doctor = await User.findOne({ where: { id: doctorId, role: 'doctor' } });
      if (!doctor) {
        return res.status(404).json({ message: 'Doctor not found' });
      }
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresDate = new Date();
    expiresDate.setDate(expiresDate.getDate() + expiresInDays);

    const link = await AppointmentLink.create({
      token,
      doctorId: doctorId || null,
      maxUses: parseInt(maxUses),
      expiresAt: expiresDate
    });

    const frontendUrl = process.env.FRONTEND_URL || 'https://eyeclinic.aledsystems.com';
    const linkUrl = `${frontendUrl}/schedule-appointment/${token}`;

    res.json({
      success: true,
      link: linkUrl,
      token: link.token,
      expiresAt: link.expiresAt,
      maxUses: link.maxUses
    });
  } catch (error) {
    console.error('Error generating appointment link:', error);
    res.status(500).json({ message: 'Error al generar el link de programación' });
  }
};

// Get link info (public endpoint)
exports.getLinkInfo = async (req, res) => {
  try {
    const { token } = req.params;

    const link = await AppointmentLink.findOne({
      where: { token },
      include: [
        { model: User, as: 'doctor', attributes: ['id', 'firstName', 'lastName', 'specialization'] }
      ]
    });

    if (!link) {
      return res.status(404).json({ message: 'Link no encontrado' });
    }

    if (!link.isActive) {
      return res.status(400).json({ message: 'Este link ya no está activo' });
    }

    if (link.expiresAt && new Date() > new Date(link.expiresAt)) {
      return res.status(400).json({ message: 'Este link ha expirado' });
    }

    if (link.currentUses >= link.maxUses) {
      return res.status(400).json({ message: 'Este link ha alcanzado el límite de uso' });
    }

    // Get all doctors if no specific doctor
    let doctors = [];
    if (!link.doctorId) {
      doctors = await User.findAll({
        where: { role: 'doctor', isActive: true },
        attributes: ['id', 'firstName', 'lastName', 'specialization']
      });
    }

    res.json({
      success: true,
      link: {
        id: link.id,
        doctorId: link.doctorId,
        doctor: link.doctor,
        doctors: doctors,
        expiresAt: link.expiresAt,
        maxUses: link.maxUses,
        currentUses: link.currentUses
      }
    });
  } catch (error) {
    console.error('Error getting link info:', error);
    res.status(500).json({ message: 'Error al cargar la información del link' });
  }
};

// Get available time slots for a doctor and date
exports.getAvailableSlots = async (req, res) => {
  try {
    const { token } = req.params;
    const { doctorId, date } = req.query;

    if (!doctorId || !date) {
      return res.status(400).json({ message: 'Doctor ID y fecha son requeridos' });
    }

    // Verify link is valid
    const link = await AppointmentLink.findOne({ where: { token } });
    if (!link || !link.isActive || (link.expiresAt && new Date() > new Date(link.expiresAt))) {
      return res.status(400).json({ message: 'Link inválido o expirado' });
    }

    // Get booked appointments for this doctor and date
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
    const interval = 30;

    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += interval) {
        const slotStart = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;
        const slotEnd = minute + interval >= 60 
          ? `${(hour + 1).toString().padStart(2, '0')}:${((minute + interval) % 60).toString().padStart(2, '0')}:00`
          : `${hour.toString().padStart(2, '0')}:${(minute + interval).toString().padStart(2, '0')}:00`;

        // Check if slot is available
        const isBooked = bookedSlots.some(booked => {
          const bookedStart = moment(booked.startTime, 'HH:mm:ss');
          const bookedEnd = moment(booked.endTime, 'HH:mm:ss');
          const slotStartMoment = moment(slotStart, 'HH:mm:ss');
          const slotEndMoment = moment(slotEnd, 'HH:mm:ss');

          return (slotStartMoment.isBefore(bookedEnd) && slotEndMoment.isAfter(bookedStart));
        });

        if (!isBooked) {
          availableSlots.push({
            startTime: slotStart,
            endTime: slotEnd,
            displayTime: moment(slotStart, 'HH:mm:ss').format('h:mm A')
          });
        }
      }
    }

    res.json({
      success: true,
      availableSlots
    });
  } catch (error) {
    console.error('Error getting available slots:', error);
    res.status(500).json({ message: 'Error al obtener horarios disponibles' });
  }
};

// Schedule appointment via link (public endpoint)
exports.scheduleAppointment = async (req, res) => {
  try {
    const { token } = req.params;
    const { doctorId, appointmentDate, startTime, endTime, appointmentType, reason, patientInfo } = req.body;

    // Verify link
    const link = await AppointmentLink.findOne({ where: { token } });
    if (!link) {
      return res.status(404).json({ message: 'Link no encontrado' });
    }

    if (!link.isActive) {
      return res.status(400).json({ message: 'Este link ya no está activo' });
    }

    if (link.expiresAt && new Date() > new Date(link.expiresAt)) {
      return res.status(400).json({ message: 'Este link ha expirado' });
    }

    if (link.currentUses >= link.maxUses) {
      return res.status(400).json({ message: 'Este link ha alcanzado el límite de uso' });
    }

    // Validate doctor
    const doctor = await User.findOne({ where: { id: doctorId, role: 'doctor', isActive: true } });
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor no encontrado' });
    }

    // If link has a specific doctor, verify it matches
    if (link.doctorId && link.doctorId !== doctorId) {
      return res.status(400).json({ message: 'Este link es para un doctor diferente' });
    }

    // Check for time conflicts
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
      return res.status(400).json({ message: 'Este horario ya está ocupado. Por favor seleccione otro.' });
    }

    // Find or create patient
    let patient = null;
    if (patientInfo && patientInfo.email) {
      patient = await Patient.findOne({ where: { email: patientInfo.email } });
    } else if (patientInfo && patientInfo.phone) {
      patient = await Patient.findOne({ where: { phone: patientInfo.phone } });
    }

    if (!patient && patientInfo) {
      // Create new patient
      patient = await Patient.create({
        firstName: patientInfo.firstName,
        lastName: patientInfo.lastName,
        dateOfBirth: patientInfo.dateOfBirth || new Date(),
        gender: patientInfo.gender || 'other',
        email: patientInfo.email,
        phone: patientInfo.phone,
        address: patientInfo.address,
        city: patientInfo.city,
        state: patientInfo.state,
        zipCode: patientInfo.zipCode
      });
    }

    if (!patient) {
      return res.status(400).json({ message: 'Información del paciente es requerida' });
    }

    // Create appointment
    const appointment = await Appointment.create({
      patientId: patient.id,
      doctorId,
      appointmentType: appointmentType || 'consultation',
      appointmentDate,
      startTime,
      endTime,
      reason: reason || 'Cita programada por el paciente',
      status: 'scheduled'
    });

    // Update link usage
    await link.update({ currentUses: link.currentUses + 1 });

    res.json({
      success: true,
      message: 'Cita programada exitosamente',
      appointment: {
        id: appointment.id,
        appointmentDate: appointment.appointmentDate,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        doctor: {
          firstName: doctor.firstName,
          lastName: doctor.lastName
        },
        patient: {
          firstName: patient.firstName,
          lastName: patient.lastName
        }
      }
    });
  } catch (error) {
    console.error('Error scheduling appointment:', error);
    res.status(500).json({ message: 'Error al programar la cita', error: error.message });
  }
};

