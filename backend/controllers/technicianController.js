const { Op } = require('sequelize');
const { Break, Leave } = require('../models');

// TIME columns come back as HH:MM:SS, the UI works with HH:MM
const serializeBreak = (b) => ({
  ...b.toJSON(),
  start_time: String(b.start_time).slice(0, 5),
  end_time: String(b.end_time).slice(0, 5)
});

// ---------------------------------------------------------------------------
// Breaks (own records only)
// ---------------------------------------------------------------------------

exports.getMyBreaks = async (req, res, next) => {
  try {
    const breaks = await Break.findAll({
      where: { employee_id: req.employee.employee_id },
      order: [['break_date', 'DESC'], ['start_time', 'DESC']]
    });
    res.status(200).json({ breaks: breaks.map(serializeBreak) });
  } catch (error) {
    next(error);
  }
};

exports.createBreak = async (req, res, next) => {
  try {
    const { break_type, break_date, start_time, end_time } = req.body;

    const entry = Break.build({
      employee_id: req.employee.employee_id,
      break_type,
      break_date,
      start_time,
      end_time
    });
    await entry.validate();

    // Two breaks of the same person cannot overlap
    const overlapping = await Break.findOne({
      where: {
        employee_id: req.employee.employee_id,
        break_date,
        start_time: { [Op.lt]: end_time },
        end_time: { [Op.gt]: start_time }
      }
    });
    if (overlapping) {
      return res.status(400).json({ message: 'This break overlaps with another break you already logged' });
    }

    await entry.save();
    res.status(201).json({ break: serializeBreak(entry) });
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// Leaves (own records only; reviewed by supervisors, see supervisorController)
// ---------------------------------------------------------------------------

exports.getMyLeaves = async (req, res, next) => {
  try {
    const leaves = await Leave.findAll({
      where: { employee_id: req.employee.employee_id },
      order: [['leave_date', 'DESC']]
    });
    res.status(200).json({ leaves });
  } catch (error) {
    next(error);
  }
};

exports.createLeave = async (req, res, next) => {
  try {
    const { leave_date, leave_type, reason } = req.body;

    // status is always 'pending' when requested: only a reviewer can change it
    const leave = await Leave.create({
      employee_id: req.employee.employee_id,
      leave_date,
      leave_type,
      reason: reason || null,
      status: 'pending'
    });
    res.status(201).json({ leave });
  } catch (error) {
    next(error);
  }
};
