const { getDashboardStats } = require('../utils/statistics');

/**
 * Planner dashboard: productivity, efficiency and utilization
 * Optional query params: startDate, endDate, department_id
 */
exports.getDashboard = async (req, res, next) => {
  try {
    const { startDate, endDate, department_id } = req.query;
    const stats = await getDashboardStats({ startDate, endDate, department_id });
    res.status(200).json(stats);
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// Job orders
// ---------------------------------------------------------------------------
const { Op } = require('sequelize');
const { JobOrder, Product, Operation, Task } = require('../models');

const JOB_ORDER_FIELDS = ['product_id', 'operation_id', 'target_quantity', 'start_date', 'end_date'];

// completed_quantity is never stored: it is the sum of finished operations of the approved
// ("validated") working tasks for the same product and operation inside the job order's dates.
const withProgress = async (jobOrder) => {
  const completed = await Task.sum('finished_operations', {
    where: {
      tasktype: 'working',
      validationStatus: 'validated',
      product_id: jobOrder.product_id,
      operation_id: jobOrder.operation_id,
      startTime: {
        [Op.gte]: new Date(`${jobOrder.start_date}T00:00:00Z`),
        [Op.lte]: new Date(`${jobOrder.end_date}T23:59:59.999Z`)
      }
    }
  });

  return { ...jobOrder.toJSON(), completed_quantity: completed || 0 };
};

exports.getAllJobOrders = async (req, res, next) => {
  try {
    const jobOrders = await JobOrder.findAll({
      include: [
        { model: Product, as: 'product' },
        { model: Operation, as: 'operation' }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.status(200).json({ job_orders: await Promise.all(jobOrders.map(withProgress)) });
  } catch (error) {
    next(error);
  }
};

exports.createJobOrder = async (req, res, next) => {
  try {
    const data = {};
    JOB_ORDER_FIELDS.forEach((f) => {
      if (req.body[f] !== undefined) data[f] = req.body[f];
    });

    if (!(await Product.findByPk(data.product_id))) {
      return res.status(400).json({ message: 'Product does not exist' });
    }
    if (!(await Operation.findByPk(data.operation_id))) {
      return res.status(400).json({ message: 'Operation does not exist' });
    }

    const jobOrder = await JobOrder.create(data);
    const created = await JobOrder.findByPk(jobOrder.id, {
      include: [
        { model: Product, as: 'product' },
        { model: Operation, as: 'operation' }
      ]
    });
    res.status(201).json({ job_order: await withProgress(created) });
  } catch (error) {
    next(error);
  }
};
