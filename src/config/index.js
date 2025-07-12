require('dotenv').config();

const config = {
  // Server configuration
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || '0.0.0.0',
    environment: process.env.NODE_ENV || 'development'
  },

  // Application configuration
  app: {
    name: 'DevOps RoxS Node GitHub',
    version: process.env.APP_VERSION || '1.0.0',
    description: 'Complete DevOps project with Node.js, Express and automated CI/CD'
  },

  // CORS configuration
  cors: {
    origins: process.env.NODE_ENV === 'production' 
      ? ['https://devops-roxs-node.com', 'https://staging.devops-roxs-node.com']
      : ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000']
  },

  // Rate limiting configuration
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX) || 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
  },

  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || 'logs/app.log',
    maxSize: parseInt(process.env.LOG_MAX_SIZE) || 5242880, // 5MB
    maxFiles: parseInt(process.env.LOG_MAX_FILES) || 5
  },

  // Security configuration
  security: {
    helmet: {
      contentSecurityPolicy: process.env.NODE_ENV === 'production',
      hsts: process.env.NODE_ENV === 'production'
    },
    session: {
      secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: parseInt(process.env.SESSION_MAX_AGE) || 24 * 60 * 60 * 1000 // 24 hours
    }
  },

  // Database configuration (for future use)
  database: {
    url: process.env.DATABASE_URL || 'mongodb://localhost:27017/devops-roxs-node',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: parseInt(process.env.DB_MAX_POOL_SIZE) || 10
    }
  },

  // Redis configuration (for future use)
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    password: process.env.REDIS_PASSWORD || null,
    db: parseInt(process.env.REDIS_DB) || 0
  },

  // External services
  external: {
    telegram: {
      botToken: process.env.TELEGRAM_BOT_TOKEN,
      chatId: process.env.TELEGRAM_CHAT_ID
    }
  },

  // Build information
  build: {
    commitHash: process.env.COMMIT_HASH || 'unknown',
    buildDate: process.env.BUILD_DATE || new Date().toISOString(),
    branch: process.env.BRANCH || 'unknown',
    buildNumber: process.env.BUILD_NUMBER || 'unknown'
  },

  // Feature flags
  features: {
    metricsCollection: process.env.ENABLE_METRICS !== 'false',
    requestLogging: process.env.ENABLE_REQUEST_LOGGING !== 'false',
    adminPanel: process.env.ENABLE_ADMIN_PANEL !== 'false',
    healthChecks: process.env.ENABLE_HEALTH_CHECKS !== 'false'
  }
};

module.exports = config;
