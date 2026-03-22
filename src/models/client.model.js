const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
  clientId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  hashedApiKey: {
    type: String,
    required: true
  },
  maxRequests: {
    type: Number,
    default: () => parseInt(process.env.DEFAULT_RATE_LIMIT_MAX_REQUESTS, 10)
  },
  windowSeconds: {
    type: Number,
    default: () => parseInt(process.env.DEFAULT_RATE_LIMIT_WINDOW_SECONDS, 10)
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Client', clientSchema);