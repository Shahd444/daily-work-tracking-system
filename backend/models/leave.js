'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Leave extends Model {
    static associate(models) {
      Leave.belongsTo(models.Employee, { foreignKey: 'employee_id', as: 'employee' });
    }
  }

  Leave.init({
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    employee_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'employees', key: 'employee_id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    leave_date: { type: DataTypes.DATEONLY, allowNull: false },
    leave_type: {
      type: DataTypes.ENUM('day_off', 'sick', 'vacation', 'emergency'),
      allowNull: false,
      defaultValue: 'day_off'
    },
    reason: { type: DataTypes.TEXT, allowNull: true },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      allowNull: false,
      defaultValue: 'pending'
    }
  }, {
    sequelize,
    modelName: 'Leave',
    tableName: 'leaves',
    timestamps: true,
    indexes: [{ unique: true, fields: ['employee_id', 'leave_date'] }]
  });

  return Leave;
};
