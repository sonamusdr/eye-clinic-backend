const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const crypto = require('crypto');

const PatientForm = sequelize.define('PatientForm', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  appointmentId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'appointments',
      key: 'id'
    }
  },
  token: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  formData: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {}
  },
  isCompleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'patient_forms',
  timestamps: true,
  hooks: {
    beforeCreate: (form) => {
      if (!form.token) {
        form.token = crypto.randomBytes(32).toString('hex');
      }
      // Form expires 30 days from creation
      if (!form.expiresAt) {
        const expiresDate = new Date();
        expiresDate.setDate(expiresDate.getDate() + 30);
        form.expiresAt = expiresDate;
      }
    }
  }
});

module.exports = PatientForm;

