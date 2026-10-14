const { Leave, Employee } = require('../models');

const leaveInclude = (reviewer) => ([{
  model: Employee,
  as: 'employee',
  attributes: { exclude: ['password'] },
  required: true,
  // Supervisors only see their own department, admins see everyone
  ...(reviewer.role === 'supervisor' ? { where: { department_id: reviewer.department_id } } : {})
}]);

exports.getLeaves = async (req, res, next) => {
  try {
    const where = {};
    if (req.query.status) where.status = req.query.status;

    const leaves = await Leave.findAll({
      where,
      include: leaveInclude(req.employee),
      order: [['leave_date', 'DESC']]
    });
    res.status(200).json({ leaves });
  } catch (error) {
    next(error);
  }
};

const reviewLeave = (newStatus) => async (req, res, next) => {
  try {
    const leave = await Leave.findOne({
      where: { id: req.params.id },
      include: leaveInclude(req.employee)
    });

    if (!leave) {
      return res.status(404).json({ message: 'Leave request not found' });
    }
    if (leave.employee_id === req.employee.employee_id) {
      return res.status(403).json({ message: 'You cannot review your own leave request' });
    }
    if (leave.status !== 'pending') {
      return res.status(400).json({ message: 'Leave request is not pending' });
    }

    await leave.update({ status: newStatus });
    res.status(200).json({ leave });
  } catch (error) {
    next(error);
  }
};

exports.approveLeave = reviewLeave('approved');
exports.rejectLeave = reviewLeave('rejected');
