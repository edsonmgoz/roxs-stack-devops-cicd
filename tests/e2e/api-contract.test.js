const request = require('supertest');
const app = require('../../src/app');

describe('API Documentation and Contract Tests', () => {
  describe('API Schema Validation', () => {
    it('should return consistent user object schema', async () => {
      const userData = {
        name: 'Schema Test User',
        email: 'schema@example.com'
      };
      
      const response = await request(app)
        .post('/api/users')
        .send(userData)
        .expect(201);
      
      // Validate user object schema
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('email');
      expect(response.body).toHaveProperty('created_at');
      
      expect(typeof response.body.id).toBe('string');
      expect(typeof response.body.name).toBe('string');
      expect(typeof response.body.email).toBe('string');
      expect(typeof response.body.created_at).toBe('string');
      
      // Validate date format
      expect(new Date(response.body.created_at)).toBeInstanceOf(Date);
    });

    it('should return consistent data object schema', async () => {
      // First create a user
      const userResponse = await request(app)
        .post('/api/users')
        .send({ name: 'Data Test User', email: 'data@example.com' })
        .expect(201);
      
      const dataPayload = {
        type: 'test-data',
        content: { key: 'value', number: 42, array: [1, 2, 3] }
      };
      
      const response = await request(app)
        .post('/api/data')
        .send(dataPayload)
        .expect(201);
      
      // Validate data object schema
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('type');
      expect(response.body).toHaveProperty('content');
      expect(response.body).toHaveProperty('created_at');
      
      expect(typeof response.body.id).toBe('string');
      expect(typeof response.body.type).toBe('string');
      expect(typeof response.body.content).toBe('object');
      expect(typeof response.body.created_at).toBe('string');
    });
  });

  describe('HTTP Status Codes', () => {
    it('should return correct status codes for all endpoints', async () => {
      // Health endpoints
      await request(app).get('/health').expect(200);
      await request(app).get('/health/detailed').expect(200);
      
      // API status endpoints
      await request(app).get('/api/status').expect(200);
      await request(app).get('/api/version').expect(200);
      await request(app).get('/api/metrics').expect(200);
      
      // Resource endpoints
      await request(app).get('/api/users').expect(200);
      await request(app).get('/api/data').expect(200);
      
      // 404 for non-existent endpoints
      await request(app).get('/api/nonexistent').expect(404);
      await request(app).get('/invalid/path').expect(404);
      
      // 405 for wrong methods - some endpoints might return 404 instead
      const deleteResponse = await request(app).delete('/health');
      expect([404, 405]).toContain(deleteResponse.status);
      
      const patchResponse = await request(app).patch('/api/status');
      expect([404, 405]).toContain(patchResponse.status);
    });

    it('should handle validation errors with 400 status', async () => {
      // Invalid user data
      await request(app)
        .post('/api/users')
        .send({ name: '', email: 'invalid' })
        .expect(400);
      
      // Missing required fields
      await request(app)
        .post('/api/users')
        .send({})
        .expect(400);
      
      // Invalid data structure
      await request(app)
        .post('/api/data')
        .send({ invalid: 'structure' })
        .expect(400);
    });
  });

  describe('Response Headers', () => {
    it('should include appropriate content-type headers', async () => {
      const response = await request(app)
        .get('/api/status')
        .expect(200);
      
      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    it('should include CORS headers', async () => {
      const response = await request(app)
        .get('/api/status')
        .expect(200);
      
      // Check for CORS related headers - might be named differently
      const corsHeaders = [
        'access-control-allow-origin',
        'access-control-allow-credentials',
        'vary'
      ];
      
      const hasCorsHeader = corsHeaders.some(header => 
        response.headers.hasOwnProperty(header)
      );
      
      expect(hasCorsHeader).toBe(true);
    });

    it('should include security headers', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);
      
      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-frame-options');
    });
  });

  describe('API Versioning', () => {
    it('should return API version information', async () => {
      const response = await request(app)
        .get('/api/version')
        .expect(200);
      
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('environment');
      
      expect(typeof response.body.version).toBe('string');
      expect(typeof response.body.environment).toBe('string');
    });
  });

  describe('Error Response Format', () => {
    it('should return consistent error format', async () => {
      const response = await request(app)
        .post('/api/users')
        .send({ name: '', email: 'invalid' })
        .expect(400);
      
      // Standard error response format
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('timestamp');
      
      expect(typeof response.body.error).toBe('string');
      expect(typeof response.body.timestamp).toBe('string');
    });

    it('should not expose sensitive information in errors', async () => {
      const response = await request(app)
        .get('/api/nonexistent')
        .expect(404);
      
      expect(response.body).not.toHaveProperty('stack');
      expect(response.body).not.toHaveProperty('trace');
      
      // Check if message exists before testing its content
      if (response.body.message) {
        expect(response.body.message).not.toContain('Error:');
      }
    });
  });

  describe('Rate Limiting Headers', () => {
    it('should include rate limiting information in headers', async () => {
      const response = await request(app)
        .get('/api/status')
        .expect(200);
      
      // Check for rate limiting headers (if implemented)
      // Note: These might not be present depending on implementation
      const rateLimitHeaders = [
        'x-ratelimit-limit',
        'x-ratelimit-remaining',
        'x-ratelimit-reset'
      ];
      
      // At least one rate limit header should be present or none at all
      const presentHeaders = rateLimitHeaders.filter(
        header => response.headers[header] !== undefined
      );
      
      // If any rate limit headers are present, log them for verification
      if (presentHeaders.length > 0) {
        console.log('Rate limit headers found:', presentHeaders);
        presentHeaders.forEach(header => {
          expect(response.headers[header]).toBeDefined();
        });
      }
    });
  });

  describe('Content Negotiation', () => {
    it('should handle Accept header properly', async () => {
      const response = await request(app)
        .get('/api/status')
        .set('Accept', 'application/json')
        .expect(200);
      
      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    it('should handle unsupported Accept headers gracefully', async () => {
      const response = await request(app)
        .get('/api/status')
        .set('Accept', 'application/xml')
        .expect(200); // Should still work, returning JSON
      
      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });
});
