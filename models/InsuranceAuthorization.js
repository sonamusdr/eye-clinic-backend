const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const InsuranceAuthorization = sequelize.define('InsuranceAuthorization', {
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
  insuranceCompany: {
    type: DataTypes.STRING,
    allowNull: false
  },
  policyNumber: {
    type: DataTypes.STRING,
    allowNull: true
  },
  authorizationNumber: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true
  },
  serviceType: {
    type: DataTypes.STRING,
    allowNull: false
  },
  requestedDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  approvedDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  expiryDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected', 'expired', 'cancelled'),
    defaultValue: 'pending'
  },
  approvedAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  requestedAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  rejectionReason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  fileUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'URL to uploaded authorization document'
  }
}, {
  tableName: 'insurance_authorizations',
  timestamps: true
});

module.exports = InsuranceAuthorization;

