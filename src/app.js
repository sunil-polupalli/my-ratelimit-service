const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const { connectRedis } = require('./config/redis');
const clientRoutes = require('./routes/client.routes');
const ratelimitRoutes = require('./routes/ratelimit.routes');

dotenv.config();

connectDB();
connectRedis();

const app = express();

app.use(express.json());

app.use('/api/v1/clients', clientRoutes);
app.use('/api/v1/ratelimit', ratelimitRoutes);

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;