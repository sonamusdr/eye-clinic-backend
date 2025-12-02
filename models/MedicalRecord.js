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
  }
}, {
  tableName: 'medical_records',
  timestamps: true
});

module.exports = MedicalRecord;

