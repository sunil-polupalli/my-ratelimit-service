const { redisClient } = require('../config/redis');

const checkTokenBucket = async (clientId, path, maxRequests, windowSeconds) => {
  const key = `rate_limit:${clientId}:${path}`;
  const now = Date.now();
  const refillRate = maxRequests / windowSeconds;

  const record = await redisClient.hGetAll(key);

  let tokens = maxRequests;
  let lastRefill = now;

  if (Object.keys(record).length > 0) {
    tokens = parseFloat(record.tokens);
    lastRefill = parseInt(record.lastRefill, 10);

    const timePassed = (now - lastRefill) / 1000;
    const tokensToAdd = timePassed * refillRate;

    tokens = Math.min(maxRequests, tokens + tokensToAdd);
  }

  if (tokens >= 1) {
    tokens -= 1;
    
    await redisClient.hSet(key, {
      tokens: tokens.toString(),
      lastRefill: now.toString()
    });
    
    await redisClient.expire(key, windowSeconds * 2);

    return {
      allowed: true,
      remainingRequests: Math.floor(tokens),
      resetTime: new Date(now + (1000 / refillRate)).toISOString()
    };
  } else {
    const timeUntilNextToken = (1 - tokens) / refillRate;
    const retryAfter = Math.ceil(timeUntilNextToken);
    
    return {
      allowed: false,
      retryAfter,
      resetTime: new Date(now + (retryAfter * 1000)).toISOString()
    };
  }
};

module.exports = {
  checkTokenBucket
};