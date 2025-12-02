const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { sequelize } = require('./config/database');
const errorHandler = require('./middleware/errorHandler');

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

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Eye Clinic Management System API is running' });
});

// Error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Heroku uses process.env.PORT, so this is already configured correctly

// Database connection and server start
sequelize.authenticate()
  .then(async () => {
    console.log('Database connection established successfully.');
    
    // Run migrations automatically on startup (only in production or if RUN_MIGRATIONS is set)
    if (process.env.NODE_ENV === 'production' || process.env.RUN_MIGRATIONS === 'true') {
      try {
        console.log('Running database migrations...');
        const models = require('./models');
        await sequelize.sync({ force: false, alter: true });
        console.log('Database migrations completed successfully.');
        
        // CRITICAL: Always ensure default users exist and are active
        // This runs on EVERY server startup to prevent lockouts
        console.log('Ensuring critical system users are active...');
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
        
        // Use upsert to ensure users exist and are always active
        for (const userData of criticalUsers) {
          try {
            const existingUser = await User.findOne({ where: { email: userData.email } });
            
            if (existingUser) {
              // Force activation and password reset (in case it was changed)
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
                individualHooks: false // Skip hooks to avoid validation errors
              });
              console.log(`✓ Critical user activated: ${userData.email}`);
            } else {
              // Create new user
              const hashedPassword = await bcrypt.hash(userData.password, 10);
              await User.create({
                ...userData,
                password: hashedPassword,
                isActive: true
              });
              console.log(`✓ Critical user created: ${userData.email}`);
            }
          } catch (error) {
            console.error(`ERROR: Failed to ensure user ${userData.email} is active:`, error.message);
            // Don't throw - continue with other users
          }
        }
        
        console.log('✓ Critical system users check completed.');
      } catch (migrationError) {
        console.error('Migration error:', migrationError);
        // Don't exit - server can still run even if migrations fail
      }
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

