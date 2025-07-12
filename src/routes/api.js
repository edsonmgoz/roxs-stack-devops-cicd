const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');
const os = require('os');
const process = require('process');
const logger = require('../utils/logger');
const metricsStore = require('../utils/metricsStore');

// In-memory storage for demo (in production use a real database)
let applicationData = [];
let users = [];

// Middleware to log API requests
router.use((req, res, next) => {
  logger.info(`API Request: ${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });
  next();
});

// API Status endpoint
router.get('/status', (req, res) => {
  const metrics = metricsStore.getMetrics();
  
  res.json({
    status: 'running',
    version: process.env.APP_VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    requests_total: metrics.requests.total,
    requests_per_minute: metrics.requests.perMinute,
    response_time_avg: metrics.performance.averageResponseTime,
    memory_usage: {
      used_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total_mb: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      usage_percent: Math.round((process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100)
    },
    data_count: applicationData.length,
    users_count: users.length,
    timestamp: new Date().toISOString()
  });
});

// Version information
router.get('/version', (req, res) => {
  res.json({
    version: process.env.APP_VERSION || '1.0.0',
    build_date: process.env.BUILD_DATE || new Date().toISOString(),
    commit_hash: process.env.COMMIT_HASH || 'unknown',
    branch: process.env.BRANCH || 'unknown',
    node_version: process.version,
    environment: process.env.NODE_ENV || 'development',
    author: 'RoxsRoss',
    repository: 'https://github.com/roxsross/devops-roxs-node-github'
  });
});

// Comprehensive metrics endpoint
router.get('/metrics', (req, res) => {
  const metrics = metricsStore.getMetrics();
  const memUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();
  
  res.json({
    application: {
      name: 'DevOps RoxS Node GitHub',
      version: process.env.APP_VERSION || '1.0.0',
      uptime_seconds: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      pid: process.pid,
      requests: {
        total: metrics.requests.total,
        success: metrics.requests.success,
        errors: metrics.requests.errors,
        per_minute: metrics.requests.perMinute
      },
      performance: {
        average_response_time_ms: metrics.performance.averageResponseTime,
        min_response_time_ms: metrics.performance.minResponseTime,
        max_response_time_ms: metrics.performance.maxResponseTime
      },
      data: {
        items_count: applicationData.length,
        users_count: users.length
      }
    },
    system: {
      hostname: os.hostname(),
      platform: os.platform(),
      architecture: os.arch(),
      node_version: process.version,
      cpu: {
        cores: os.cpus().length,
        model: os.cpus()[0]?.model || 'unknown',
        usage_user: cpuUsage.user,
        usage_system: cpuUsage.system,
        load_average: os.loadavg()
      },
      memory: {
        total_mb: Math.round(os.totalmem() / 1024 / 1024),
        free_mb: Math.round(os.freemem() / 1024 / 1024),
        used_mb: Math.round((os.totalmem() - os.freemem()) / 1024 / 1024),
        usage_percent: Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100),
        process: {
          heap_used_mb: Math.round(memUsage.heapUsed / 1024 / 1024),
          heap_total_mb: Math.round(memUsage.heapTotal / 1024 / 1024),
          external_mb: Math.round(memUsage.external / 1024 / 1024),
          rss_mb: Math.round(memUsage.rss / 1024 / 1024)
        }
      }
    },
    timestamp: new Date().toISOString()
  });
});

// Users CRUD operations
router.get('/users', (req, res) => {
  logger.info('Users list requested', { count: users.length });
  res.json({
    users: users,
    count: users.length,
    timestamp: new Date().toISOString()
  });
});

router.post('/users', (req, res) => {
  const { name, email, role } = req.body;
  
  if (!name || !email) {
    return res.status(400).json({
      error: 'Name and email are required',
      timestamp: new Date().toISOString()
    });
  }

  const newUser = {
    id: uuidv4(),
    name,
    email,
    role: role || 'user',
    created_at: new Date().toISOString(),
    last_active: new Date().toISOString()
  };

  users.push(newUser);
  logger.info('New user created', { userId: newUser.id, name, email });

  res.status(201).json(newUser);
});

router.get('/users/:id', (req, res) => {
  const user = users.find(u => u.id === req.params.id);
  
  if (!user) {
    return res.status(404).json({
      error: 'User not found',
      timestamp: new Date().toISOString()
    });
  }

  res.json(user);
});

// Data CRUD operations
router.get('/data', (req, res) => {
  const { limit = 10, offset = 0, type } = req.query;
  
  let filteredData = applicationData;
  if (type) {
    filteredData = applicationData.filter(item => item.type === type);
  }

  const paginatedData = filteredData.slice(offset, offset + parseInt(limit));
  
  res.json({
    data: paginatedData,
    total: filteredData.length,
    limit: parseInt(limit),
    offset: parseInt(offset),
    has_more: offset + parseInt(limit) < filteredData.length,
    timestamp: new Date().toISOString()
  });
});

router.post('/data', (req, res) => {
  const { content, type, metadata } = req.body;
  
  if (!content) {
    return res.status(400).json({
      error: 'Content is required',
      timestamp: new Date().toISOString()
    });
  }

  const newData = {
    id: uuidv4(),
    content,
    type: type || 'general',
    metadata: metadata || {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  applicationData.push(newData);
  logger.info('New data created', { dataId: newData.id, type: newData.type });

  res.status(201).json(newData);
});

router.get('/data/:id', (req, res) => {
  const data = applicationData.find(d => d.id === req.params.id);
  
  if (!data) {
    return res.status(404).json({
      error: 'Data not found',
      timestamp: new Date().toISOString()
    });
  }

  res.json(data);
});

router.put('/data/:id', (req, res) => {
  const dataIndex = applicationData.findIndex(d => d.id === req.params.id);
  
  if (dataIndex === -1) {
    return res.status(404).json({
      error: 'Data not found',
      timestamp: new Date().toISOString()
    });
  }

  const { content, type, metadata } = req.body;
  const updatedData = {
    ...applicationData[dataIndex],
    content: content || applicationData[dataIndex].content,
    type: type || applicationData[dataIndex].type,
    metadata: metadata || applicationData[dataIndex].metadata,
    updated_at: new Date().toISOString()
  };

  applicationData[dataIndex] = updatedData;
  logger.info('Data updated', { dataId: updatedData.id });

  res.json(updatedData);
});

router.delete('/data/:id', (req, res) => {
  const dataIndex = applicationData.findIndex(d => d.id === req.params.id);
  
  if (dataIndex === -1) {
    return res.status(404).json({
      error: 'Data not found',
      timestamp: new Date().toISOString()
    });
  }

  const deletedData = applicationData.splice(dataIndex, 1)[0];
  logger.info('Data deleted', { dataId: deletedData.id });

  res.json({
    message: 'Data deleted successfully',
    deleted_item: deletedData,
    timestamp: new Date().toISOString()
  });
});

// Logs endpoint (admin-like functionality)
router.get('/logs', (req, res) => {
  const { level = 'info', limit = 50 } = req.query;
  
  // In a real application, you would fetch from your logging system
  res.json({
    message: 'Logs endpoint - would return application logs',
    level,
    limit,
    note: 'In production, integrate with Winston or your logging service',
    timestamp: new Date().toISOString()
  });
});

// Test endpoint for creating sample data
router.post('/test/seed', (req, res) => {
  const sampleUsers = [
    { name: 'John Doe', email: 'john@example.com', role: 'admin' },
    { name: 'Jane Smith', email: 'jane@example.com', role: 'user' },
    { name: 'Bob Johnson', email: 'bob@example.com', role: 'user' }
  ];

  const sampleData = [
    { content: 'Sample content 1', type: 'test', metadata: { source: 'seed' } },
    { content: 'Sample content 2', type: 'demo', metadata: { source: 'seed' } },
    { content: 'Sample content 3', type: 'test', metadata: { source: 'seed' } }
  ];

  // Create sample users
  sampleUsers.forEach(userData => {
    const user = {
      id: uuidv4(),
      ...userData,
      created_at: new Date().toISOString(),
      last_active: new Date().toISOString()
    };
    users.push(user);
  });

  // Create sample data
  sampleData.forEach(dataItem => {
    const data = {
      id: uuidv4(),
      ...dataItem,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    applicationData.push(data);
  });

  logger.info('Test data seeded', { 
    usersCreated: sampleUsers.length, 
    dataCreated: sampleData.length 
  });

  res.json({
    message: 'Test data seeded successfully',
    users_created: sampleUsers.length,
    data_created: sampleData.length,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
