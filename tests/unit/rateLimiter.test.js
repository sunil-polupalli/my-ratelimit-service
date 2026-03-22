const { checkTokenBucket } = require('../../src/services/rateLimiter.service');
const { redisClient } = require('../../src/config/redis');

jest.mock('../../src/config/redis', () => ({
  redisClient: {
    hGetAll: jest.fn(),
    hSet: jest.fn(),
    expire: jest.fn()
  }
}));

describe('Token Bucket Algorithm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should allow request when bucket is empty and full capacity is available', async () => {
    redisClient.hGetAll.mockResolvedValue({});
    
    const result = await checkTokenBucket('client_unit_1', '/api/test', 10, 60);
    
    expect(result.allowed).toBe(true);
    expect(result.remainingRequests).toBe(9);
    expect(result.resetTime).toBeDefined();
  });

  it('should block request when tokens are exhausted', async () => {
    redisClient.hGetAll.mockResolvedValue({
      tokens: '0',
      lastRefill: Date.now().toString()
    });
    
    const result = await checkTokenBucket('client_unit_1', '/api/test', 10, 60);
    
    expect(result.allowed).toBe(false);
    expect(result.retryAfter).toBeDefined();
    expect(result.resetTime).toBeDefined();
  });

  it('should calculate proper token refill over time', async () => {
    const halfWindowAgo = Date.now() - 30000;
    
    redisClient.hGetAll.mockResolvedValue({
      tokens: '0',
      lastRefill: halfWindowAgo.toString()
    });
    
    const result = await checkTokenBucket('client_unit_1', '/api/test', 10, 60);
    
    expect(result.allowed).toBe(true);
    expect(result.remainingRequests).toBeGreaterThan(0);
  });
});