// Database configuration. All values come from environment variables (see .env.example).
// Used by both the app (models/index.js) and sequelize-cli (via .sequelizerc).
require('dotenv').config();

const base = {
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 5432,
  dialect: 'postgres',
  logging: false,
  // Keep track of executed seeders so `npm run seed` is safe to re-run
  seederStorage: 'sequelize',
};

module.exports = {
  development: { ...base, database: process.env.DB_NAME },
  test: { ...base, database: process.env.DB_NAME_TEST || `${process.env.DB_NAME}_test` },
  production: { ...base, database: process.env.DB_NAME },
};
