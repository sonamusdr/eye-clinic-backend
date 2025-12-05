const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const MedicalRecord = sequelize.define('MedicalRecord', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  patientId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'patients',
      key: 'id'
    }
  },
  doctorId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  visitDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  chiefComplaint: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  visualAcuityOD: {
    type: DataTypes.STRING,
    allowNull: true
  },
  visualAcuityOS: {
    type: DataTypes.STRING,
    allowNull: true
  },
  refractionOD: {
    type: DataTypes.STRING,
    allowNull: true
  },
  refractionOS: {
    type: DataTypes.STRING,
    allowNull: true
  },
  intraocularPressureOD: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true
  },
  intraocularPressureOS: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true
  },
  diagnosis: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  treatmentPlan: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  testResults: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  attachments: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: true,
    defaultValue: []
  },
  isSurgical: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  surgeryType: {
    type: DataTypes.STRING,
    allowNull: true
  },
  preOpNotes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  postOpNotes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  followUpDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  // Nuevos campos para expediente médico completo
  recordNumber: {
    type: DataTypes.STRING,
    allowNull: true
  },
  recordCreationDate: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: DataTypes.NOW
  },
  // Información del paciente (se puede auto-completar desde Patient)
  firstName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  city: {
    type: DataTypes.STRING,
    allowNull: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true
  },
  // Información personal adicional
  maritalStatus: {
    type: DataTypes.STRING,
    allowNull: true
  },
  age: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  idNumber: {
    type: DataTypes.STRING,
    allowNull: true
  },
  origin: {
    type: DataTypes.STRING,
    allowNull: true
  },
  homePhone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  officePhone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  cellPhone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  birthPlace: {
    type: DataTypes.STRING,
    allowNull: true
  },
  occupation: {
    type: DataTypes.STRING,
    allowNull: true
  },
  referredBy: {
    type: DataTypes.STRING,
    allowNull: true
  },
  education: {
    type: DataTypes.STRING,
    allowNull: true
  },
  fatherName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  motherName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  insuranceProviderName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  insuranceMemberNumber: {
    type: DataTypes.STRING,
    allowNull: true
  },
  insurancePlanType: {
    type: DataTypes.STRING,
    allowNull: true
  },
  insurancePolicyNumber: {
    type: DataTypes.STRING,
    allowNull: true
  },
  personalHistory: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  familyHistory: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  observations: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // Campos adicionales para información completa
  country: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'medical_records',
  timestamps: true
});

module.exports = MedicalRecord;

