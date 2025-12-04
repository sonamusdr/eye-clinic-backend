const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const StudyResult = sequelize.define('StudyResult', {
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
  studyType: {
    type: DataTypes.ENUM('oct', 'topography', 'angiography', 'ultrasound', 'visual_field', 'biometry', 'pachymetry', 'other'),
    allowNull: false
  },
  studyName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  studyDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  results: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Structured results data'
  },
  findings: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  interpretation: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  recommendations: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  fileUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'URL to uploaded study file/image'
  },
  status: {
    type: DataTypes.ENUM('pending', 'completed', 'reviewed', 'archived'),
    defaultValue: 'pending'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'study_results',
  timestamps: true
});

module.exports = StudyResult;

