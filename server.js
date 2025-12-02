const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { sequelize } = require('./config/database');
const errorHandler = require('./middleware/errorHandler');

// Load environment variables
dotenv.config();

const app = express();

// Middleware - CORS configuration
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'https://eyeclinic.aledsystems.com',
  'http://localhost:3000'
].filter(Boolean); // Remove undefined values

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || !process.env.FRONTEND_URL) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
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
          
          // Create admin user if it doesn't exist
          const adminExists = await User.findOne({ where: { email: 'admin@clinic.com' } });
          if (!adminExists) {
            const adminPassword = await bcrypt.hash('admin123', 10);
            await User.create({
              firstName: 'Admin',
              lastName: 'User',
              email: 'admin@clinic.com',
              password: adminPassword,
              role: 'admin',
              phone: '1234567890'
            });
            console.log('Admin user created: admin@clinic.com / admin123');
          }
          
          // Create doctor user if it doesn't exist
          const doctorExists = await User.findOne({ where: { email: 'doctor@clinic.com' } });
          if (!doctorExists) {
            const doctorPassword = await bcrypt.hash('doctor123', 10);
            await User.create({
              firstName: 'John',
              lastName: 'Doctor',
              email: 'doctor@clinic.com',
              password: doctorPassword,
              role: 'doctor',
              specialization: 'Ophthalmology',
              licenseNumber: 'DOC12345',
              phone: '1234567891'
            });
            console.log('Doctor user created: doctor@clinic.com / doctor123');
          }
          
          // Create receptionist user if it doesn't exist
          const receptionistExists = await User.findOne({ where: { email: 'receptionist@clinic.com' } });
          if (!receptionistExists) {
            const receptionistPassword = await bcrypt.hash('receptionist123', 10);
            await User.create({
              firstName: 'Jane',
              lastName: 'Receptionist',
              email: 'receptionist@clinic.com',
              password: receptionistPassword,
              role: 'receptionist',
              phone: '1234567892'
            });
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

