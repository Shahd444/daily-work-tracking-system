const errorHandler = (err, req, res, next) => {
  const isClientError = /^Sequelize(Validation|UniqueConstraint|ForeignKeyConstraint|Database)Error$/.test(err.name)
    || (err.status && err.status < 500);
  // Stack traces only for unexpected failures, not for ordinary 4xx responses
  if (!isClientError) console.error(err.stack);

  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      message: 'Validation error',
      errors: err.errors.map(e => e.message)
    });
  }

  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(400).json({
      message: 'Duplicate entry error',
      errors: err.errors.map(e => e.message)
    });
  }

  // A referenced row does not exist (insert/update) or is still in use (delete)
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    const isDelete = err.parent && err.parent.code === '23503' && /update or delete/i.test(err.parent.message || '');
    return res.status(isDelete ? 409 : 400).json({
      message: isDelete
        ? 'Cannot delete this record because other records still depend on it'
        : 'Referenced record does not exist'
    });
  }

  // Malformed ids / enum values etc.
  if (err.name === 'SequelizeDatabaseError') {
    return res.status(400).json({ message: 'Invalid request data' });
  }

  const status = err.status || 500;
  const isDev = process.env.NODE_ENV === 'development';
  res.status(status).json({
    // Do not leak internal error details for unexpected server errors
    message: status >= 500 && !isDev ? 'Internal server error' : (err.message || 'Internal server error'),
    ...(isDev && { stack: err.stack })
  });
};

module.exports = errorHandler;
