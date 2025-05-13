const Redis = require('ioredis');

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost', // Use the Elasticache Redis endpoint here
  port: process.env.REDIS_PORT || 6379, // Ensure this is 6379 or the correct port
  password: process.env.REDIS_PASSWORD || undefined,
  tls: {
    rejectUnauthorized: false // This disables SSL certificate verification (can be enabled for more security)
  }
});

redis.on('connect', () => {
  console.log('Connected to Redis');
});

redis.on('error', (err) => {
  console.error('Redis connection error:', err);
});

module.exports = redis;