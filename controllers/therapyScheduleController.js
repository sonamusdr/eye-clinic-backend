const { TherapySchedule, Patient, User, AuditLog } = require('../models');
const { Op } = require('sequelize');
const moment = require('moment');

exports.createTherapySchedule = async (req, res) => {
  try {
    const schedule = await TherapySchedule.create({
      ...req.body,
      doctorId: req.body.doctorId || req.user.id
    });

    await AuditLog.create({
      userId: req.user.id,
      action: 'THERAPY_SCHEDULE_CREATED',
      entityType: 'TherapySchedule',
      entityId: schedule.id,
      changes: req.body,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(201).json({ success: true, schedule });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getTherapySchedules = async (req, res) => {
  try {
    const { patientId, doctorId, status, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (patientId) where.patientId = patientId;
    if (doctorId) where.doctorId = doctorId;
    if (status) where.status = status;

    if (req.user.role === 'doctor') {
      where.doctorId = req.user.id;
    }

    const { count, rows } = await TherapySchedule.findAndCountAll({
      where,
      include: [
        { model: Patient, attributes: ['id', 'firstName', 'lastName', 'phone', 'email'] },
        { model: User, as: 'doctor', attributes: ['id', 'firstName', 'lastName'] }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['startDate', 'DESC']]
    });

    res.json({
      success: true,
      schedules: rows,
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

exports.getTherapyScheduleById = async (req, res) => {
  try {
    const schedule = await TherapySchedule.findByPk(req.params.id, {
      include: [
        { model: Patient },
        { model: User, as: 'doctor' }
      ]
    });

    if (!schedule) {
      return res.status(404).json({ message: 'Therapy schedule not found' });
    }

    res.json({ success: true, schedule });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateTherapySchedule = async (req, res) => {
  try {
    const schedule = await TherapySchedule.findByPk(req.params.id);
    if (!schedule) {
      return res.status(404).json({ message: 'Therapy schedule not found' });
    }

    await schedule.update(req.body);

    await AuditLog.create({
      userId: req.user.id,
      action: 'THERAPY_SCHEDULE_UPDATED',
      entityType: 'TherapySchedule',
      entityId: schedule.id,
      changes: req.body,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({ success: true, schedule });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteTherapySchedule = async (req, res) => {
  try {
    const schedule = await TherapySchedule.findByPk(req.params.id);
    if (!schedule) {
      return res.status(404).json({ message: 'Therapy schedule not found' });
    }

    await schedule.destroy();

    await AuditLog.create({
      userId: req.user.id,
      action: 'THERAPY_SCHEDULE_DELETED',
      entityType: 'TherapySchedule',
      entityId: req.params.id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({ success: true, message: 'Therapy schedule deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

