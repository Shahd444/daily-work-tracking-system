const { Operation, Department } = require('../models');

const OPERATION_FIELDS = ['name', 'department_id', 'minimum_per_min'];
const pick = (source, fields) =>
  fields.reduce((acc, f) => (source[f] !== undefined ? { ...acc, [f]: source[f] } : acc), {});

exports.getAllOperations = async (req, res, next) => {
  try {
    const operations = await Operation.findAll({
      include: [{
        model: Department,
        as: 'department'
      }],
      order: [['operation_id', 'ASC']]
    });
    res.status(200).json(operations);
  } catch (error) {
    next(error);
  }
};

exports.getOperationById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const operation = await Operation.findByPk(id, {
      include: [{
        model: Department,
        as: 'department'
      }]
    });
    
    if (!operation) {
      return res.status(404).json({ message: 'Operation not found' });
    }
    
    res.status(200).json(operation);
  } catch (error) {
    next(error);
  }
};

exports.createOperation = async (req, res, next) => {
  try {
    const operation = await Operation.create(pick(req.body, OPERATION_FIELDS));
    const operationWithDetails = await Operation.findByPk(operation.operation_id, {
      include: [{
        model: Department,
        as: 'department'
      }]
    });
    res.status(201).json(operationWithDetails);
  } catch (error) {
    next(error);
  }
};

exports.updateOperation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const operation = await Operation.findByPk(id);

    if (!operation) {
      return res.status(404).json({ message: 'Operation not found' });
    }

    await operation.update(pick(req.body, OPERATION_FIELDS));

    const updatedOperation = await Operation.findByPk(id, {
      include: [{
        model: Department,
        as: 'department'
      }]
    });
    res.status(200).json(updatedOperation);
  } catch (error) {
    next(error);
  }
};

exports.deleteOperation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await Operation.destroy({
      where: { operation_id: id }
    });
    
    if (!deleted) {
      return res.status(404).json({ message: 'Operation not found' });
    }
    
    res.status(200).json({ message: 'Operation deleted successfully' });
  } catch (error) {
    next(error);
  }
};

