const { sequelize } = require('../config/database');
const { Procedure, TherapySchedule, StudyResult, MedicalCertificate, InsuranceAuthorization } = require('../models');

async function createNewTables() {
  try {
    console.log('Creating new tables for additional sections...');
    
    // Create tables one by one (sync will only create if they don't exist)
    console.log('Creating procedures table...');
    await Procedure.sync({ alter: false });
    console.log('✅ Procedures table ready');
    
    console.log('Creating therapy_schedules table...');
    await TherapySchedule.sync({ alter: false });
    console.log('✅ Therapy schedules table ready');
    
    console.log('Creating study_results table...');
    await StudyResult.sync({ alter: false });
    console.log('✅ Study results table ready');
    
    console.log('Creating medical_certificates table...');
    await MedicalCertificate.sync({ alter: false });
    console.log('✅ Medical certificates table ready');
    
    console.log('Creating insurance_authorizations table...');
    await InsuranceAuthorization.sync({ alter: false });
    console.log('✅ Insurance authorizations table ready');
    
    console.log('\n✅ All new tables created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  sequelize.authenticate()
    .then(() => {
      console.log('Database connection established.');
      return createNewTables();
    })
    .catch(error => {
      console.error('Database connection failed:', error);
      process.exit(1);
    });
}

module.exports = createNewTables;

