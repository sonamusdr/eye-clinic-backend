const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const crypto = require('crypto');

const AppointmentLink = sequelize.define('AppointmentLink', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  token: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  doctorId: {
    type: DataTypes.UUID,
    allowNull: true, // Optional - if null, patient can choose
    references: {
      model: 'users',
      key: 'id'
    }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  maxUses: {
    type: DataTypes.INTEGER,
    defaultValue: 1 // How many appointments can be scheduled with this link
  },
  currentUses: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  tableName: 'appointment_links',
  timestamps: true,
  hooks: {
    beforeCreate: (link) => {
      // Generate token if not provided
      if (!link.token) {
        link.token = crypto.randomBytes(32).toString('hex');
      }
      // Set expiration to 90 days from creation if not set
      if (!link.expiresAt) {
        const expiresDate = new Date();
        expiresDate.setDate(expiresDate.getDate() + 90);
        link.expiresAt = expiresDate;
      }
    }
  }
});

module.exports = AppointmentLink;

