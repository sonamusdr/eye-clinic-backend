const { User } = require('../models');
const bcrypt = require('bcryptjs');

async function seed() {
  try {
    console.log('Seeding database...');

    // Create admin user
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

    // Create doctor user
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

    // Create receptionist user
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

    console.log('Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

seed();

