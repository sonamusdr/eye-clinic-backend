const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Procedure = sequelize.define('Procedure', {
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
  procedureType: {
    type: DataTypes.ENUM('surgery', 'laser', 'injection', 'examination', 'other'),
    allowNull: false,
    defaultValue: 'other'
  },
  procedureName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  procedureDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  startTime: {
    type: DataTypes.TIME,
    allowNull: true
  },
  endTime: {
    type: DataTypes.TIME,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('scheduled', 'in_progress', 'completed', 'cancelled', 'postponed'),
    defaultValue: 'scheduled'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  cost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  anesthesiaType: {
    type: DataTypes.STRING,
    allowNull: true
  },
  complications: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  followUpDate: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'procedures',
  timestamps: true
});

module.exports = Procedure;

