'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Break extends Model {
    static associate(models) {
      Break.belongsTo(models.Employee, { foreignKey: 'employee_id', as: 'employee' });
    }
  }

  Break.init({
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    employee_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'employees', key: 'employee_id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    break_type: {
      type: DataTypes.ENUM('lunch', 'regular', 'emergency'),
      allowNull: false,
      defaultValue: 'regular'
    },
    break_date: { type: DataTypes.DATEONLY, allowNull: false },
    start_time: { type: DataTypes.TIME, allowNull: false },
    end_time: { type: DataTypes.TIME, allowNull: false }
  }, {
    sequelize,
    modelName: 'Break',
    tableName: 'breaks',
    timestamps: true,
    validate: {
      endAfterStart() {
        // 'HH:MM' / 'HH:MM:SS' strings compare correctly once padded to the same length
        const pad = (t) => String(t).padEnd(8, ':00').slice(0, 8);
        if (this.start_time && this.end_time && pad(this.end_time) <= pad(this.start_time)) {
          throw new Error('end_time must be after start_time');
        }
      }
    },
    indexes: [{ fields: ['employee_id', 'break_date'] }]
  });

  return Break;
};
