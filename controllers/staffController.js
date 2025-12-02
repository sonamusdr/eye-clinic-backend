const { User, AuditLog } = require('../models');
const { Op } = require('sequelize');

exports.getStaff = async (req, res) => {
  try {
    const { role, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (role) {
      where.role = role;
    }
    if (search) {
      where[Op.or] = [
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const { count, rows } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password'] },
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['lastName', 'ASC']]
    });

    res.json({
      success: true,
      staff: rows,
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

exports.getDoctors = async (req, res) => {
  try {
    const doctors = await User.findAll({
      where: {
        role: 'doctor',
        isActive: true
      },
      attributes: ['id', 'firstName', 'lastName', 'specialization', 'email', 'phone'],
      order: [['lastName', 'ASC']]
    });

    res.json({
      success: true,
      doctors
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getStaffById = async (req, res) => {
  try {
    const staff = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password'] }
    });

    if (!staff) {
      return res.status(404).json({ message: 'Staff member not found' });
    }

    res.json({
      success: true,
      staff
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createStaff = async (req, res) => {
  try {
    const staff = await User.create(req.body);

    await AuditLog.create({
      userId: req.user.id,
      action: 'STAFF_CREATED',
      entityType: 'User',
      entityId: staff.id,
      changes: req.body,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(201).json({
      success: true,
      staff: {
        id: staff.id,
        firstName: staff.firstName,
        lastName: staff.lastName,
        email: staff.email,
        role: staff.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateStaff = async (req, res) => {
  try {
    const staff = await User.findByPk(req.params.id);
    if (!staff) {
      return res.status(404).json({ message: 'Staff member not found' });
    }

    const oldData = { ...staff.toJSON() };
    await staff.update(req.body);

    await AuditLog.create({
      userId: req.user.id,
      action: 'STAFF_UPDATED',
      entityType: 'User',
      entityId: staff.id,
      changes: { old: oldData, new: req.body },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({
      success: true,
      staff: {
        id: staff.id,
        firstName: staff.firstName,
        lastName: staff.lastName,
        email: staff.email,
        role: staff.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteStaff = async (req, res) => {
  try {
    const staff = await User.findByPk(req.params.id);
    if (!staff) {
      return res.status(404).json({ message: 'Staff member not found' });
    }

    await staff.update({ isActive: false });

    await AuditLog.create({
      userId: req.user.id,
      action: 'STAFF_DEACTIVATED',
      entityType: 'User',
      entityId: staff.id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({
      success: true,
      message: 'Staff member deactivated successfully'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

