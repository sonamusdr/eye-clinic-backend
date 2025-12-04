const { Procedure, Patient, User, AuditLog } = require('../models');
const { Op } = require('sequelize');
const moment = require('moment');

exports.createProcedure = async (req, res) => {
  try {
    const procedure = await Procedure.create({
      ...req.body,
      doctorId: req.body.doctorId || req.user.id
    });

    await AuditLog.create({
      userId: req.user.id,
      action: 'PROCEDURE_CREATED',
      entityType: 'Procedure',
      entityId: procedure.id,
      changes: req.body,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(201).json({ success: true, procedure });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getProcedures = async (req, res) => {
  try {
    const { patientId, doctorId, status, date, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (patientId) where.patientId = patientId;
    if (doctorId) where.doctorId = doctorId;
    if (status) where.status = status;
    if (date) where.procedureDate = moment(date).format('YYYY-MM-DD');

    if (req.user.role === 'doctor') {
      where.doctorId = req.user.id;
    }

    const { count, rows } = await Procedure.findAndCountAll({
      where,
      include: [
        { model: Patient, attributes: ['id', 'firstName', 'lastName', 'phone', 'email'] },
        { model: User, as: 'doctor', attributes: ['id', 'firstName', 'lastName'] }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['procedureDate', 'DESC'], ['startTime', 'ASC']]
    });

    res.json({
      success: true,
      procedures: rows,
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

exports.getProcedureById = async (req, res) => {
  try {
    const procedure = await Procedure.findByPk(req.params.id, {
      include: [
        { model: Patient },
        { model: User, as: 'doctor' }
      ]
    });

    if (!procedure) {
      return res.status(404).json({ message: 'Procedure not found' });
    }

    res.json({ success: true, procedure });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateProcedure = async (req, res) => {
  try {
    const procedure = await Procedure.findByPk(req.params.id);
    if (!procedure) {
      return res.status(404).json({ message: 'Procedure not found' });
    }

    await procedure.update(req.body);

    await AuditLog.create({
      userId: req.user.id,
      action: 'PROCEDURE_UPDATED',
      entityType: 'Procedure',
      entityId: procedure.id,
      changes: req.body,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({ success: true, procedure });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteProcedure = async (req, res) => {
  try {
    const procedure = await Procedure.findByPk(req.params.id);
    if (!procedure) {
      return res.status(404).json({ message: 'Procedure not found' });
    }

    await procedure.destroy();

    await AuditLog.create({
      userId: req.user.id,
      action: 'PROCEDURE_DELETED',
      entityType: 'Procedure',
      entityId: req.params.id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({ success: true, message: 'Procedure deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

