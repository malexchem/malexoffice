require('dotenv').config();
module.exports = {
  PORT: process.env.PORT || 5000,
  MONGO_URI: process.env.MONGO_URI,
  JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key',
  CORS_OPTIONS: { origin: '*' },
  BODY_LIMIT: '10mb',
  MAX_TOKENS: 5,
};