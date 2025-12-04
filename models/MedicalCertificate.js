const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const MedicalCertificate = sequelize.define('MedicalCertificate', {
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
  certificateType: {
    type: DataTypes.ENUM('fitness', 'disability', 'sick_leave', 'vision_requirement', 'surgery_clearance', 'other'),
    allowNull: false
  },
  certificateNumber: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true
  },
  issueDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  expiryDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  purpose: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  diagnosis: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  recommendations: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  restrictions: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('active', 'expired', 'revoked', 'cancelled'),
    defaultValue: 'active'
  },
  fileUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'URL to uploaded certificate PDF'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'medical_certificates',
  timestamps: true
});

module.exports = MedicalCertificate;

