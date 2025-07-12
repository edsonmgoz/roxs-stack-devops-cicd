const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  // Log the error
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  // Set default error status
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || 'Internal Server Error';

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
  } else if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    message = 'Unauthorized';
  } else if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
  }

  // Don't expose error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  const errorResponse = {
    error: {
      message,
      status: statusCode,
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method
    }
  };

  // Add stack trace only in development
  if (isDevelopment) {
    errorResponse.error.stack = err.stack;
    errorResponse.error.details = err;
  }

  // Add request ID if available
  if (req.requestId) {
    errorResponse.error.requestId = req.requestId;
  }

  res.status(statusCode).json(errorResponse);
};

module.exports = errorHandler;
