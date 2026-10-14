'use strict';
const bcrypt = require('bcrypt');

/**
 * Creates the first admin account so the system can be used after a fresh install.
 * Credentials come from ADMIN_USERNAME / ADMIN_PASSWORD in .env.
 * Admins then create every other account from the "User management" page.
 *
 * Note: bulkInsert bypasses the model hooks, so the password is hashed here.
 */
module.exports = {
  async up(queryInterface) {
    const username = process.env.ADMIN_USERNAME;
    const password = process.env.ADMIN_PASSWORD;

    if (!username || !password) {
      throw new Error('Set ADMIN_USERNAME and ADMIN_PASSWORD in .env before running the seeders');
    }
    if (password.length < 6) {
      throw new Error('ADMIN_PASSWORD must be at least 6 characters');
    }

    const [existing] = await queryInterface.sequelize.query(
      'SELECT 1 FROM employees WHERE username = :username',
      { replacements: { username } }
    );
    if (existing.length > 0) return;

    await queryInterface.bulkInsert('employees', [{
      username,
      password: await bcrypt.hash(password, 10),
      role: 'admin',
      department_id: null,
      createdAt: new Date(),
      updatedAt: new Date()
    }]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('employees', { username: process.env.ADMIN_USERNAME, role: 'admin' });
  }
};
