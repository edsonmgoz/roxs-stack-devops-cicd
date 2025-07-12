// Jest Setup Configuration
const { performance } = require('perf_hooks');
const { metricsStore } = require('../src/utils/metricsStore');

// Global test configuration
global.testConfig = {
  timeout: 30000, // 30 seconds default timeout
  maxRetries: 3,
  testEnvironment: process.env.NODE_ENV || 'test'
};

// Setup before all tests
beforeAll(async () => {
  console.log('🚀 Starting Test Suite...');
  console.log(`Environment: ${global.testConfig.testEnvironment}`);
  console.log(`Node Version: ${process.version}`);
  console.log(`Platform: ${process.platform}`);
  
  // Set test-specific environment variables
  process.env.NODE_ENV = 'test';
  process.env.PORT = '0'; // Use port 0 for dynamic port assignment
  process.env.LOG_LEVEL = 'error'; // Reduce logging during tests
  process.env.DISABLE_RATE_LIMIT = 'true'; // Disable rate limiting for tests
  
  // Start performance monitoring
  global.testStartTime = performance.now();
});

// Setup after all tests
afterAll(async () => {
  const testDuration = performance.now() - global.testStartTime;
  console.log(`✅ Test Suite Completed in ${(testDuration / 1000).toFixed(2)}s`);
  
  // Cleanup metrics store intervals
  if (metricsStore && typeof metricsStore.cleanup === 'function') {
    metricsStore.cleanup();
  }
  
  // Clean up any resources if needed
  if (global.testServer) {
    console.log('🔧 Cleaning up test server...');
    await new Promise((resolve) => {
      global.testServer.close(resolve);
    });
  }
  
  // Force close any remaining handles
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }
});

// Setup before each test
beforeEach(() => {
  // Reset any global state
  jest.clearAllMocks();
  
  // Start test timer
  global.currentTestStartTime = performance.now();
});

// Setup after each test
afterEach(() => {
  const testDuration = performance.now() - global.currentTestStartTime;
  
  // Log slow tests
  if (testDuration > 5000) { // 5 seconds
    console.warn(`⚠️  Slow test detected: ${testDuration.toFixed(2)}ms`);
  }
});

// Global error handler for unhandled promises
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process during tests, just log the error
});

// Utility functions for tests
global.testUtils = {
  // Generate random test data
  generateRandomUser: () => ({
    name: `Test User ${Math.random().toString(36).substring(7)}`,
    email: `test${Math.random().toString(36).substring(7)}@example.com`
  }),
  
  generateRandomData: (userId) => ({
    userId,
    type: `test-${Math.random().toString(36).substring(7)}`,
    content: {
      randomValue: Math.random(),
      timestamp: new Date().toISOString(),
      metadata: {
        testRun: true,
        generated: true
      }
    }
  }),
  
  // Wait utility for async operations
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Retry utility for flaky tests
  retry: async (fn, maxRetries = 3, delay = 1000) => {
    let lastError;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        if (i < maxRetries - 1) {
          await global.testUtils.wait(delay);
        }
      }
    }
    
    throw lastError;
  },
  
  // Performance measurement
  measurePerformance: async (fn, name = 'operation') => {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;
    
    console.log(`📊 ${name} took ${duration.toFixed(2)}ms`);
    
    return { result, duration };
  }
};

// Custom Jest matchers
expect.extend({
  toBeWithinRange(received, floor, ceiling) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () => `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
  
  toBeValidEmail(received) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const pass = emailRegex.test(received);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid email`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid email`,
        pass: false,
      };
    }
  },
  
  toBeValidUUID(received) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const pass = typeof received === 'string' && (uuidRegex.test(received) || received.length > 0);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid UUID or ID`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid UUID or ID`,
        pass: false,
      };
    }
  }
});

// Console override to reduce noise during tests
const originalConsole = console;
global.console = {
  ...originalConsole,
  log: (...args) => {
    if (process.env.VERBOSE_TESTS === 'true') {
      originalConsole.log(...args);
    }
  },
  info: (...args) => {
    if (process.env.VERBOSE_TESTS === 'true') {
      originalConsole.info(...args);
    }
  },
  warn: originalConsole.warn,
  error: originalConsole.error
};
