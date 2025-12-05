const { Patient, MedicalRecord, Appointment, Invoice, Payment, User, Inventory, Procedure, TherapySchedule, StudyResult, MedicalCertificate, InsuranceAuthorization } = require('../models');
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

    const totalRevenue = payments.reduce((sum, pay) => sum + parseFloat(pay.amount || 0), 0);
    const totalInvoiced = invoices.reduce((sum, inv) => sum + parseFloat(inv.total || 0), 0);
    const pendingInvoices = invoices.filter(inv => inv.status === 'pending');
    const pendingAmount = pendingInvoices.reduce((sum, inv) => sum + parseFloat(inv.total || 0), 0);

    res.json({
      success: true,
      report: {
        period: { startDate, endDate },
        summary: {
          totalRevenue,
          totalInvoiced,
          pendingInvoices: pendingInvoices.length,
          pendingAmount
        },
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

    const appointments = await Appointment.findAll({
      where,
      include: [
        { model: Patient, attributes: ['firstName', 'lastName'] },
        { model: User, as: 'doctor', attributes: ['firstName', 'lastName'] }
      ],
      order: [['appointmentDate', 'DESC']]
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
      items = items.filter(item => item.quantity <= item.reorderLevel);
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

// Get all appointments report
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
        { model: Patient, attributes: ['firstName', 'lastName'] },
        { model: User, as: 'doctor', attributes: ['firstName', 'lastName'] }
      ],
      order: [['appointmentDate', 'DESC']]
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

// Get procedures report
exports.getProceduresReport = async (req, res) => {
  try {
    const { startDate, endDate, status } = req.query;

    const where = {};
    if (startDate && endDate) {
      where.procedureDate = {
        [Op.between]: [startDate, endDate]
      };
    }
    if (status) {
      where.status = status;
    }

    const procedures = await Procedure.findAll({
      where,
      include: [
        { model: Patient, attributes: ['firstName', 'lastName'] },
        { model: User, as: 'doctor', attributes: ['firstName', 'lastName'] }
      ],
      order: [['procedureDate', 'DESC']]
    });

    res.json({
      success: true,
      report: {
        period: { startDate, endDate },
        total: procedures.length,
        procedures
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get therapy schedules report
exports.getTherapySchedulesReport = async (req, res) => {
  try {
    const { startDate, endDate, status } = req.query;

    const where = {};
    if (startDate && endDate) {
      where.startDate = {
        [Op.between]: [startDate, endDate]
      };
    }
    if (status) {
      where.status = status;
    }

    const therapySchedules = await TherapySchedule.findAll({
      where,
      include: [
        { model: Patient, attributes: ['firstName', 'lastName'] },
        { model: User, as: 'doctor', attributes: ['firstName', 'lastName'] }
      ],
      order: [['startDate', 'DESC']]
    });

    res.json({
      success: true,
      report: {
        period: { startDate, endDate },
        total: therapySchedules.length,
        therapySchedules
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get study results report
exports.getStudyResultsReport = async (req, res) => {
  try {
    const { startDate, endDate, status } = req.query;

    const where = {};
    if (startDate && endDate) {
      where.resultDate = {
        [Op.between]: [startDate, endDate]
      };
    }
    if (status) {
      where.status = status;
    }

    const studyResults = await StudyResult.findAll({
      where,
      include: [
        { model: Patient, attributes: ['firstName', 'lastName'] },
        { model: User, as: 'doctor', attributes: ['firstName', 'lastName'] }
      ],
      order: [['resultDate', 'DESC']]
    });

    res.json({
      success: true,
      report: {
        period: { startDate, endDate },
        total: studyResults.length,
        studyResults
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get medical certificates report
exports.getMedicalCertificatesReport = async (req, res) => {
  try {
    const { startDate, endDate, status } = req.query;

    const where = {};
    if (startDate && endDate) {
      where.issueDate = {
        [Op.between]: [startDate, endDate]
      };
    }
    if (status) {
      where.status = status;
    }

    const certificates = await MedicalCertificate.findAll({
      where,
      include: [
        { model: Patient, attributes: ['firstName', 'lastName'] },
        { model: User, as: 'doctor', attributes: ['firstName', 'lastName'] }
      ],
      order: [['issueDate', 'DESC']]
    });

    res.json({
      success: true,
      report: {
        period: { startDate, endDate },
        total: certificates.length,
        certificates
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get insurance authorizations report
exports.getInsuranceAuthorizationsReport = async (req, res) => {
  try {
    const { startDate, endDate, status } = req.query;

    const where = {};
    if (startDate && endDate) {
      where.requestDate = {
        [Op.between]: [startDate, endDate]
      };
    }
    if (status) {
      where.status = status;
    }

    const authorizations = await InsuranceAuthorization.findAll({
      where,
      include: [
        { model: Patient, attributes: ['firstName', 'lastName'] },
        { model: User, as: 'doctor', attributes: ['firstName', 'lastName'] }
      ],
      order: [['requestDate', 'DESC']]
    });

    res.json({
      success: true,
      report: {
        period: { startDate, endDate },
        total: authorizations.length,
        authorizations
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get medical records report
exports.getMedicalRecordsReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const where = {};
    if (startDate && endDate) {
      where.visitDate = {
        [Op.between]: [startDate, endDate]
      };
    }

    const medicalRecords = await MedicalRecord.findAll({
      where,
      include: [
        { model: Patient, attributes: ['firstName', 'lastName'] },
        { model: User, as: 'doctor', attributes: ['firstName', 'lastName'] }
      ],
      order: [['visitDate', 'DESC']]
    });

    res.json({
      success: true,
      report: {
        period: { startDate, endDate },
        total: medicalRecords.length,
        medicalRecords
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
