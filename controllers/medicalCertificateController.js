const { MedicalCertificate, Patient, User, AuditLog } = require('../models');
const { Op } = require('sequelize');
const moment = require('moment');

exports.createMedicalCertificate = async (req, res) => {
  try {
    // Generate certificate number if not provided
    if (!req.body.certificateNumber) {
      const count = await MedicalCertificate.count();
      req.body.certificateNumber = `CERT-${String(count + 1).padStart(6, '0')}`;
    }

    const certificate = await MedicalCertificate.create({
      ...req.body,
      doctorId: req.body.doctorId || req.user.id
    });

    await AuditLog.create({
      userId: req.user.id,
      action: 'MEDICAL_CERTIFICATE_CREATED',
      entityType: 'MedicalCertificate',
      entityId: certificate.id,
      changes: req.body,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(201).json({ success: true, certificate });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getMedicalCertificates = async (req, res) => {
  try {
    const { patientId, doctorId, certificateType, status, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (patientId) where.patientId = patientId;
    if (doctorId) where.doctorId = doctorId;
    if (certificateType) where.certificateType = certificateType;
    if (status) where.status = status;

    if (req.user.role === 'doctor') {
      where.doctorId = req.user.id;
    }

    const { count, rows } = await MedicalCertificate.findAndCountAll({
      where,
      include: [
        { model: Patient, attributes: ['id', 'firstName', 'lastName', 'phone', 'email'] },
        { model: User, as: 'doctor', attributes: ['id', 'firstName', 'lastName'] }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['issueDate', 'DESC']]
    });

    res.json({
      success: true,
      certificates: rows,
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

exports.getMedicalCertificateById = async (req, res) => {
  try {
    const certificate = await MedicalCertificate.findByPk(req.params.id, {
      include: [
        { model: Patient },
        { model: User, as: 'doctor' }
      ]
    });

    if (!certificate) {
      return res.status(404).json({ message: 'Medical certificate not found' });
    }

    res.json({ success: true, certificate });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateMedicalCertificate = async (req, res) => {
  try {
    const certificate = await MedicalCertificate.findByPk(req.params.id);
    if (!certificate) {
      return res.status(404).json({ message: 'Medical certificate not found' });
    }

    await certificate.update(req.body);

    await AuditLog.create({
      userId: req.user.id,
      action: 'MEDICAL_CERTIFICATE_UPDATED',
      entityType: 'MedicalCertificate',
      entityId: certificate.id,
      changes: req.body,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({ success: true, certificate });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteMedicalCertificate = async (req, res) => {
  try {
    const certificate = await MedicalCertificate.findByPk(req.params.id);
    if (!certificate) {
      return res.status(404).json({ message: 'Medical certificate not found' });
    }

    await certificate.destroy();

    await AuditLog.create({
      userId: req.user.id,
      action: 'MEDICAL_CERTIFICATE_DELETED',
      entityType: 'MedicalCertificate',
      entityId: req.params.id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({ success: true, message: 'Medical certificate deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

