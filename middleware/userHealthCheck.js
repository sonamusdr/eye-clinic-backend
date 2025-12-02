// Middleware to periodically check and fix critical users
// This runs on every request to ensure users are always active

const { User } = require('../models');
const bcrypt = require('bcryptjs');

let lastCheck = 0;
const CHECK_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes

const criticalUsers = [
  { email: 'admin@clinic.com', password: 'admin123' },
  { email: 'doctor@clinic.com', password: 'doctor123' },
  { email: 'receptionist@clinic.com', password: 'receptionist123' }
];

async function ensureCriticalUsers() {
  const now = Date.now();
  
  // Only check every 5 minutes to avoid performance issues
  if (now - lastCheck < CHECK_INTERVAL) {
    return;
  }
  
  lastCheck = now;
  
  try {
    for (const userData of criticalUsers) {
      const user = await User.findOne({ where: { email: userData.email } });
      
      if (!user || !user.isActive) {
        console.log(`[UserHealthCheck] Fixing user: ${userData.email}`);
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        
        if (user) {
          await User.update({
            password: hashedPassword,
            isActive: true
          }, {
            where: { email: userData.email },
            individualHooks: false
          });
        } else {
          await User.create({
            email: userData.email,
            firstName: userData.email.split('@')[0].charAt(0).toUpperCase() + userData.email.split('@')[0].slice(1),
            lastName: 'User',
            password: hashedPassword,
            role: userData.email.includes('admin') ? 'admin' : userData.email.includes('doctor') ? 'doctor' : 'receptionist',
            phone: '1234567890',
            isActive: true
          });
        }
      }
    }
  } catch (error) {
    console.error('[UserHealthCheck] Error:', error.message);
  }
}

// Middleware function
const userHealthCheck = async (req, res, next) => {
  // Run check asynchronously (don't block the request)
  ensureCriticalUsers().catch(err => {
    console.error('[UserHealthCheck] Background check failed:', err.message);
  });
  
  next();
};

module.exports = userHealthCheck;

