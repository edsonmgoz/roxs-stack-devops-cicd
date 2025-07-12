const request = require('supertest');
const app = require('../../src/app');

describe('Health Routes Tests', () => {
  describe('GET /health', () => {
    it('should return health status with 200', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body.status).toBe('healthy');
    });

    it('should include system information', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('system');
      expect(response.body.system).toHaveProperty('platform');
      expect(response.body.system).toHaveProperty('hostname');
      expect(response.body.system).toHaveProperty('arch');
    });

    it('should include uptime information', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('uptime');
      expect(typeof response.body.uptime).toBe('number');
      expect(response.body.uptime).toBeGreaterThan(0);
    });
  });

  describe('GET /health/detailed', () => {
    it('should return detailed health information', async () => {
      const response = await request(app)
        .get('/health/detailed')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('checks');
      expect(response.body).toHaveProperty('version');
    });

    it('should include build information', async () => {
      const response = await request(app)
        .get('/health/detailed')
        .expect(200);

      expect(response.body).toHaveProperty('build_info');
      expect(response.body.build_info).toHaveProperty('commit');
      expect(response.body.build_info).toHaveProperty('branch');
    });

    it('should validate response time', async () => {
      const start = Date.now();
      
      await request(app)
        .get('/health/detailed')
        .expect(200);
      
      const responseTime = Date.now() - start;
      expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
    });
  });

  describe('Health Check Consistency', () => {
    it('should maintain consistent status across multiple requests', async () => {
      const requests = [];
      
      for (let i = 0; i < 5; i++) {
        requests.push(
          request(app)
            .get('/health')
            .expect(200)
        );
      }
      
      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.body.status).toBe('healthy');
      });
    });

    it('should include timestamp in response', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('timestamp');
      expect(typeof response.body.timestamp).toBe('string');
      
      // Validate timestamp format
      const timestamp = new Date(response.body.timestamp);
      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.getTime()).not.toBeNaN();
    });
  });
});
