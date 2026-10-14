const { Op } = require('sequelize');
const { Task, Employee, Product, Operation, RejectedTasks, ValidTasks, sequelize } = require('../models');

// Fields a technician may set on a task. Everything else (employee_id, validationStatus,
// duration, ...) is controlled by the server.
const EDITABLE_FIELDS = ['tasktype', 'startTime', 'endTime', 'product_id', 'operation_id', 'finished_operations'];

const taskInclude = () => ([
  { model: Employee, as: 'employee', attributes: { exclude: ['password'] } },
  { model: Product, as: 'product' },
  { model: Operation, as: 'operation' }
]);

const pick = (source, fields) => {
  const result = {};
  fields.forEach((field) => {
    if (source[field] !== undefined) result[field] = source[field];
  });
  return result;
};

const httpError = (status, message) => Object.assign(new Error(message), { status });

// ---------------------------------------------------------------------------
// Validated / rejected counters (valid_tasks / rejected_tasks tables).
// They are kept in sync on every status change so they always match the tasks.
// ---------------------------------------------------------------------------
const COUNTERS = {
  validated: { model: ValidTasks, field: 'validTasksNumber' },
  rejected: { model: RejectedTasks, field: 'rejectedTasksNumber' }
};

const adjustCounter = async (status, employeeId, delta, transaction) => {
  const counter = COUNTERS[status];
  if (!counter) return; // 'pending' is not counted

  const [row] = await counter.model.findOrCreate({
    where: { employee_id: employeeId },
    defaults: { [counter.field]: 0 },
    transaction
  });
  await row.update({ [counter.field]: Math.max(0, row[counter.field] + delta) }, { transaction });
};

const setValidationStatus = async (task, newStatus, transaction) => {
  const oldStatus = task.validationStatus;
  if (oldStatus === newStatus) return;
  await adjustCounter(oldStatus, task.employee_id, -1, transaction);
  await adjustCounter(newStatus, task.employee_id, +1, transaction);
  task.validationStatus = newStatus;
};

// ---------------------------------------------------------------------------
// Business rules
// ---------------------------------------------------------------------------

// Can the logged-in user review (validate / reject / cancel approval of) this task?
// Admins can review everything, supervisors only tasks of their own department,
// and nobody can review their own work.
const assertCanReview = async (reviewer, task) => {
  if (task.employee_id === reviewer.employee_id) {
    throw httpError(403, 'You cannot review your own task');
  }
  if (reviewer.role === 'admin') return;

  const owner = await Employee.findByPk(task.employee_id, { attributes: ['employee_id', 'department_id'] });
  if (!owner || !reviewer.department_id || owner.department_id !== reviewer.department_id) {
    throw httpError(403, 'You can only review tasks of your own department');
  }
};

// Checks the references of a working task and that the time slot is free.
const assertTaskIsConsistent = async (owner, data, ignoreTaskId = null) => {
  if (data.tasktype === 'working') {
    const product = await Product.findByPk(data.product_id);
    if (!product) throw httpError(400, 'Product does not exist');

    const operation = await Operation.findByPk(data.operation_id);
    if (!operation) throw httpError(400, 'Operation does not exist');

    // Technicians can only log operations of their own department
    if (owner.department_id && operation.department_id !== owner.department_id) {
      throw httpError(400, 'This operation does not belong to your department');
    }
  }

  // A person cannot be in two places at once: reject overlapping (non-rejected) entries
  const overlapping = await Task.findOne({
    where: {
      employee_id: owner.employee_id,
      validationStatus: { [Op.ne]: 'rejected' },
      startTime: { [Op.lt]: new Date(data.endTime) },
      endTime: { [Op.gt]: new Date(data.startTime) },
      ...(ignoreTaskId ? { task_id: { [Op.ne]: ignoreTaskId } } : {})
    }
  });
  if (overlapping) {
    throw httpError(400, 'This time range overlaps with another task you already logged');
  }
};

// ---------------------------------------------------------------------------
// Read endpoints
// ---------------------------------------------------------------------------

exports.getAllTasks = async (req, res, next) => {
  try {
    const tasks = await Task.findAll({
      include: taskInclude(),
      order: [['startTime', 'DESC']]
    });
    res.status(200).json(tasks);
  } catch (error) {
    next(error);
  }
};

exports.getTaskById = async (req, res, next) => {
  try {
    const task = await Task.findByPk(req.params.id, { include: taskInclude() });

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    res.status(200).json(task);
  } catch (error) {
    next(error);
  }
};

exports.getMyTasks = async (req, res, next) => {
  try {
    const tasks = await Task.findAll({
      where: { employee_id: req.employee.employee_id },
      include: [
        { model: Product, as: 'product' },
        { model: Operation, as: 'operation' }
      ],
      order: [['startTime', 'DESC']]
    });
    res.status(200).json(tasks);
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// Technician actions
// ---------------------------------------------------------------------------

exports.createTask = async (req, res, next) => {
  try {
    const data = pick(req.body, EDITABLE_FIELDS);

    // Break / blocked tasks carry no product or operation
    if (data.tasktype && data.tasktype !== 'working') {
      data.product_id = null;
      data.operation_id = null;
      data.finished_operations = 0;
    }

    // Build (not save) first so model validation and the derived duration are applied
    const task = Task.build({
      ...data,
      employee_id: req.employee.employee_id,
      validationStatus: 'pending'
    });
    await task.validate();

    await assertTaskIsConsistent(req.employee, task);
    await task.save();

    const created = await Task.findByPk(task.task_id, { include: taskInclude() });
    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
};

exports.updateTask = async (req, res, next) => {
  try {
    const me = req.employee;
    const task = await Task.findByPk(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const isOwner = task.employee_id === me.employee_id;

    await sequelize.transaction(async (transaction) => {
      // --- Reviewer action: cancel a decision (send the task back to pending) ---
      if (req.body.validationStatus !== undefined) {
        if (me.role !== 'admin' && me.role !== 'supervisor') {
          throw httpError(403, 'Only a supervisor can change the validation status');
        }
        if (req.body.validationStatus !== 'pending') {
          throw httpError(400, 'Use the validate / reject endpoints to approve or reject a task');
        }
        await assertCanReview(me, task);
        if (task.validationStatus === 'pending') {
          throw httpError(400, 'Task is already pending');
        }
        await setValidationStatus(task, 'pending', transaction);
        await task.save({ transaction });
        return;
      }

      // --- Content edit: only the owner (or an admin) ---
      if (!isOwner && me.role !== 'admin') {
        throw httpError(403, 'You can only edit your own tasks');
      }
      if (task.validationStatus === 'validated') {
        throw httpError(400, 'A validated task cannot be edited');
      }

      const owner = isOwner ? me : await Employee.findByPk(task.employee_id);
      const changes = pick(req.body, EDITABLE_FIELDS);
      task.set(changes);
      if (task.tasktype !== 'working') {
        task.product_id = null;
        task.operation_id = null;
        task.finished_operations = 0;
      }
      await task.validate();
      await assertTaskIsConsistent(owner, task, task.task_id);

      // A corrected (previously rejected) task goes back to the supervisor for review
      await setValidationStatus(task, 'pending', transaction);
      await task.save({ transaction });
    });

    const updated = await Task.findByPk(task.task_id, { include: taskInclude() });
    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
};

exports.deleteTask = async (req, res, next) => {
  try {
    const me = req.employee;
    const task = await Task.findByPk(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (task.employee_id !== me.employee_id && me.role !== 'admin') {
      return res.status(403).json({ message: 'You can only delete your own tasks' });
    }
    if (task.validationStatus === 'validated' && me.role !== 'admin') {
      return res.status(400).json({ message: 'A validated task cannot be deleted' });
    }

    await sequelize.transaction(async (transaction) => {
      await adjustCounter(task.validationStatus, task.employee_id, -1, transaction);
      await task.destroy({ transaction });
    });

    res.status(200).json({ message: 'Task deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// Supervisor actions
// ---------------------------------------------------------------------------

exports.getPendingTasks = async (req, res, next) => {
  try {
    const isSupervisor = req.employee.role === 'supervisor';
    const include = taskInclude();

    if (isSupervisor) {
      // Limit to the supervisor's own department
      include[0].where = { department_id: req.employee.department_id };
      include[0].required = true;
    }

    const tasks = await Task.findAll({
      where: { validationStatus: 'pending' },
      include,
      order: [['startTime', 'DESC']]
    });

    res.status(200).json(tasks);
  } catch (error) {
    next(error);
  }
};

const reviewTask = (newStatus) => async (req, res, next) => {
  try {
    const task = await Task.findByPk(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    await assertCanReview(req.employee, task);

    if (task.validationStatus !== 'pending') {
      return res.status(400).json({ message: 'Task is not pending validation' });
    }

    await sequelize.transaction(async (transaction) => {
      await setValidationStatus(task, newStatus, transaction);
      await task.save({ transaction });
    });

    const updated = await Task.findByPk(task.task_id, { include: taskInclude() });
    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
};

exports.validateTask = reviewTask('validated');
exports.rejectTask = reviewTask('rejected');

// Supervisor: list tasks in own department with optional filters
exports.getDepartmentTasks = async (req, res, next) => {
  try {
    const { startDate, endDate, username, status } = req.query;
    const where = {};
    if (status) {
      where.validationStatus = status;
    }
    if (startDate || endDate) {
      where.startTime = {};
      if (startDate) where.startTime[Op.gte] = new Date(startDate + 'T00:00:00Z');
      if (endDate) where.startTime[Op.lte] = new Date(endDate + 'T23:59:59Z');
    }

    // Admins have no department of their own: they see every department
    const employeeWhere = {};
    if (req.employee.role !== 'admin') {
      employeeWhere.department_id = req.employee.department_id;
    }
    if (username) {
      employeeWhere.username = username;
    }

    const include = taskInclude();
    include[0].where = employeeWhere;
    include[0].required = true;

    const tasks = await Task.findAll({
      where,
      include,
      order: [['startTime', 'DESC']]
    });
    res.status(200).json(tasks);
  } catch (error) {
    next(error);
  }
};
