const { StudyResult, Patient, User, AuditLog } = require('../models');
const { Op } = require('sequelize');
const moment = require('moment');

exports.createStudyResult = async (req, res) => {
  try {
    const studyResult = await StudyResult.create({
      ...req.body,
      doctorId: req.body.doctorId || req.user.id
    });

    await AuditLog.create({
      userId: req.user.id,
      action: 'STUDY_RESULT_CREATED',
      entityType: 'StudyResult',
      entityId: studyResult.id,
      changes: req.body,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(201).json({ success: true, studyResult });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getStudyResults = async (req, res) => {
  try {
    const { patientId, doctorId, studyType, status, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (patientId) where.patientId = patientId;
    if (doctorId) where.doctorId = doctorId;
    if (studyType) where.studyType = studyType;
    if (status) where.status = status;

    if (req.user.role === 'doctor') {
      where.doctorId = req.user.id;
    }

    const { count, rows } = await StudyResult.findAndCountAll({
      where,
      include: [
        { model: Patient, attributes: ['id', 'firstName', 'lastName', 'phone', 'email'] },
        { model: User, as: 'doctor', attributes: ['id', 'firstName', 'lastName'] }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['studyDate', 'DESC']]
    });

    res.json({
      success: true,
      studyResults: rows,
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

exports.getStudyResultById = async (req, res) => {
  try {
    const studyResult = await StudyResult.findByPk(req.params.id, {
      include: [
        { model: Patient },
        { model: User, as: 'doctor' }
      ]
    });

    if (!studyResult) {
      return res.status(404).json({ message: 'Study result not found' });
    }

    res.json({ success: true, studyResult });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateStudyResult = async (req, res) => {
  try {
    const studyResult = await StudyResult.findByPk(req.params.id);
    if (!studyResult) {
      return res.status(404).json({ message: 'Study result not found' });
    }

    await studyResult.update(req.body);

    await AuditLog.create({
      userId: req.user.id,
      action: 'STUDY_RESULT_UPDATED',
      entityType: 'StudyResult',
      entityId: studyResult.id,
      changes: req.body,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({ success: true, studyResult });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteStudyResult = async (req, res) => {
  try {
    const studyResult = await StudyResult.findByPk(req.params.id);
    if (!studyResult) {
      return res.status(404).json({ message: 'Study result not found' });
    }

    await studyResult.destroy();

    await AuditLog.create({
      userId: req.user.id,
      action: 'STUDY_RESULT_DELETED',
      entityType: 'StudyResult',
      entityId: req.params.id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({ success: true, message: 'Study result deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

