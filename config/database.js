const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');

// Only load .env file if not in Railway (Railway provides env vars directly)
// Check if we're in Railway by looking for Railway-specific env vars
if (!process.env.RAILWAY_ENVIRONMENT && !process.env.PGHOST) {
  dotenv.config();
}

// Support both Railway (PGHOST, PGPORT, etc.) and custom (DB_HOST, DB_PORT, etc.) env vars
const sequelize = new Sequelize(
  process.env.PGDATABASE || process.env.DB_NAME,
  process.env.PGUSER || process.env.DB_USER,
  process.env.PGPASSWORD || process.env.DB_PASSWORD,
  {
    host: process.env.PGHOST || process.env.DB_HOST,
    port: process.env.PGPORT || process.env.DB_PORT,
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

module.exports = { sequelize };

