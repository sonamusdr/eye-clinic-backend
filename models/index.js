const { sequelize } = require('../config/database');
const User = require('./User');
const Patient = require('./Patient');
const Appointment = require('./Appointment');
const MedicalRecord = require('./MedicalRecord');
const Prescription = require('./Prescription');
const Inventory = require('./Inventory');
const Invoice = require('./Invoice');
const Payment = require('./Payment');
const AuditLog = require('./AuditLog');
const Notification = require('./Notification');
const PatientForm = require('./PatientForm');

// Define associations
User.hasMany(Appointment, { foreignKey: 'doctorId', as: 'doctorAppointments' });
Appointment.belongsTo(User, { foreignKey: 'doctorId', as: 'doctor' });

Patient.hasMany(Appointment, { foreignKey: 'patientId' });
Appointment.belongsTo(Patient, { foreignKey: 'patientId' });

Patient.hasMany(MedicalRecord, { foreignKey: 'patientId' });
MedicalRecord.belongsTo(Patient, { foreignKey: 'patientId' });

MedicalRecord.belongsTo(User, { foreignKey: 'doctorId', as: 'doctor' });

Patient.hasMany(Prescription, { foreignKey: 'patientId' });
Prescription.belongsTo(Patient, { foreignKey: 'patientId' });
Prescription.belongsTo(User, { foreignKey: 'doctorId', as: 'doctor' });

Patient.hasMany(Invoice, { foreignKey: 'patientId' });
Invoice.belongsTo(Patient, { foreignKey: 'patientId' });

Invoice.hasMany(Payment, { foreignKey: 'invoiceId' });
Payment.belongsTo(Invoice, { foreignKey: 'invoiceId' });

User.hasMany(Notification, { foreignKey: 'userId' });
Notification.belongsTo(User, { foreignKey: 'userId' });

Appointment.hasOne(PatientForm, { foreignKey: 'appointmentId' });
PatientForm.belongsTo(Appointment, { foreignKey: 'appointmentId' });

module.exports = {
  sequelize,
  User,
  Patient,
  Appointment,
  MedicalRecord,
  Prescription,
  Inventory,
  Invoice,
  Payment,
  AuditLog,
  Notification,
  PatientForm
};

