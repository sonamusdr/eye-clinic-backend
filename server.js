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
        
        // Run seed only on first deployment (check if RUN_SEED is set)
        if (process.env.RUN_SEED === 'true') {
          console.log('Running database seed...');
          const { User } = require('./models');
          const bcrypt = require('bcryptjs');
          
          // Create or update admin user
          const adminPassword = await bcrypt.hash('admin123', 10);
          const [adminUser, adminCreated] = await User.findOrCreate({
            where: { email: 'admin@clinic.com' },
            defaults: {
              firstName: 'Admin',
              lastName: 'User',
              email: 'admin@clinic.com',
              password: adminPassword,
              role: 'admin',
              phone: '1234567890',
              isActive: true
            }
          });
          
          // Update password and ensure user is active
          if (!adminCreated) {
            adminUser.password = adminPassword;
            adminUser.isActive = true;
            await adminUser.save();
            console.log('Admin user updated: admin@clinic.com / admin123');
          } else {
            console.log('Admin user created: admin@clinic.com / admin123');
          }
          
          // Create or update doctor user
          const doctorPassword = await bcrypt.hash('doctor123', 10);
          const [doctorUser, doctorCreated] = await User.findOrCreate({
            where: { email: 'doctor@clinic.com' },
            defaults: {
              firstName: 'John',
              lastName: 'Doctor',
              email: 'doctor@clinic.com',
              password: doctorPassword,
              role: 'doctor',
              specialization: 'Ophthalmology',
              licenseNumber: 'DOC12345',
              phone: '1234567891',
              isActive: true
            }
          });
          
          if (!doctorCreated) {
            doctorUser.password = doctorPassword;
            doctorUser.isActive = true;
            await doctorUser.save();
            console.log('Doctor user updated: doctor@clinic.com / doctor123');
          } else {
            console.log('Doctor user created: doctor@clinic.com / doctor123');
          }
          
          // Create or update receptionist user
          const receptionistPassword = await bcrypt.hash('receptionist123', 10);
          const [receptionistUser, receptionistCreated] = await User.findOrCreate({
            where: { email: 'receptionist@clinic.com' },
            defaults: {
              firstName: 'Jane',
              lastName: 'Receptionist',
              email: 'receptionist@clinic.com',
              password: receptionistPassword,
              role: 'receptionist',
              phone: '1234567892',
              isActive: true
            }
          });
          
          if (!receptionistCreated) {
            receptionistUser.password = receptionistPassword;
            receptionistUser.isActive = true;
            await receptionistUser.save();
            console.log('Receptionist user updated: receptionist@clinic.com / receptionist123');
          } else {
            console.log('Receptionist user created: receptionist@clinic.com / receptionist123');
          }
          
          console.log('Database seed completed.');
        }
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

