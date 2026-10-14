// Drops every table and ENUM type of the application so migrations can be re-run from scratch.
// Usage: npm run db:reset   (then: npm run migrate && npm run seed)
require('dotenv').config();
const { Sequelize } = require('sequelize');
const configs = require('./config/config.js');

const env = process.env.NODE_ENV || 'development';
if (env === 'production') {
  console.error('❌ Refusing to reset the database when NODE_ENV=production');
  process.exit(1);
}

const config = configs[env];
const sequelize = new Sequelize(config.database, config.username, config.password, {
  host: config.host,
  dialect: config.dialect,
  port: config.port,
  logging: false
});

// Children first; CASCADE makes the order forgiving anyway
const tables = [
  'job_orders',
  'breaks',
  'leaves',
  'tasks',
  'valid_tasks',
  'rejected_tasks',
  'operations',
  'products',
  'employees',
  'departments',
  'SequelizeMeta',
  'SequelizeData'
];

const enumTypes = [
  'enum_employees_role',
  'enum_departments_department_name',
  'enum_tasks_tasktype',
  'enum_tasks_validationStatus',
  'enum_breaks_break_type',
  'enum_leaves_leave_type',
  'enum_leaves_status'
];

async function resetDatabase() {
  try {
    await sequelize.authenticate();
    console.log(`🔄 Connected to "${config.database}"`);

    for (const table of tables) {
      await sequelize.query(`DROP TABLE IF EXISTS "${table}" CASCADE;`);
      console.log(`  ✓ Dropped table: ${table}`);
    }
    for (const enumType of enumTypes) {
      await sequelize.query(`DROP TYPE IF EXISTS "${enumType}" CASCADE;`);
      console.log(`  ✓ Dropped ENUM: ${enumType}`);
    }

    console.log('\n✅ Database reset complete. Next: npm run migrate && npm run seed');
    await sequelize.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

resetDatabase();
