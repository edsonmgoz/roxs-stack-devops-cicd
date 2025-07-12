const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

const requestLogger = (req, res, next) => {
  // Generate unique request ID
  req.requestId = uuidv4();
  
  // Add request ID to response headers
  res.setHeader('X-Request-ID', req.requestId);

  // Log request start
  const startTime = Date.now();
  req.startTime = startTime;

  logger.info('Request started', {
    requestId: req.requestId,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    contentType: req.get('Content-Type'),
    contentLength: req.get('Content-Length'),
    timestamp: new Date().toISOString()
  });

  // Override res.end to log when request completes
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const endTime = Date.now();
    const duration = endTime - startTime;

    logger.info('Request completed', {
      requestId: req.requestId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.get('Content-Length'),
      timestamp: new Date().toISOString()
    });

    // Call original end method
    originalEnd.call(this, chunk, encoding);
  };

  next();
};

module.exports = requestLogger;
