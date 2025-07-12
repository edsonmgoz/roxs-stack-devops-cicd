/**
 * Roxs Stack DevOps CI/CD
 * Complete DevOps Pipeline with Node.js Express
 * Author: RoxsRoss
 */
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
const winston = require('winston');
require('dotenv').config();

// Import routes
const healthRoutes = require('./routes/health');
const apiRoutes = require('./routes/api');
const adminRoutes = require('./routes/admin');

// Import middleware
const errorHandler = require('./middleware/errorHandler');
const requestLogger = require('./middleware/requestLogger');
const metricsCollector = require('./middleware/metricsCollector');

// Import utilities
const logger = require('./utils/logger');
const config = require('./config');

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "https://cdn.jsdelivr.net"],
    },
  },
}));

// CORS configuration
const corsOptions = {
  origin: config.cors.origins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true
};
app.use(cors(corsOptions));

// Rate limiting - disabled in test environment
if (NODE_ENV !== 'test' && !process.env.DISABLE_RATE_LIMIT) {
  const limiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    message: {
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: config.rateLimit.windowMs / 1000
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api/', limiter);
}

// Compression middleware
app.use(compression());

// HTTP request logging
if (NODE_ENV !== 'test') {
  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim())
    }
  }));
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Custom middleware
app.use(requestLogger);
app.use(metricsCollector);

// Static files
app.use(express.static(path.join(__dirname, '../public')));

// API Routes
app.use('/health', healthRoutes);
app.use('/api', apiRoutes);
app.use('/admin', adminRoutes);

// Root route - serve main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// API documentation route
app.get('/docs', (req, res) => {
  res.json({
    name: 'Roxs Stack DevOps CI/CD API',
    version: process.env.APP_VERSION || '1.0.0',
    environment: NODE_ENV,
    endpoints: {
      health: '/health',
      api: {
        status: '/api/status',
        version: '/api/version',
        metrics: '/api/metrics',
        users: '/api/users',
        data: '/api/data'
      },
      admin: {
        panel: '/admin',
        stats: '/api/admin/stats'
      }
    },
    documentation: 'https://github.com/roxsross/devops-roxs-node-github/blob/main/docs/API.md'
  });
});

// 404 handler
app.use('*', (req, res) => {
  logger.warn(`404 - Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    error: 'Route not found',
    method: req.method,
    path: req.originalUrl,
    timestamp: new Date().toISOString(),
    suggestion: 'Check /docs for available endpoints'
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

// Start server only if this file is run directly (not imported)
if (require.main === module) {
  const server = app.listen(PORT, '0.0.0.0', () => {
    logger.info(`🚀 Roxs Stack DevOps CI/CD Server running!`);
    logger.info(`📡 Port: ${PORT}`);
    logger.info(`🌍 Environment: ${NODE_ENV}`);
    logger.info(`🏠 URL: http://localhost:${PORT}`);
    logger.info(`📚 Docs: http://localhost:${PORT}/docs`);
    logger.info(`🏥 Health: http://localhost:${PORT}/health`);
    
    if (NODE_ENV === 'development') {
      logger.info('🔥 Hot reload enabled with nodemon');
    }
  });
}

// Export for testing
module.exports = app;
