const { Task, Operation } = require('../models');
const { Op } = require('sequelize');

// A working day is 9 hours minus a 1 hour lunch break
const WORK_MINUTES_PER_DAY = 8 * 60;

const round2 = (n) => Number(n.toFixed(2));
const percent = (part, whole) => (whole > 0 ? round2((part / whole) * 100) : 0);

/**
 * Planner dashboard figures, computed from approved ("validated") working tasks only:
 *
 *  - target output   = sum(duration * operation.minimum_per_min)   what should have been produced
 *  - actual output   = sum(finished_operations)                    what was produced
 *  - productivity    = actual output / target output
 *  - standard time   = sum(finished_operations / minimum_per_min)  time the work should have taken
 *  - actual time     = sum(duration)                               time it did take
 *  - efficiency      = standard time / actual time
 *  - utilization     = actual time / (worked days * 8h)            per employee and day
 *
 * Optional filters: startDate, endDate (YYYY-MM-DD), department_id.
 */
const getDashboardStats = async ({ startDate, endDate, department_id } = {}) => {
  const where = { validationStatus: 'validated', tasktype: 'working' };

  if (startDate || endDate) {
    where.startTime = {};
    if (startDate) where.startTime[Op.gte] = new Date(`${startDate}T00:00:00Z`);
    if (endDate) where.startTime[Op.lte] = new Date(`${endDate}T23:59:59Z`);
  }

  const operationInclude = {
    model: Operation,
    as: 'operation',
    attributes: ['operation_id', 'department_id', 'minimum_per_min'],
    required: true
  };
  if (department_id) operationInclude.where = { department_id };

  const tasks = await Task.findAll({
    where,
    attributes: ['task_id', 'employee_id', 'startTime', 'duration', 'finished_operations'],
    include: [operationInclude]
  });

  let actualOutput = 0;
  let targetOutput = 0;
  let actualTime = 0;
  let standardTime = 0;
  const workedDays = new Set();

  tasks.forEach((task) => {
    const rate = Number(task.operation.minimum_per_min);
    actualOutput += task.finished_operations;
    actualTime += task.duration;
    targetOutput += task.duration * rate;
    if (rate > 0) standardTime += task.finished_operations / rate;
    workedDays.add(`${task.employee_id}|${new Date(task.startTime).toISOString().slice(0, 10)}`);
  });

  return {
    productivity: percent(actualOutput, targetOutput),
    efficiency: percent(standardTime, actualTime),
    utilization: percent(actualTime, workedDays.size * WORK_MINUTES_PER_DAY),
    actual_output: actualOutput,
    target_output: round2(targetOutput),
    actual_time: actualTime,
    standard_time: round2(standardTime),
    tasks_count: tasks.length,
    generatedAt: new Date()
  };
};

module.exports = { getDashboardStats };
