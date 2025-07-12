const metricsCollector = require('../../src/middleware/metricsCollector');
const errorHandler = require('../../src/middleware/errorHandler');
const requestLogger = require('../../src/middleware/requestLogger');

describe('Middleware Tests', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      method: 'GET',
      url: '/test',
      ip: '127.0.0.1',
      get: jest.fn((header) => {
        if (header === 'User-Agent') return 'test-agent';
        if (header === 'Content-Type') return 'application/json';
        return undefined;
      }),
      headers: {
        'user-agent': 'test-agent',
        'content-type': 'application/json'
      }
    };
    
    res = {
      statusCode: 200,
      on: jest.fn(),
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    
    next = jest.fn();
  });

  describe('metricsCollector middleware', () => {
    it('should call next function', () => {
      metricsCollector(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should add request properties', () => {
      metricsCollector(req, res, next);
      expect(req.method).toBe('GET');
      expect(req.url).toBe('/test');
      expect(req.ip).toBe('127.0.0.1');
    });
  });

  describe('errorHandler middleware', () => {
    it('should handle generic errors with 500 status', () => {
      const error = new Error('Test error');
      
      errorHandler(error, req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.any(Object)
      }));
    });

    it('should handle errors with custom status codes', () => {
      const error = new Error('Custom error');
      error.status = 400;
      
      errorHandler(error, req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should handle validation errors', () => {
      const error = new Error('Validation failed');
      error.name = 'ValidationError';
      
      errorHandler(error, req, res, next);
      
      expect(res.status).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalled();
    });
  });

  describe('requestLogger middleware', () => {
    it('should call next function', () => {
      requestLogger(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should add request ID to request object', () => {
      requestLogger(req, res, next);
      expect(req).toHaveProperty('requestId');
      expect(typeof req.requestId).toBe('string');
    });

    it('should set request ID header', () => {
      requestLogger(req, res, next);
      expect(res.setHeader).toHaveBeenCalledWith('X-Request-ID', expect.any(String));
    });
  });

  describe('Middleware Integration', () => {
    it('should handle middleware chain properly', () => {
      requestLogger(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      
      next.mockClear();
      metricsCollector(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('should maintain request context through chain', () => {
      requestLogger(req, res, next);
      metricsCollector(req, res, next);
      
      expect(req).toHaveProperty('requestId');
      expect(req.method).toBe('GET');
      expect(req.url).toBe('/test');
    });
  });
});
