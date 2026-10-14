const { Employee, Department } = require('../models');
const { signToken } = require('../utils/jwt');

// Login employee
exports.loginEmployee = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }
    
    const employee = await Employee.findOne({ 
      where: { username: username },
      include: [{
        model: Department,
        as: 'department'
      }]
    });
    
    if (!employee) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    const isValid = await employee.validatePassword(password);
    
    if (!isValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Create JWT
    const token = signToken({ id: employee.employee_id, role: employee.role });

    // Remove password from response
    const employeeData = employee.toJSON();
    delete employeeData.password;
    
    res.status(200).json({
      message: 'Login successful',
      token,
      token_type: 'Bearer',
      expires_in: process.env.JWT_EXPIRES_IN || '7d',
      employee: employeeData
    });
  } catch (error) {
    next(error);
  }
};

// Get authenticated employee's own profile
exports.getEmployeeProfile = async (req, res, next) => {
  try {
    const employee = await Employee.findByPk(req.employee.employee_id, {
      attributes: { exclude: ['password'] },
      include: [{
        model: Department,
        as: 'department',
        attributes: ['department_id', 'department_name']
      }]
    });
    
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    
    res.status(200).json({
      message: 'Profile retrieved successfully',
      employee
    });
  } catch (error) {
    next(error);
  }
};
