const Client = require('../models/client.model');
const bcrypt = require('bcrypt');

const registerClient = async (req, res) => {
  try {
    const { clientId, apiKey, maxRequests, windowSeconds } = req.body;

    if (!clientId || !apiKey) {
      return res.status(400).json({ error: 'clientId and apiKey are required' });
    }

    const existingClient = await Client.findOne({ clientId });
    if (existingClient) {
      return res.status(409).json({ error: 'Conflict: clientId already exists' });
    }

    const saltRounds = 10;
    const hashedApiKey = await bcrypt.hash(apiKey, saltRounds);

    const newClientData = {
      clientId,
      hashedApiKey
    };

    if (maxRequests !== undefined) newClientData.maxRequests = maxRequests;
    if (windowSeconds !== undefined) newClientData.windowSeconds = windowSeconds;

    const newClient = new Client(newClientData);
    await newClient.save();

    res.status(201).json({
      clientId: newClient.clientId,
      maxRequests: newClient.maxRequests,
      windowSeconds: newClient.windowSeconds
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'Conflict: clientId or apiKey already exists' });
    }
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports = {
  registerClient
};