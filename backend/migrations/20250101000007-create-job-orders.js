'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('job_orders', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      product_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'products', key: 'product_id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      operation_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'operations', key: 'operation_id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      target_quantity: { type: Sequelize.INTEGER, allowNull: false },
      start_date: { type: Sequelize.DATEONLY, allowNull: false },
      end_date: { type: Sequelize.DATEONLY, allowNull: false },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });
    await queryInterface.addIndex('job_orders', ['product_id']);
    await queryInterface.addIndex('job_orders', ['operation_id']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('job_orders');
  }
};
