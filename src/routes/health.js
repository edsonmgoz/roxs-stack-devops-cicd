const express = require('express');
const router = express.Router();
const os = require('os');
const process = require('process');
const logger = require('../utils/logger');

// Health check endpoint
router.get('/', (req, res) => {
  try {
    const healthCheck = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      node_version: process.version,
      platform: process.platform,
      architecture: process.arch,
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        external: Math.round(process.memoryUsage().external / 1024 / 1024)
      },
      system: {
        hostname: os.hostname(),
        platform: os.platform(),
        arch: os.arch(),
        cpus: os.cpus().length,
        total_memory: Math.round(os.totalmem() / 1024 / 1024),
        free_memory: Math.round(os.freemem() / 1024 / 1024),
        load_average: os.loadavg()
      }
    };

    logger.info('Health check requested', { 
      ip: req.ip, 
      userAgent: req.get('User-Agent'),
      uptime: healthCheck.uptime 
    });

    res.status(200).json(healthCheck);
  } catch (error) {
    logger.error('Health check failed', { error: error.message, stack: error.stack });
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Detailed health check with dependencies
router.get('/detailed', (req, res) => {
  try {
    const checks = {
      server: 'healthy',
      database: 'healthy', // Simulated - in real app check actual DB
      cache: 'healthy',     // Simulated - in real app check Redis/etc
      external_apis: 'healthy' // Simulated - in real app check external services
    };

    const overallStatus = Object.values(checks).every(status => status === 'healthy') 
      ? 'healthy' 
      : 'degraded';

    const detailedHealth = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks,
      uptime: process.uptime(),
      version: process.env.APP_VERSION || '1.0.0',
      build_info: {
        commit: process.env.COMMIT_HASH || 'unknown',
        build_date: process.env.BUILD_DATE || 'unknown',
        branch: process.env.BRANCH || 'unknown'
      }
    };

    const statusCode = overallStatus === 'healthy' ? 200 : 503;
    res.status(statusCode).json(detailedHealth);
  } catch (error) {
    logger.error('Detailed health check failed', { error: error.message });
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Liveness probe (for Kubernetes)
router.get('/live', (req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString()
  });
});

// Readiness probe (for Kubernetes)
router.get('/ready', (req, res) => {
  // In a real app, check if all dependencies are ready
  const isReady = true; // Simulate readiness check
  
  if (isReady) {
    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString()
    });
  } else {
    res.status(503).json({
      status: 'not_ready',
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
