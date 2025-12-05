const { MedicalRecord, Patient, User, AuditLog } = require('../models');
const { Op } = require('sequelize');

exports.createMedicalRecord = async (req, res) => {
  try {
    const medicalRecord = await MedicalRecord.create({
      ...req.body,
      doctorId: req.user.id
    });

    await AuditLog.create({
      userId: req.user.id,
      action: 'MEDICAL_RECORD_CREATED',
      entityType: 'MedicalRecord',
      entityId: medicalRecord.id,
      changes: req.body,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(201).json({
      success: true,
      medicalRecord
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getMedicalRecords = async (req, res) => {
  try {
    const { patientId, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (patientId) {
      where.patientId = patientId;
    }

    // If user is a doctor, only show their records
    if (req.user.role === 'doctor') {
      where.doctorId = req.user.id;
    }

    const { count, rows } = await MedicalRecord.findAndCountAll({
      where,
      include: [
        { model: Patient, attributes: ['id', 'firstName', 'lastName'] },
        { model: User, as: 'doctor', attributes: ['id', 'firstName', 'lastName', 'specialization'] }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['visitDate', 'DESC']]
    });

    res.json({
      success: true,
      medicalRecords: rows,
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

exports.getMedicalRecordById = async (req, res) => {
  try {
    const medicalRecord = await MedicalRecord.findByPk(req.params.id, {
      include: [
        { model: Patient },
        { model: User, as: 'doctor' }
      ]
    });

    if (!medicalRecord) {
      return res.status(404).json({ message: 'Medical record not found' });
    }

    // Si el registro no tiene datos del paciente completos, intentar obtenerlos del paciente
    const recordData = medicalRecord.toJSON();
    if (recordData.Patient && !recordData.firstName) {
      recordData.firstName = recordData.Patient.firstName || '';
      recordData.lastName = recordData.Patient.lastName || '';
      recordData.address = recordData.Patient.address || '';
      recordData.city = recordData.Patient.city || '';
      recordData.email = recordData.Patient.email || '';
      recordData.cellPhone = recordData.Patient.phone || '';
      recordData.dateOfBirth = recordData.Patient.dateOfBirth || '';
      recordData.gender = recordData.Patient.gender || '';
      recordData.insuranceProviderName = recordData.Patient.insuranceProvider || '';
      recordData.insurancePolicyNumber = recordData.Patient.insurancePolicyNumber || '';
    }

    res.json({
      success: true,
      medicalRecord: recordData
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateMedicalRecord = async (req, res) => {
  try {
    const medicalRecord = await MedicalRecord.findByPk(req.params.id);
    if (!medicalRecord) {
      return res.status(404).json({ message: 'Medical record not found' });
    }

    const oldData = { ...medicalRecord.toJSON() };
    await medicalRecord.update(req.body);

    await AuditLog.create({
      userId: req.user.id,
      action: 'MEDICAL_RECORD_UPDATED',
      entityType: 'MedicalRecord',
      entityId: medicalRecord.id,
      changes: { old: oldData, new: req.body },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({
      success: true,
      medicalRecord
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteMedicalRecord = async (req, res) => {
  try {
    const medicalRecord = await MedicalRecord.findByPk(req.params.id);
    if (!medicalRecord) {
      return res.status(404).json({ message: 'Medical record not found' });
    }

    await medicalRecord.destroy();

    await AuditLog.create({
      userId: req.user.id,
      action: 'MEDICAL_RECORD_DELETED',
      entityType: 'MedicalRecord',
      entityId: req.params.id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({
      success: true,
      message: 'Medical record deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

