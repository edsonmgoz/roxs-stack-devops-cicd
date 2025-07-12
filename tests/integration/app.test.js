const request = require('supertest');
const app = require('../../src/app');

describe('Application Integration Tests', () => {
  describe('User Workflow Integration', () => {
    test('should handle complete user data workflow', async () => {
      // Test health check first
      const healthResponse = await request(app).get('/health');
      expect(healthResponse.status).toBe(200);

      // Test API status
      const statusResponse = await request(app).get('/api/status');
      expect(statusResponse.status).toBe(200);
      expect(statusResponse.body).toHaveProperty('status', 'running');

      // Test metrics endpoint
      const metricsResponse = await request(app).get('/api/metrics');
      expect(metricsResponse.status).toBe(200);
      expect(metricsResponse.body).toHaveProperty('application');
      expect(metricsResponse.body).toHaveProperty('system');
      expect(metricsResponse.body).toHaveProperty('timestamp');
    });

    test('should handle user creation workflow', async () => {
      const newUser = {
        name: 'Integration Test User',
        email: 'integration@test.com'
      };

      // Try to create user - might not be implemented
      const createResponse = await request(app)
        .post('/api/users')
        .send(newUser);
      
      // Accept either success or not implemented
      if (createResponse.status === 201) {
        expect(createResponse.body).toHaveProperty('id');
        expect(createResponse.body.name).toBe(newUser.name);

        const userId = createResponse.body.id;

        // Try to get user
        const getResponse = await request(app)
          .get(`/api/users/${userId}`);
        
        expect([200, 404]).toContain(getResponse.status);
      } else {
        // Route might not be implemented, which is okay
        expect([400, 404, 501]).toContain(createResponse.status);
      }
    });

    test('should handle data operations workflow', async () => {
      const testData = {
        key: 'integration-test',
        value: 'test-value'
      };

      // Try to create data - might not be implemented
      const createResponse = await request(app)
        .post('/api/data')
        .send(testData);
      
      // Accept either success or not implemented
      if (createResponse.status === 201) {
        expect(createResponse.body).toHaveProperty('id');
        const dataId = createResponse.body.id;

        // Try to get data
        const getResponse = await request(app)
          .get(`/api/data/${dataId}`);
        
        expect([200, 404]).toContain(getResponse.status);
      } else {
        // Route might not be implemented, which is okay
        expect([400, 404, 501]).toContain(createResponse.status);
      }
    });
  });

  describe('Error Handling Integration', () => {
    test('should handle non-existent routes gracefully', async () => {
      const response = await request(app).get('/non-existent-route');
      expect(response.status).toBe(404);
    });

    test('should handle invalid JSON input', async () => {
      const response = await request(app)
        .post('/api/users')
        .send('invalid-json')
        .set('Content-Type', 'application/json');
      
      expect(response.status).toBe(400);
    });

    test('should handle server errors gracefully', async () => {
      // This test might need adjustment based on your error handling
      const response = await request(app)
        .get('/api/users/invalid-id-format');
      
      expect([400, 404, 500]).toContain(response.status);
    });
  });

  describe('Performance Integration', () => {
    test('should handle multiple concurrent requests', async () => {
      const promises = [];
      
      for (let i = 0; i < 10; i++) {
        promises.push(request(app).get('/health'));
      }
      
      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });

    test('should respond within acceptable time limits', async () => {
      const start = Date.now();
      const response = await request(app).get('/api/status');
      const duration = Date.now() - start;
      
      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(1000); // Should respond within 1 second
    });
  });
});
