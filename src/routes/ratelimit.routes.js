const express = require('express');
const { checkRateLimit } = require('../controllers/ratelimit.controller');

const router = express.Router();

router.post('/check', checkRateLimit);

module.exports = router;