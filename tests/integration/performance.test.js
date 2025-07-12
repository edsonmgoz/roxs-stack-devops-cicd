const request = require('supertest');
const app = require('../../src/app');

describe('Performance Integration Tests', () => {
  describe('Response Times', () => {
    it('should respond to health check within acceptable time', async () => {
      const start = Date.now();
      
      await request(app)
        .get('/health')
        .expect(200);
      
      const responseTime = Date.now() - start;
      expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
    });

    it('should handle multiple concurrent requests efficiently', async () => {
      const concurrentRequests = 50;
      const promises = [];
      
      const start = Date.now();
      
      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          request(app)
            .get('/api/status')
            .expect(200)
        );
      }
      
      await Promise.all(promises);
      
      const totalTime = Date.now() - start;
      const averageTime = totalTime / concurrentRequests;
      
      // Average response time should be reasonable
      expect(averageTime).toBeLessThan(100); // 100ms average
      console.log(`Average response time for ${concurrentRequests} requests: ${averageTime.toFixed(2)}ms`);
    });
  });

  describe('Memory and Resource Usage', () => {
    it('should not leak memory during repeated requests', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Make many requests
      for (let i = 0; i < 100; i++) {
        await request(app)
          .get('/health')
          .expect(200);
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });

    it('should handle large payloads efficiently', async () => {
      const largeData = {
        name: 'Test User',
        email: 'test@example.com',
        description: 'A'.repeat(10000), // 10KB string
        metadata: {
          tags: Array(100).fill('tag'),
          properties: Array(50).fill({ key: 'value', data: 'x'.repeat(100) })
        }
      };
      
      const start = Date.now();
      
      const response = await request(app)
        .post('/api/data')
        .send(largeData);
      
      const responseTime = Date.now() - start;
      
      // Should handle large payload within reasonable time
      expect(responseTime).toBeLessThan(2000); // 2 seconds max
      expect([200, 201, 400]).toContain(response.status); // Valid response
    });
  });

  describe('Database Performance', () => {
    it('should handle rapid sequential database operations', async () => {
      const operations = [];
      
      // Create multiple users rapidly
      for (let i = 0; i < 20; i++) {
        operations.push(
          request(app)
            .post('/api/users')
            .send({
              name: `Test User ${i}`,
              email: `test${i}@example.com`
            })
        );
      }
      
      const start = Date.now();
      const responses = await Promise.all(operations);
      const totalTime = Date.now() - start;
      
      // Should complete all operations within reasonable time
      expect(totalTime).toBeLessThan(5000); // 5 seconds max
      
      // Check that most operations succeeded
      const successfulOps = responses.filter(res => [200, 201].includes(res.status));
      expect(successfulOps.length).toBeGreaterThan(responses.length * 0.8); // 80% success rate
    });

    it('should maintain performance under data retrieval load', async () => {
      // First, ensure we have some data
      await request(app)
        .post('/api/users')
        .send({ name: 'Performance Test User', email: 'perf@example.com' });
      
      const retrievalOperations = [];
      
      // Perform many read operations
      for (let i = 0; i < 30; i++) {
        retrievalOperations.push(
          request(app)
            .get('/api/users')
            .expect(200)
        );
      }
      
      const start = Date.now();
      await Promise.all(retrievalOperations);
      const totalTime = Date.now() - start;
      
      const averageTime = totalTime / retrievalOperations.length;
      expect(averageTime).toBeLessThan(50); // 50ms average for reads
    });
  });

  describe('Stress Testing', () => {
    it('should gracefully handle request spikes', async () => {
      const spikeSize = 100;
      const promises = [];
      
      // Create a spike of requests
      for (let i = 0; i < spikeSize; i++) {
        promises.push(
          request(app)
            .get('/api/status')
            .catch(err => ({ status: err.status || 500, error: true }))
        );
      }
      
      const responses = await Promise.all(promises);
      
      // Should handle most requests successfully or with rate limiting
      const successfulResponses = responses.filter(res => res.status === 200);
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      const errorResponses = responses.filter(res => res.status >= 500);
      
      // Should not have many server errors
      expect(errorResponses.length).toBeLessThan(spikeSize * 0.1); // Less than 10% errors
      
      // Should have reasonable success + rate limiting
      expect(successfulResponses.length + rateLimitedResponses.length)
        .toBeGreaterThan(spikeSize * 0.8); // 80% handled appropriately
    });
  });
});
