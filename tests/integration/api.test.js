const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../src/app');
const Client = require('../../src/models/client.model');
const { redisClient } = require('../../src/config/redis');

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.DATABASE_URL || 'mongodb://127.0.0.1:27017/ratelimitdb_test');
  }
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
});

afterAll(async () => {
  await Client.deleteMany({});
  await mongoose.connection.close();
  if (redisClient.isOpen) {
    await redisClient.quit();
  }
});

describe('API Integration Tests', () => {
  const testClient = {
    clientId: 'test-client-integration',
    apiKey: 'supersecretkey123',
    maxRequests: 3,
    windowSeconds: 60
  };

  describe('POST /api/v1/clients', () => {
    it('should register a new client successfully', async () => {
      const res = await request(app)
        .post('/api/v1/clients')
        .send(testClient);
      
      expect(res.statusCode).toBe(201);
      expect(res.body.clientId).toBe(testClient.clientId);
      expect(res.body.maxRequests).toBe(testClient.maxRequests);
    });

    it('should return 409 for duplicate client registration', async () => {
      const res = await request(app)
        .post('/api/v1/clients')
        .send(testClient);
      
      expect(res.statusCode).toBe(409);
      expect(res.body.error).toBeDefined();
    });

    it('should return 400 for missing required fields', async () => {
      const res = await request(app)
        .post('/api/v1/clients')
        .send({ clientId: 'missing-key-client' });
      
      expect(res.statusCode).toBe(400);
    });
  });

  describe('POST /api/v1/ratelimit/check', () => {
    it('should allow initial requests within limit', async () => {
      const res = await request(app)
        .post('/api/v1/ratelimit/check')
        .send({
          clientId: testClient.clientId,
          path: '/api/protected'
        });
      
      expect(res.statusCode).toBe(200);
      expect(res.body.allowed).toBe(true);
      expect(res.body.remainingRequests).toBe(2);
    });

    it('should block requests exceeding the limit', async () => {
      await request(app).post('/api/v1/ratelimit/check').send({ clientId: testClient.clientId, path: '/api/protected' });
      await request(app).post('/api/v1/ratelimit/check').send({ clientId: testClient.clientId, path: '/api/protected' });
      
      const res = await request(app)
        .post('/api/v1/ratelimit/check')
        .send({
          clientId: testClient.clientId,
          path: '/api/protected'
        });

      expect(res.statusCode).toBe(429);
      expect(res.body.allowed).toBe(false);
      expect(res.body.retryAfter).toBeDefined();
      expect(res.headers['retry-after']).toBeDefined();
    });

    it('should return 400 for invalid client check', async () => {
      const res = await request(app)
        .post('/api/v1/ratelimit/check')
        .send({
          clientId: 'non-existent-client',
          path: '/api/protected'
        });
      
      expect(res.statusCode).toBe(400);
    });
  });
});