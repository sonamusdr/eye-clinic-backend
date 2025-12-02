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
          const hashedPassword = await bcrypt.hash(userData.password, 10);
          await user.update({
            password: hashedPassword,
            isActive: true
          }, { 
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

module.exports = router;

