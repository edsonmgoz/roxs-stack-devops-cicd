const express = require('express');
const router = express.Router();
const path = require('path');
const os = require('os');
const process = require('process');
const logger = require('../utils/logger');
const metricsStore = require('../utils/metricsStore');

// Admin panel route - serve HTML page
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/admin.html'));
});

// Admin API routes
router.get('/api/stats', (req, res) => {
  const metrics = metricsStore.getMetrics();
  const memUsage = process.memoryUsage();
  
  const stats = {
    overview: {
      status: 'running',
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.APP_VERSION || '1.0.0',
      node_version: process.version
    },
    performance: {
      requests: {
        total: metrics.requests.total,
        success: metrics.requests.success,
        errors: metrics.requests.errors,
        success_rate: metrics.requests.total > 0 
          ? Math.round((metrics.requests.success / metrics.requests.total) * 100) 
          : 100
      },
      response_times: {
        average: metrics.performance.averageResponseTime,
        min: metrics.performance.minResponseTime,
        max: metrics.performance.maxResponseTime
      },
      traffic: {
        requests_per_minute: metrics.requests.perMinute,
        peak_rpm: metrics.requests.peakRPM || 0
      }
    },
    system: {
      memory: {
        heap_used_mb: Math.round(memUsage.heapUsed / 1024 / 1024),
        heap_total_mb: Math.round(memUsage.heapTotal / 1024 / 1024),
        system_total_mb: Math.round(os.totalmem() / 1024 / 1024),
        system_free_mb: Math.round(os.freemem() / 1024 / 1024),
        usage_percent: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)
      },
      cpu: {
        cores: os.cpus().length,
        model: os.cpus()[0]?.model || 'unknown',
        load_average: os.loadavg(),
        load_1min: os.loadavg()[0],
        load_5min: os.loadavg()[1],
        load_15min: os.loadavg()[2]
      },
      platform: {
        hostname: os.hostname(),
        platform: os.platform(),
        architecture: os.arch(),
        uptime: os.uptime()
      }
    },
    health: {
      database: 'connected', // Simulated
      cache: 'connected',     // Simulated
      external_apis: 'healthy', // Simulated
      disk_space: 'sufficient'  // Simulated
    },
    recent_activity: metrics.recentRequests || [],
    timestamp: new Date().toISOString()
  };

  logger.info('Admin stats requested', { ip: req.ip });
  res.json(stats);
});

// Clear cache endpoint
router.post('/api/cache/clear', (req, res) => {
  try {
    // In a real application, you would clear actual cache here
    // For demo purposes, we'll just reset some metrics
    metricsStore.resetMetrics();
    
    logger.info('Cache cleared by admin', { ip: req.ip });
    
    res.json({
      success: true,
      message: 'Cache cleared successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to clear cache', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to clear cache',
      timestamp: new Date().toISOString()
    });
  }
});

// System information endpoint
router.get('/api/system', (req, res) => {
  const systemInfo = {
    server: {
      hostname: os.hostname(),
      platform: os.platform(),
      architecture: os.arch(),
      uptime: os.uptime(),
      node_version: process.version,
      pid: process.pid
    },
    cpu: {
      model: os.cpus()[0]?.model || 'unknown',
      cores: os.cpus().length,
      speed: os.cpus()[0]?.speed || 0,
      load_average: os.loadavg()
    },
    memory: {
      total: os.totalmem(),
      free: os.freemem(),
      used: os.totalmem() - os.freemem(),
      usage_percent: Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100)
    },
    process: {
      memory_usage: process.memoryUsage(),
      cpu_usage: process.cpuUsage(),
      uptime: process.uptime(),
      versions: process.versions
    },
    network: {
      interfaces: os.networkInterfaces()
    },
    timestamp: new Date().toISOString()
  };

  res.json(systemInfo);
});

// Restart application endpoint (simulation)
router.post('/api/restart', (req, res) => {
  logger.warn('Application restart requested', { ip: req.ip });
  
  res.json({
    message: 'Restart command received',
    note: 'In production, this would restart the application',
    timestamp: new Date().toISOString()
  });

  // In a real application with PM2 or similar:
  // process.exit(0);
});

// Health check for admin panel
router.get('/api/health', (req, res) => {
  const healthStatus = {
    status: 'healthy',
    services: {
      web_server: 'running',
      database: 'connected',
      cache: 'connected',
      file_system: 'accessible',
      external_apis: 'responding'
    },
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  };

  res.json(healthStatus);
});

// Configuration endpoint
router.get('/api/config', (req, res) => {
  const config = {
    environment: process.env.NODE_ENV || 'development',
    version: process.env.APP_VERSION || '1.0.0',
    port: process.env.PORT || 3000,
    node_env: process.env.NODE_ENV || 'development',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    settings: {
      rate_limiting: {
        enabled: true,
        max_requests: 100,
        window_minutes: 15
      },
      logging: {
        level: process.env.LOG_LEVEL || 'info',
        format: 'json'
      },
      security: {
        helmet_enabled: true,
        cors_enabled: true
      }
    },
    build_info: {
      commit: process.env.COMMIT_HASH || 'unknown',
      build_date: process.env.BUILD_DATE || 'unknown',
      branch: process.env.BRANCH || 'unknown'
    },
    timestamp: new Date().toISOString()
  };

  res.json(config);
});

// Logs endpoint for admin
router.get('/api/logs', (req, res) => {
  const { level = 'info', limit = 100, offset = 0 } = req.query;
  
  // In a real application, you would fetch actual logs
  const simulatedLogs = Array.from({ length: parseInt(limit) }, (_, i) => ({
    id: i + parseInt(offset) + 1,
    timestamp: new Date(Date.now() - (i * 60000)).toISOString(),
    level: ['info', 'warn', 'error'][Math.floor(Math.random() * 3)],
    message: `Sample log message ${i + parseInt(offset) + 1}`,
    source: ['app', 'api', 'admin'][Math.floor(Math.random() * 3)],
    metadata: {
      ip: '192.168.1.' + Math.floor(Math.random() * 255),
      endpoint: ['/api/users', '/api/data', '/health'][Math.floor(Math.random() * 3)]
    }
  }));

  res.json({
    logs: simulatedLogs,
    total: 1000, // Simulated total
    limit: parseInt(limit),
    offset: parseInt(offset),
    level,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
