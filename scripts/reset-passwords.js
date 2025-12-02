// Emergency script to reset passwords for critical users
// Run this with: node scripts/reset-passwords.js

require('dotenv').config();
const { User } = require('../models');
const bcrypt = require('bcryptjs');

async function resetPasswords() {
  try {
    console.log('Connecting to database...');
    const { sequelize } = require('../config/database');
    await sequelize.authenticate();
    console.log('Database connected successfully.');

    const criticalUsers = [
      { email: 'admin@clinic.com', password: 'admin123' },
      { email: 'doctor@clinic.com', password: 'doctor123' },
      { email: 'receptionist@clinic.com', password: 'receptionist123' }
    ];

    console.log('\nResetting passwords for critical users...\n');

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
          console.log(`✓ ${userData.email} - Password reset successfully`);
        } else {
          console.log(`✗ ${userData.email} - User not found`);
        }
      } catch (error) {
        console.error(`✗ ${userData.email} - Error: ${error.message}`);
      }
    }

    console.log('\nPassword reset completed!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

resetPasswords();

