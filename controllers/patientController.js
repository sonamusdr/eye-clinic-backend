const { Patient, MedicalRecord, Appointment, Invoice, AuditLog } = require('../models');
const { Op } = require('sequelize');

exports.createPatient = async (req, res) => {
  try {
    const patient = await Patient.create(req.body);

    await AuditLog.create({
      userId: req.user.id,
      action: 'PATIENT_CREATED',
      entityType: 'Patient',
      entityId: patient.id,
      changes: req.body,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(201).json({
      success: true,
      patient
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getPatients = async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (search) {
      where[Op.or] = [
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { phone: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const { count, rows } = await Patient.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      patients: rows,
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

exports.getPatientById = async (req, res) => {
  try {
    const patient = await Patient.findByPk(req.params.id);
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    res.json({
      success: true,
      patient
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updatePatient = async (req, res) => {
  try {
    const patient = await Patient.findByPk(req.params.id);
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    const oldData = { ...patient.toJSON() };
    await patient.update(req.body);

    await AuditLog.create({
      userId: req.user.id,
      action: 'PATIENT_UPDATED',
      entityType: 'Patient',
      entityId: patient.id,
      changes: { old: oldData, new: req.body },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({
      success: true,
      patient
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deletePatient = async (req, res) => {
  try {
    const patient = await Patient.findByPk(req.params.id);
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    await patient.update({ isActive: false });

    await AuditLog.create({
      userId: req.user.id,
      action: 'PATIENT_DEACTIVATED',
      entityType: 'Patient',
      entityId: patient.id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({
      success: true,
      message: 'Patient deactivated successfully'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getPatientHistory = async (req, res) => {
  try {
    const patient = await Patient.findByPk(req.params.id);
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    const [appointments, medicalRecords, invoices] = await Promise.all([
      Appointment.findAll({
        where: { patientId: req.params.id },
        include: [{ model: require('../models').User, as: 'doctor', attributes: ['id', 'firstName', 'lastName'] }],
        order: [['appointmentDate', 'DESC']]
      }),
      MedicalRecord.findAll({
        where: { patientId: req.params.id },
        include: [{ model: require('../models').User, as: 'doctor', attributes: ['id', 'firstName', 'lastName'] }],
        order: [['visitDate', 'DESC']]
      }),
      Invoice.findAll({
        where: { patientId: req.params.id },
        order: [['createdAt', 'DESC']]
      })
    ]);

    res.json({
      success: true,
      history: {
        appointments,
        medicalRecords,
        invoices
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

