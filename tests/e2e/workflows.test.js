const request = require('supertest');
const app = require('../../src/app');

describe('E2E User Workflow Tests', () => {
  describe('Complete User Journey', () => {
    it('should handle complete user lifecycle', async () => {
      // 1. Check system health
      const healthResponse = await request(app)
        .get('/health')
        .expect(200);
      
      expect(healthResponse.body.status).toBe('healthy');
      
      // 2. Create a new user
      const userData = {
        name: 'E2E Test User',
        email: 'e2e.test@example.com'
      };
      
      const createResponse = await request(app)
        .post('/api/users')
        .send(userData)
        .expect(201);
      
      expect(createResponse.body.name).toBe(userData.name);
      expect(createResponse.body.email).toBe(userData.email);
      expect(createResponse.body).toHaveProperty('id');
      
      const userId = createResponse.body.id;
      
      // 3. Retrieve all users (should include our new user)
      const getUsersResponse = await request(app)
        .get('/api/users')
        .expect(200);
      
      expect(getUsersResponse.body).toHaveProperty('users');
      expect(Array.isArray(getUsersResponse.body.users)).toBe(true);
      const createdUser = getUsersResponse.body.users.find(user => user.id === userId);
      expect(createdUser).toBeTruthy();
      
      // 4. Create associated data for the user
      const dataPayload = {
        type: 'profile',
        content: {
          bio: 'E2E test user biography',
          preferences: {
            theme: 'dark',
            notifications: true
          }
        }
      };
      
      const createDataResponse = await request(app)
        .post('/api/data')
        .send(dataPayload)
        .expect(201);
      
      expect(createDataResponse.body.type).toBe('profile');
      
      // 5. Retrieve user data
      const getDataResponse = await request(app)
        .get('/api/data')
        .expect(200);
      
      expect(getDataResponse.body).toHaveProperty('data');
      expect(Array.isArray(getDataResponse.body.data)).toBe(true);
      
      // 6. Check metrics after operations
      const metricsResponse = await request(app)
        .get('/api/metrics')
        .expect(200);
      
      expect(metricsResponse.body).toHaveProperty('application');
      if (metricsResponse.body.application && metricsResponse.body.application.requests) {
        expect(metricsResponse.body.application.requests).toHaveProperty('total');
        expect(metricsResponse.body.application.requests.total).toBeGreaterThan(0);
      }
      
      // 7. Verify system is still healthy after operations
      const finalHealthResponse = await request(app)
        .get('/health')
        .expect(200);
      
      expect(finalHealthResponse.body.status).toBe('healthy');
    });
  });

  describe('Error Recovery Workflows', () => {
    it('should handle graceful error recovery', async () => {
      // 1. Try to create user with invalid data
      const invalidUser = {
        name: '', // Empty name
        email: 'invalid-email'
      };
      
      const errorResponse = await request(app)
        .post('/api/users')
        .send(invalidUser)
        .expect(400);
      
      expect(errorResponse.body).toHaveProperty('error');
      
      // 2. System should still be responsive after error
      const healthAfterError = await request(app)
        .get('/health')
        .expect(200);
      
      expect(healthAfterError.body.status).toBe('healthy');
      
      // 3. Create valid user after error
      const validUser = {
        name: 'Recovery Test User',
        email: 'recovery@example.com'
      };
      
      const successResponse = await request(app)
        .post('/api/users')
        .send(validUser)
        .expect(201);
      
      expect(successResponse.body.name).toBe(validUser.name);
      
      // 4. Try to access non-existent resource
      const notFoundResponse = await request(app)
        .get('/api/users/999999')
        .expect(404);
      
      expect(notFoundResponse.body).toHaveProperty('error');
      
      // 5. System should still function normally
      const statusResponse = await request(app)
        .get('/api/status')
        .expect(200);
      
      expect(statusResponse.body).toHaveProperty('status');
    });
  });

  describe('Multi-User Scenarios', () => {
    it('should handle multiple users creating data simultaneously', async () => {
      const users = [
        { name: 'User One', email: 'user1@example.com' },
        { name: 'User Two', email: 'user2@example.com' },
        { name: 'User Three', email: 'user3@example.com' }
      ];
      
      // Create multiple users concurrently
      const userCreationPromises = users.map(user =>
        request(app)
          .post('/api/users')
          .send(user)
      );
      
      const userResponses = await Promise.all(userCreationPromises);
      
      // All users should be created successfully
      userResponses.forEach((response, index) => {
        expect(response.status).toBe(201);
        expect(response.body.name).toBe(users[index].name);
        expect(response.body.email).toBe(users[index].email);
      });
      
      const userIds = userResponses.map(response => response.body.id);
      
      // Each user creates data concurrently
      const dataCreationPromises = userIds.map((userId, index) =>
        request(app)
          .post('/api/data')
          .send({
            type: 'preferences',
            content: {
              userIndex: index,
              settings: { language: 'en', timezone: 'UTC' }
            }
          })
      );
      
      const dataResponses = await Promise.all(dataCreationPromises);
      
      // All data should be created successfully
      dataResponses.forEach((response, index) => {
        expect(response.status).toBe(201);
        expect(response.body.type).toBe('preferences');
      });
      
      // Verify all data can be retrieved
      const allDataResponse = await request(app)
        .get('/api/data')
        .expect(200);
      
      expect(allDataResponse.body).toHaveProperty('data');
      expect(Array.isArray(allDataResponse.body.data)).toBe(true);
      expect(allDataResponse.body.data.length).toBeGreaterThanOrEqual(userIds.length);
    });
  });

  describe('System Load and Recovery', () => {
    it('should maintain functionality under load', async () => {
      const loadTestRequests = 50;
      const promises = [];
      
      // Mix of different operations
      for (let i = 0; i < loadTestRequests; i++) {
        const operations = [
          () => request(app).get('/health'),
          () => request(app).get('/api/status'),
          () => request(app).get('/api/metrics'),
          () => request(app).post('/api/users').send({
            name: `Load Test User ${i}`,
            email: `loadtest${i}@example.com`
          }),
          () => request(app).get('/api/users')
        ];
        
        // Randomly select operation
        const operation = operations[Math.floor(Math.random() * operations.length)];
        promises.push(operation());
      }
      
      const responses = await Promise.all(promises);
      
      // Calculate success rate
      const successfulResponses = responses.filter(
        response => response.status >= 200 && response.status < 400
      );
      
      const successRate = successfulResponses.length / responses.length;
      
      // Should maintain high success rate even under load
      expect(successRate).toBeGreaterThan(0.85); // 85% success rate
      
      // System should still be healthy after load test
      const postLoadHealth = await request(app)
        .get('/health')
        .expect(200);
      
      expect(postLoadHealth.body.status).toBe('healthy');
    });
  });
});
