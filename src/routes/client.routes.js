const express = require('express');
const { registerClient } = require('../controllers/client.controller');

const router = express.Router();

router.post('/', registerClient);

module.exports = router;