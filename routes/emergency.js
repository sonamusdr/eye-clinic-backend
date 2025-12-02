const express = require('express');
const router = express.Router();
const { User } = require('../models');
const bcrypt = require('bcryptjs');

// EMERGENCY ENDPOINT: Activate critical system users
// This endpoint can be called directly to fix user access issues
router.post('/activate-critical-users', async (req, res) => {
  try {
    const criticalUsers = [
      {
        email: 'admin@clinic.com',
        firstName: 'Admin',
        lastName: 'User',
        password: 'admin123',
        role: 'admin',
        phone: '1234567890'
      },
      {
        email: 'doctor@clinic.com',
        firstName: 'John',
        lastName: 'Doctor',
        password: 'doctor123',
        role: 'doctor',
        specialization: 'Ophthalmology',
        licenseNumber: 'DOC12345',
        phone: '1234567891'
      },
      {
        email: 'receptionist@clinic.com',
        firstName: 'Jane',
        lastName: 'Receptionist',
        password: 'receptionist123',
        role: 'receptionist',
        phone: '1234567892'
      }
    ];

    const results = [];

    for (const userData of criticalUsers) {
      try {
        const existingUser = await User.findOne({ where: { email: userData.email } });
        
        if (existingUser) {
          const hashedPassword = await bcrypt.hash(userData.password, 10);
          await existingUser.update({
            password: hashedPassword,
            isActive: true,
            firstName: userData.firstName,
            lastName: userData.lastName,
            role: userData.role,
            phone: userData.phone,
            ...(userData.specialization && { specialization: userData.specialization }),
            ...(userData.licenseNumber && { licenseNumber: userData.licenseNumber })
          }, { 
            individualHooks: false
          });
          results.push({ email: userData.email, status: 'activated', message: 'User activated successfully' });
        } else {
          const hashedPassword = await bcrypt.hash(userData.password, 10);
          await User.create({
            ...userData,
            password: hashedPassword,
            isActive: true
          });
          results.push({ email: userData.email, status: 'created', message: 'User created successfully' });
        }
      } catch (error) {
        results.push({ email: userData.email, status: 'error', message: error.message });
      }
    }

    res.json({
      success: true,
      message: 'Critical users activation completed',
      results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to activate critical users',
      error: error.message
    });
  }
});

// EMERGENCY ENDPOINT: Reset passwords for critical users
router.post('/reset-passwords', async (req, res) => {
  try {
    const bcrypt = require('bcryptjs');
    
    const criticalUsers = [
      {
        email: 'admin@clinic.com',
        password: 'admin123'
      },
      {
        email: 'doctor@clinic.com',
        password: 'doctor123'
      },
      {
        email: 'receptionist@clinic.com',
        password: 'receptionist123'
      }
    ];

    const results = [];

    for (const userData of criticalUsers) {
      try {
        const user = await User.findOne({ where: { email: userData.email } });
        
        if (user) {
          // Hash the password manually
          const hashedPassword = await bcrypt.hash(userData.password, 10);
          // Update directly in database to bypass hooks
          await User.update({
            password: hashedPassword,
            isActive: true
          }, {
            where: { email: userData.email },
            individualHooks: false
          });
          results.push({ 
            email: userData.email, 
            status: 'success', 
            message: 'Password reset successfully' 
          });
        } else {
          results.push({ 
            email: userData.email, 
            status: 'error', 
            message: 'User not found' 
          });
        }
      } catch (error) {
        results.push({ 
          email: userData.email, 
          status: 'error', 
          message: error.message 
        });
      }
    }

    res.json({
      success: true,
      message: 'Password reset completed',
      results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to reset passwords',
      error: error.message
    });
  }
});

// DEBUG ENDPOINT: Check user status
router.get('/check-user/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const user = await User.findOne({ 
      where: { email },
      attributes: ['id', 'email', 'firstName', 'lastName', 'role', 'isActive', 'createdAt', 'updatedAt']
    });

    if (!user) {
      return res.json({
        exists: false,
        message: 'User not found'
      });
    }

    res.json({
      exists: true,
      user: user.toJSON(),
      isActive: user.isActive
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// EMERGENCY ENDPOINT: Fix patient_forms table structure
router.post('/fix-patient-forms-table', async (req, res) => {
  try {
    const { sequelize } = require('../config/database');
    const results = [];
    
    // 1. Add formType column if it doesn't exist
    const [formTypeCheck] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'patient_forms' AND column_name = 'formType'
    `);
    
    if (formTypeCheck.length === 0) {
      await sequelize.query(`
        ALTER TABLE patient_forms 
        ADD COLUMN formType VARCHAR(20)
      `);
      await sequelize.query(`
        UPDATE patient_forms 
        SET formType = 'appointment' 
        WHERE formType IS NULL
      `);
      results.push('formType column added');
    } else {
      results.push('formType column already exists');
    }
    
    // 2. Make appointmentId nullable if it's not
    try {
      await sequelize.query(`
        ALTER TABLE patient_forms 
        ALTER COLUMN "appointmentId" DROP NOT NULL
      `);
      results.push('appointmentId made nullable');
    } catch (error) {
      if (error.message.includes('does not exist') || error.message.includes('already')) {
        results.push('appointmentId is already nullable');
      } else {
        results.push(`appointmentId: ${error.message}`);
      }
    }
    
    // 3. Add patientId column if it doesn't exist
    const [patientIdCheck] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'patient_forms' AND column_name = 'patientId'
    `);
    
    if (patientIdCheck.length === 0) {
      await sequelize.query(`
        ALTER TABLE patient_forms 
        ADD COLUMN "patientId" UUID
      `);
      results.push('patientId column added');
    } else {
      results.push('patientId column already exists');
    }
    
    res.json({
      success: true,
      message: 'Table structure fixed',
      changes: results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fix table structure',
      error: error.message
    });
  }
});

module.exports = router;

