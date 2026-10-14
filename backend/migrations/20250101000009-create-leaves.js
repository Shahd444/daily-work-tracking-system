'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('leaves', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      employee_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'employees', key: 'employee_id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      leave_date: { type: Sequelize.DATEONLY, allowNull: false },
      leave_type: {
        type: Sequelize.ENUM('day_off', 'sick', 'vacation', 'emergency'),
        allowNull: false,
        defaultValue: 'day_off'
      },
      reason: { type: Sequelize.TEXT, allowNull: true },
      status: {
        type: Sequelize.ENUM('pending', 'approved', 'rejected'),
        allowNull: false,
        defaultValue: 'pending'
      },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });
    // One leave request per employee and day
    await queryInterface.addIndex('leaves', ['employee_id', 'leave_date'], {
      unique: true,
      name: 'leaves_employee_id_leave_date_unique'
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('leaves');
  }
};
