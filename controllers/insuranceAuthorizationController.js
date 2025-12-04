const { InsuranceAuthorization, Patient, User, AuditLog } = require('../models');
const { Op } = require('sequelize');
const moment = require('moment');

exports.createInsuranceAuthorization = async (req, res) => {
  try {
    // Generate authorization number if not provided
    if (!req.body.authorizationNumber) {
      const count = await InsuranceAuthorization.count();
      req.body.authorizationNumber = `AUTH-${String(count + 1).padStart(6, '0')}`;
    }

    const authorization = await InsuranceAuthorization.create({
      ...req.body,
      doctorId: req.body.doctorId || req.user.id
    });

    await AuditLog.create({
      userId: req.user.id,
      action: 'INSURANCE_AUTHORIZATION_CREATED',
      entityType: 'InsuranceAuthorization',
      entityId: authorization.id,
      changes: req.body,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(201).json({ success: true, authorization });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getInsuranceAuthorizations = async (req, res) => {
  try {
    const { patientId, doctorId, status, insuranceCompany, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (patientId) where.patientId = patientId;
    if (doctorId) where.doctorId = doctorId;
    if (status) where.status = status;
    if (insuranceCompany) {
      where.insuranceCompany = { [Op.iLike]: `%${insuranceCompany}%` };
    }

    if (req.user.role === 'doctor') {
      where.doctorId = req.user.id;
    }

    const { count, rows } = await InsuranceAuthorization.findAndCountAll({
      where,
      include: [
        { model: Patient, attributes: ['id', 'firstName', 'lastName', 'phone', 'email'] },
        { model: User, as: 'doctor', attributes: ['id', 'firstName', 'lastName'] }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['requestedDate', 'DESC']]
    });

    res.json({
      success: true,
      authorizations: rows,
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

exports.getInsuranceAuthorizationById = async (req, res) => {
  try {
    const authorization = await InsuranceAuthorization.findByPk(req.params.id, {
      include: [
        { model: Patient },
        { model: User, as: 'doctor' }
      ]
    });

    if (!authorization) {
      return res.status(404).json({ message: 'Insurance authorization not found' });
    }

    res.json({ success: true, authorization });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateInsuranceAuthorization = async (req, res) => {
  try {
    const authorization = await InsuranceAuthorization.findByPk(req.params.id);
    if (!authorization) {
      return res.status(404).json({ message: 'Insurance authorization not found' });
    }

    await authorization.update(req.body);

    await AuditLog.create({
      userId: req.user.id,
      action: 'INSURANCE_AUTHORIZATION_UPDATED',
      entityType: 'InsuranceAuthorization',
      entityId: authorization.id,
      changes: req.body,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({ success: true, authorization });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteInsuranceAuthorization = async (req, res) => {
  try {
    const authorization = await InsuranceAuthorization.findByPk(req.params.id);
    if (!authorization) {
      return res.status(404).json({ message: 'Insurance authorization not found' });
    }

    await authorization.destroy();

    await AuditLog.create({
      userId: req.user.id,
      action: 'INSURANCE_AUTHORIZATION_DELETED',
      entityType: 'InsuranceAuthorization',
      entityId: req.params.id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({ success: true, message: 'Insurance authorization deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

