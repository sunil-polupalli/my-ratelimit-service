const Client = require('../models/client.model');
const { checkTokenBucket } = require('../services/rateLimiter.service');

const checkRateLimit = async (req, res) => {
  try {
    const { clientId, path } = req.body;

    if (!clientId || !path) {
      return res.status(400).json({ error: 'clientId and path are required' });
    }

    const client = await Client.findOne({ clientId });
    if (!client) {
      return res.status(400).json({ error: 'Invalid clientId' });
    }

    const { maxRequests, windowSeconds } = client;

    const result = await checkTokenBucket(clientId, path, maxRequests, windowSeconds);

    if (result.allowed) {
      return res.status(200).json({
        allowed: true,
        remainingRequests: result.remainingRequests,
        resetTime: result.resetTime
      });
    } else {
      res.set('Retry-After', result.retryAfter);
      return res.status(429).json({
        allowed: false,
        retryAfter: result.retryAfter,
        resetTime: result.resetTime
      });
    }
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports = {
  checkRateLimit
};