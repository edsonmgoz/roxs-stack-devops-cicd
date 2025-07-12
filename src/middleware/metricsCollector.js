const metricsStore = require('../utils/metricsStore');

const metricsCollector = (req, res, next) => {
  const startTime = Date.now();

  // Override res.end to collect metrics when request completes
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const endTime = Date.now();
    const responseTime = endTime - startTime;

    // Collect metrics
    metricsStore.recordRequest({
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      responseTime,
      timestamp: new Date().toISOString(),
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Call original end method
    originalEnd.call(this, chunk, encoding);
  };

  next();
};

module.exports = metricsCollector;
