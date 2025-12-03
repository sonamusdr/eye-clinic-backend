const { Patient, MedicalRecord, Appointment, Invoice, Payment, User, Inventory } = require('../models');
const { Op } = require('sequelize');
const moment = require('moment');

exports.getPatientReport = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { startDate, endDate } = req.query;

    const patient = await Patient.findByPk(patientId);
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    const where = { patientId };
    if (startDate && endDate) {
      where.visitDate = {
        [Op.between]: [startDate, endDate]
      };
    }

    const [medicalRecords, appointments, invoices] = await Promise.all([
      MedicalRecord.findAll({
        where,
        include: [{ model: User, as: 'doctor', attributes: ['firstName', 'lastName'] }],
        order: [['visitDate', 'DESC']]
      }),
      Appointment.findAll({
        where: {
          patientId,
          ...(startDate && endDate ? {
            appointmentDate: {
              [Op.between]: [startDate, endDate]
            }
          } : {})
        },
        include: [{ model: User, as: 'doctor', attributes: ['firstName', 'lastName'] }],
        order: [['appointmentDate', 'DESC']]
      }),
      Invoice.findAll({
        where: {
          patientId,
          ...(startDate && endDate ? {
            createdAt: {
              [Op.between]: [startDate, endDate]
            }
          } : {})
        },
        include: [{ model: Payment }]
      })
    ]);

    res.json({
      success: true,
      report: {
        patient,
        medicalRecords,
        appointments,
        invoices,
        summary: {
          totalVisits: medicalRecords.length,
          totalAppointments: appointments.length,
          totalInvoices: invoices.length,
          totalAmount: invoices.reduce((sum, inv) => sum + parseFloat(inv.total), 0)
        }
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getFinancialReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const where = {};
    if (startDate && endDate) {
      where.createdAt = {
        [Op.between]: [startDate, endDate]
      };
    }

    const [invoices, payments] = await Promise.all([
      Invoice.findAll({
        where,
        include: [{ model: Patient, attributes: ['firstName', 'lastName'] }]
      }),
      Payment.findAll({
        where: {
          ...(startDate && endDate ? {
            paymentDate: {
              [Op.between]: [startDate, endDate]
            }
          } : {}),
          status: 'completed'
        },
        include: [{ model: Invoice, include: [{ model: Patient }] }]
      })
    ]);

    const totalRevenue = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const totalInvoiced = invoices.reduce((sum, inv) => sum + parseFloat(inv.total), 0);
    const pendingAmount = invoices
      .filter(inv => inv.status !== 'paid')
      .reduce((sum, inv) => sum + parseFloat(inv.total), 0);

    const revenueByMethod = payments.reduce((acc, payment) => {
      acc[payment.paymentMethod] = (acc[payment.paymentMethod] || 0) + parseFloat(payment.amount);
      return acc;
    }, {});

    res.json({
      success: true,
      report: {
        period: { startDate, endDate },
        summary: {
          totalRevenue,
          totalInvoiced,
          pendingAmount,
          paidAmount: totalRevenue
        },
        revenueByMethod,
        invoices,
        payments
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getOperationalReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const where = {};
    if (startDate && endDate) {
      where.appointmentDate = {
        [Op.between]: [startDate, endDate]
      };
    }

    const [appointments, patients, staff] = await Promise.all([
      Appointment.findAll({
        where,
        include: [
          { model: Patient },
          { model: User, as: 'doctor' }
        ]
      }),
      Patient.count({
        where: {
          ...(startDate && endDate ? {
            createdAt: {
              [Op.between]: [startDate, endDate]
            }
          } : {})
        }
      }),
      User.count({ where: { isActive: true } })
    ]);

    const appointmentsByStatus = appointments.reduce((acc, apt) => {
      acc[apt.status] = (acc[apt.status] || 0) + 1;
      return acc;
    }, {});

    const appointmentsByType = appointments.reduce((acc, apt) => {
      acc[apt.appointmentType] = (acc[apt.appointmentType] || 0) + 1;
      return acc;
    }, {});

    res.json({
      success: true,
      report: {
        period: { startDate, endDate },
        summary: {
          totalAppointments: appointments.length,
          newPatients: patients,
          activeStaff: staff
        },
        appointmentsByStatus,
        appointmentsByType,
        appointments
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAppointmentStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const where = {};
    if (startDate && endDate) {
      where.appointmentDate = {
        [Op.between]: [startDate, endDate]
      };
    }

    const appointments = await Appointment.findAll({
      where,
      include: [{ model: User, as: 'doctor' }]
    });

    const stats = {
      total: appointments.length,
      byStatus: {},
      byType: {},
      byDoctor: {}
    };

    appointments.forEach(apt => {
      stats.byStatus[apt.status] = (stats.byStatus[apt.status] || 0) + 1;
      stats.byType[apt.appointmentType] = (stats.byType[apt.appointmentType] || 0) + 1;
      const doctorName = `${apt.doctor.firstName} ${apt.doctor.lastName}`;
      stats.byDoctor[doctorName] = (stats.byDoctor[doctorName] || 0) + 1;
    });

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all patients report
exports.getPatientsReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const where = {};
    if (startDate && endDate) {
      where.createdAt = {
        [Op.between]: [startDate, endDate]
      };
    }

    const patients = await Patient.findAll({
      where,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      report: {
        period: { startDate, endDate },
        total: patients.length,
        patients
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all staff report
exports.getStaffReport = async (req, res) => {
  try {
    const { role } = req.query;

    const where = { isActive: true };
    if (role) {
      where.role = role;
    }

    const staff = await User.findAll({
      where,
      attributes: { exclude: ['password'] },
      order: [['lastName', 'ASC']]
    });

    res.json({
      success: true,
      report: {
        total: staff.length,
        staff
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get inventory report
exports.getInventoryReport = async (req, res) => {
  try {
    const { lowStockOnly } = req.query;

    let items;
    if (lowStockOnly === 'true') {
      // Get all items and filter in memory for low stock
      items = await Inventory.findAll({
        order: [['itemName', 'ASC']]
      });
      items = items.filter(item => parseFloat(item.quantity || 0) <= parseFloat(item.reorderLevel || 0));
    } else {
      items = await Inventory.findAll({
        order: [['itemName', 'ASC']]
      });
    }

    const totalValue = items.reduce((sum, item) => {
      return sum + (parseFloat(item.quantity || 0) * parseFloat(item.unitPrice || 0));
    }, 0);

    res.json({
      success: true,
      report: {
        total: items.length,
        totalValue,
        items
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get appointments report
exports.getAppointmentsReport = async (req, res) => {
  try {
    const { startDate, endDate, status, doctorId } = req.query;

    const where = {};
    if (startDate && endDate) {
      where.appointmentDate = {
        [Op.between]: [startDate, endDate]
      };
    }
    if (status) {
      where.status = status;
    }
    if (doctorId) {
      where.doctorId = doctorId;
    }

    const appointments = await Appointment.findAll({
      where,
      include: [
        { model: Patient, attributes: ['firstName', 'lastName', 'phone', 'email'] },
        { model: User, as: 'doctor', attributes: ['firstName', 'lastName', 'specialization'] }
      ],
      order: [['appointmentDate', 'DESC'], ['startTime', 'ASC']]
    });

    res.json({
      success: true,
      report: {
        period: { startDate, endDate },
        total: appointments.length,
        appointments
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

