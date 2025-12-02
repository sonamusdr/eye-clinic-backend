const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { sequelize } = require('./config/database');
const errorHandler = require('./middleware/errorHandler');
const userHealthCheck = require('./middleware/userHealthCheck');

// Load environment variables
dotenv.config();

const app = express();

// Middleware - CORS configuration
app.use(cors({
  origin: [
    'https://eyeclinic.aledsystems.com',
    process.env.FRONTEND_URL,
    'http://localhost:3000'
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// User health check middleware - ensures critical users are always active
app.use(userHealthCheck);

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/patients', require('./routes/patients'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/medical-records', require('./routes/medicalRecords'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/billing', require('./routes/billing'));
app.use('/api/staff', require('./routes/staff'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/telemedicine', require('./routes/telemedicine'));
app.use('/api/patient-forms', require('./routes/patientForms'));
app.use('/api/emergency', require('./routes/emergency')); // Emergency endpoints

// Health check endpoint with user verification
app.get('/api/health', async (req, res) => {
  try {
    // Verify critical users are active
    const { User } = require('./models');
    const criticalEmails = ['admin@clinic.com', 'doctor@clinic.com', 'receptionist@clinic.com'];
    const users = await User.findAll({ 
      where: { email: { [require('sequelize').Op.in]: criticalEmails } },
      attributes: ['email', 'isActive']
    });
    
    const inactiveUsers = users.filter(u => !u.isActive).map(u => u.email);
    
    if (inactiveUsers.length > 0) {
      // Auto-fix: Activate users if they're inactive
      const bcrypt = require('bcryptjs');
      const criticalUsers = [
        { email: 'admin@clinic.com', password: 'admin123' },
        { email: 'doctor@clinic.com', password: 'doctor123' },
        { email: 'receptionist@clinic.com', password: 'receptionist123' }
      ];
      
      for (const userData of criticalUsers) {
        if (inactiveUsers.includes(userData.email)) {
          const hashedPassword = await bcrypt.hash(userData.password, 10);
          await User.update({
            password: hashedPassword,
            isActive: true
          }, {
            where: { email: userData.email },
            individualHooks: false
          });
        }
      }
    }
    
    res.json({ 
      status: 'OK', 
      message: 'Eye Clinic Management System API is running',
      criticalUsersActive: inactiveUsers.length === 0
    });
  } catch (error) {
    res.json({ 
      status: 'OK', 
      message: 'Eye Clinic Management System API is running',
      warning: 'Could not verify users'
    });
  }
});

// Error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Heroku uses process.env.PORT, so this is already configured correctly

// Database connection and server start
sequelize.authenticate()
  .then(async () => {
    console.log('Database connection established successfully.');
    
    // CRITICAL: Always ensure default users exist and are active FIRST
    // This runs BEFORE migrations to prevent lockouts
    console.log('Ensuring critical system users are active...');
    try {
      const { User } = require('./models');
      const bcrypt = require('bcryptjs');
      
      // Critical system users that MUST always be active
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
      
      // Use direct database update to ensure users exist and are always active
      // This bypasses Sequelize hooks and ensures data is saved correctly
      for (const userData of criticalUsers) {
        try {
          const existingUser = await User.findOne({ where: { email: userData.email } });
          const hashedPassword = await bcrypt.hash(userData.password, 10);
          
          if (existingUser) {
            // Update directly in database to bypass hooks
            await User.update({
              password: hashedPassword,
              isActive: true,
              firstName: userData.firstName,
              lastName: userData.lastName,
              role: userData.role,
              phone: userData.phone,
              ...(userData.specialization && { specialization: userData.specialization }),
              ...(userData.licenseNumber && { licenseNumber: userData.licenseNumber })
            }, {
              where: { email: userData.email },
              individualHooks: false
            });
            console.log(`✓ Critical user activated: ${userData.email}`);
          } else {
            // Create new user
            await User.create({
              ...userData,
              password: hashedPassword,
              isActive: true
            });
            console.log(`✓ Critical user created: ${userData.email}`);
          }
        } catch (error) {
          console.error(`ERROR: Failed to ensure user ${userData.email} is active:`, error.message);
          console.error('Full error:', error);
          // Don't throw - continue with other users
        }
      }
      
      console.log('✓ Critical system users check completed.');
    } catch (error) {
      console.error('CRITICAL ERROR: Failed to ensure critical users:', error);
      // Don't exit - but log the error
    }
    
    // IMPORTANT: Do NOT run automatic migrations with alter:true in production
    // This can cause data loss and reset user passwords
    // Migrations should be run manually when needed, not automatically on every startup
    // Only sync models without altering existing tables
    if (process.env.RUN_MIGRATIONS === 'true' && process.env.ALLOW_ALTER !== 'true') {
      try {
        console.log('Syncing database models (safe mode - no alter)...');
        const models = require('./models');
        // Use sync without alter to avoid modifying existing tables
        await sequelize.sync({ force: false, alter: false });
        console.log('Database sync completed successfully (safe mode).');
      } catch (migrationError) {
        console.error('Migration error:', migrationError);
        // Don't exit - server can still run even if migrations fail
      }
    }
    
    // Final check: Ensure users are active one more time after any sync
    console.log('Final verification of critical users...');
    try {
      const { User: UserModel } = require('./models');
      const bcrypt = require('bcryptjs');
      for (const userData of criticalUsers) {
        try {
          const hashedPassword = await bcrypt.hash(userData.password, 10);
          await UserModel.update({
            password: hashedPassword,
            isActive: true
          }, {
            where: { email: userData.email },
            individualHooks: false
          });
        } catch (err) {
          console.error(`Final user check failed for ${userData.email}:`, err.message);
        }
      }
      console.log('✓ Final user verification completed.');
    } catch (error) {
      console.error('Final user verification error:', error);
    }
    
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Unable to connect to the database:', err);
    process.exit(1);
  });

module.exports = app;

