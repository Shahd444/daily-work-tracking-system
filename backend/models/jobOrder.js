'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class JobOrder extends Model {
    static associate(models) {
      JobOrder.belongsTo(models.Product, { foreignKey: 'product_id', as: 'product' });
      JobOrder.belongsTo(models.Operation, { foreignKey: 'operation_id', as: 'operation' });
    }
  }

  JobOrder.init({
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    product_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'products', key: 'product_id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT'
    },
    operation_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'operations', key: 'operation_id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT'
    },
    target_quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 1 }
    },
    start_date: { type: DataTypes.DATEONLY, allowNull: false },
    end_date: { type: DataTypes.DATEONLY, allowNull: false }
  }, {
    sequelize,
    modelName: 'JobOrder',
    tableName: 'job_orders',
    timestamps: true,
    validate: {
      endNotBeforeStart() {
        if (this.start_date && this.end_date && this.end_date < this.start_date) {
          throw new Error('end_date cannot be before start_date');
        }
      }
    },
    indexes: [{ fields: ['product_id'] }, { fields: ['operation_id'] }]
  });

  return JobOrder;
};
