const crypto = require('crypto');
const { Employee, Department } = require('../models');

// Password generator backed by a CSPRNG (Math.random is predictable)
function generatePassword(length = 12) {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*';
  const allChars = uppercase + lowercase + numbers + symbols;
  const pick = (chars) => chars[crypto.randomInt(chars.length)];

  // Guarantee one character of each class, fill the rest randomly
  const chars = [pick(uppercase), pick(lowercase), pick(numbers), pick(symbols)];
  while (chars.length < length) {
    chars.push(pick(allChars));
  }

  // Fisher-Yates shuffle
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join('');
}

const ROLES = ['admin', 'planner', 'supervisor', 'technicien'];
const ROLES_WITH_DEPARTMENT = ['supervisor', 'technicien'];

/**
 * Generate unique password for a new user
 */
exports.generatePassword = async (req, res, next) => {
  try {
    const password = generatePassword();
    res.status(200).json({
      password,
      message: 'Password generated successfully. Please save this password securely.'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get per-employee productivity and validation statistics
 * Optional query params: startDate, endDate, department_id
 */
exports.getEmployeesStats = async (req, res, next) => {
  try {
    const { startDate, endDate, department_id } = req.query;
    const { Task, Product, Operation } = require('../models');
    const { Op, fn, col, literal } = require('sequelize');

    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter[Op.and] = [];
      if (startDate) {
        dateFilter[Op.and].push({ startTime: { [Op.gte]: new Date(startDate) } });
      }
      if (endDate) {
        // Include the whole end day
        const endOfDay = new Date(endDate);
        endOfDay.setUTCHours(23, 59, 59, 999);
        dateFilter[Op.and].push({ startTime: { [Op.lte]: endOfDay } });
      }
    }

    const employeeWhere = {};
    if (department_id) employeeWhere.department_id = department_id;

    // Fetch employees (filter by department if provided)
    const employees = await Employee.findAll({
      where: employeeWhere,
      attributes: ['employee_id', 'username', 'role', 'department_id'],
      raw: true
    });

    if (employees.length === 0) {
      return res.status(200).json([]);
    }

    const employeeIds = employees.map((e) => e.employee_id);

    // Aggregate tasks by employee with validation status and sums
    const taskAggregates = await Task.findAll({
      where: {
        employee_id: { [Op.in]: employeeIds },
        ...(Object.keys(dateFilter).length ? dateFilter : {})
      },
      attributes: [
        'employee_id',
        [fn('COUNT', col('task_id')), 'totalTasks'],
        [fn('SUM', literal("CASE WHEN \"Task\".\"validationStatus\" = 'validated' THEN 1 ELSE 0 END")), 'validatedTasks'],
        [fn('SUM', literal("CASE WHEN \"Task\".\"validationStatus\" = 'rejected' THEN 1 ELSE 0 END")), 'rejectedTasks'],
        [fn('SUM', literal("CASE WHEN \"Task\".\"validationStatus\" = 'pending' THEN 1 ELSE 0 END")), 'pendingTasks'],
        // Output only counts approved work; breaks / waiting time are not productive time
        [fn('SUM', literal("CASE WHEN \"Task\".\"validationStatus\" = 'validated' AND \"Task\".\"tasktype\" = 'working' THEN \"Task\".\"finished_operations\" ELSE 0 END")), 'totalFinishedOperations'],
        [fn('SUM', literal("CASE WHEN \"Task\".\"validationStatus\" = 'validated' AND \"Task\".\"tasktype\" = 'working' THEN \"Task\".\"duration\" ELSE 0 END")), 'totalMinutes']
      ],
      group: ['employee_id'],
      raw: true
    });

    // Per-employee product breakdown (counts of tasks by product)
    const productBreakdownRows = await Task.findAll({
      where: {
        employee_id: { [Op.in]: employeeIds },
        ...(Object.keys(dateFilter).length ? dateFilter : {})
      },
      attributes: [
        'employee_id', 'product_id',
        [fn('COUNT', col('task_id')), 'tasksCount']
      ],
      group: ['employee_id', 'product_id'],
      raw: true
    });

    // Per-employee operation breakdown (counts of tasks by operation and validation)
    const operationBreakdownRows = await Task.findAll({
      where: {
        employee_id: { [Op.in]: employeeIds },
        ...(Object.keys(dateFilter).length ? dateFilter : {})
      },
      attributes: [
        'employee_id', 'operation_id', 'validationStatus',
        [fn('COUNT', col('task_id')), 'tasksCount'],
        [fn('SUM', col('finished_operations')), 'finishedOperations']
      ],
      group: ['employee_id', 'operation_id', 'validationStatus'],
      raw: true
    });

    // Index aggregates by employee_id
    const aggByEmp = new Map();
    taskAggregates.forEach((row) => aggByEmp.set(row.employee_id, row));

    const productsByEmp = new Map();
    productBreakdownRows.forEach((row) => {
      if (!productsByEmp.has(row.employee_id)) productsByEmp.set(row.employee_id, []);
      productsByEmp.get(row.employee_id).push({
        product_id: row.product_id,
        tasksCount: Number(row.tasksCount)
      });
    });

    const operationsByEmp = new Map();
    operationBreakdownRows.forEach((row) => {
      if (!operationsByEmp.has(row.employee_id)) operationsByEmp.set(row.employee_id, []);
      operationsByEmp.get(row.employee_id).push({
        operation_id: row.operation_id,
        validationStatus: row.validationStatus,
        tasksCount: Number(row.tasksCount),
        finishedOperations: Number(row.finishedOperations || 0)
      });
    });

    const result = employees.map((emp) => {
      const agg = aggByEmp.get(emp.employee_id) || {};
      const totalMinutes = Number(agg.totalMinutes || 0);
      const totalFinished = Number(agg.totalFinishedOperations || 0);
      const productivityPerHour = totalMinutes > 0 ? (totalFinished / (totalMinutes / 60)) : 0;

      return {
        employee_id: emp.employee_id,
        username: emp.username,
        role: emp.role,
        department_id: emp.department_id,
        totals: {
          totalTasks: Number(agg.totalTasks || 0),
          validated: Number(agg.validatedTasks || 0),
          rejected: Number(agg.rejectedTasks || 0),
          pending: Number(agg.pendingTasks || 0)
        },
        output: {
          totalFinishedOperations: totalFinished,
          productivityPerHour: Number(productivityPerHour.toFixed(2))
        },
        breakdowns: {
          products: productsByEmp.get(emp.employee_id) || [],
          operations: operationsByEmp.get(emp.employee_id) || []
        }
      };
    });

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Create new user
 */
exports.createUser = async (req, res, next) => {
  try {
    const { username, role, password, department_id } = req.body;

    if (!username || !role) {
      return res.status(400).json({ message: 'Username and role are required' });
    }

    // Validate role
    if (!ROLES.includes(role)) {
      return res.status(400).json({
        message: 'Role must be one of: admin, planner, supervisor, technicien'
      });
    }

    // Validate department_id for supervisor and technicien
    if ((role === 'supervisor' || role === 'technicien') && !department_id) {
      return res.status(400).json({
        message: `Department ID is required for ${role} role`
      });
    }

    // Admins and planners are not tied to a department
    let finalDepartmentId = null;
    if (ROLES_WITH_DEPARTMENT.includes(role)) {
      const department = await Department.findByPk(department_id);
      if (!department) {
        return res.status(400).json({ message: 'Department does not exist' });
      }
      finalDepartmentId = department.department_id;
    }

    // Generate password if not provided
    const finalPassword = password || generatePassword();

    const newUser = await Employee.create({
      username,
      role,
      password: finalPassword,
      department_id: finalDepartmentId
    });

    const userResponse = newUser.toJSON();
    delete userResponse.password;

    res.status(201).json({
      message: 'User created successfully',
      user: userResponse,
      generatedPassword: !password ? finalPassword : undefined
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all users
 */
exports.getAllUsers = async (req, res, next) => {
  try {
    const { role, department_id } = req.query;

    const whereClause = {};
    if (role) whereClause.role = role;
    if (department_id) whereClause.department_id = department_id;

    const users = await Employee.findAll({
      where: whereClause,
      attributes: { exclude: ['password'] },
      include: [{
        model: Department,
        as: 'department'
      }],
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json(users);
  } catch (error) {
    next(error);
  }
};

/**
 * Get user by ID
 */
exports.getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await Employee.findByPk(id, {
      attributes: { exclude: ['password'] },
      include: [{
        model: Department,
        as: 'department'
      }]
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
};

/**
 * Update user
 */
exports.updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { username, role, department_id } = req.body;

    const user = await Employee.findByPk(id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (role !== undefined && !ROLES.includes(role)) {
      return res.status(400).json({
        message: 'Role must be one of: admin, planner, supervisor, technicien'
      });
    }

    // An admin must not lock themselves out by changing their own role
    if (role && role !== user.role && req.employee.employee_id === user.employee_id) {
      return res.status(400).json({ message: 'You cannot change your own role' });
    }

    const targetRole = role || user.role;
    const updateData = {};
    if (username) updateData.username = username;
    if (role) updateData.role = role;

    if (ROLES_WITH_DEPARTMENT.includes(targetRole)) {
      // Keep the current department unless a new one is given
      const targetDepartmentId = department_id !== undefined ? department_id : user.department_id;
      if (!targetDepartmentId) {
        return res.status(400).json({ message: `Department ID is required for ${targetRole} role` });
      }
      const department = await Department.findByPk(targetDepartmentId);
      if (!department) {
        return res.status(400).json({ message: 'Department does not exist' });
      }
      updateData.department_id = department.department_id;
    } else {
      // admin / planner have no department
      updateData.department_id = null;
    }

    await user.update(updateData);

    const userResponse = user.toJSON();
    delete userResponse.password;

    res.status(200).json({
      message: 'User updated successfully',
      user: userResponse
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete user
 */
exports.deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (req.employee && req.employee.employee_id === parseInt(id)) {
      return res.status(400).json({ message: 'You cannot delete your own account' });
    }

    const user = await Employee.findByPk(id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await user.destroy();

    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * Reset user password
 */
exports.resetPassword = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    const user = await Employee.findByPk(id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const finalPassword = newPassword || generatePassword();

    await user.update({ password: finalPassword });

    res.status(200).json({
      message: 'Password reset successfully',
      newPassword: finalPassword
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get system statistics (Admin dashboard)
 */
exports.getSystemStats = async (req, res, next) => {
  try {
    const { Task, Product, Operation, Department } = require('../models');

    const [
      totalEmployees,
      totalProducts,
      totalOperations,
      totalTasks,
      pendingTasks,
      validatedTasks,
      rejectedTasks,
      totalDepartments
    ] = await Promise.all([
      Employee.count(),
      Product.count(),
      Operation.count(),
      Task.count(),
      Task.count({ where: { validationStatus: 'pending' } }),
      Task.count({ where: { validationStatus: 'validated' } }),
      Task.count({ where: { validationStatus: 'rejected' } }),
      Department.count()
    ]);

    const employeesByRole = await Employee.findAll({
      attributes: [
        'role',
        [Employee.sequelize.fn('COUNT', Employee.sequelize.col('employee_id')), 'count']
      ],
      group: ['role'],
      raw: true
    });

    res.status(200).json({
      totalEmployees,
      totalProducts,
      totalOperations,
      totalTasks,
      pendingTasks,
      validatedTasks,
      rejectedTasks,
      totalDepartments,
      employeesByRole,
      generatedAt: new Date()
    });
  } catch (error) {
    next(error);
  }
};
