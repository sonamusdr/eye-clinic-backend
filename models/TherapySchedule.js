const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TherapySchedule = sequelize.define('TherapySchedule', {
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
  therapyType: {
    type: DataTypes.STRING,
    allowNull: false
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  frequency: {
    type: DataTypes.ENUM('daily', 'weekly', 'biweekly', 'monthly', 'custom'),
    allowNull: false,
    defaultValue: 'weekly'
  },
  daysOfWeek: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Array of days: [0=Sunday, 1=Monday, ..., 6=Saturday]'
  },
  timeSlots: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Array of time slots: [{start: "09:00", end: "10:00"}]'
  },
  duration: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Duration in minutes'
  },
  status: {
    type: DataTypes.ENUM('active', 'completed', 'cancelled', 'on_hold'),
    defaultValue: 'active'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  instructions: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'therapy_schedules',
  timestamps: true
});

module.exports = TherapySchedule;

