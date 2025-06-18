const Redis = require('ioredis');

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost', // Use the Elasticache Redis endpoint here
  port: process.env.REDIS_PORT || 6379, // Ensure this is 6379 or the correct port
  password: process.env.REDIS_PASSWORD || undefined,
  tls: {
    rejectUnauthorized: false // This disables SSL certificate verification (can be enabled for more security)
  }
});

// When you're testing container redis container by default not using TLS
// If you are using a local Redis instance without TLS, you can comment out the tls option

redis.on('connect', () => {
  console.log('Connected to Redis');
});

redis.on('error', (err) => {
  console.error('Redis connection error:', err);
});

redis.set('test_key', 'Hello from Redis', (err, result) => {
  if (err) {
    console.error('Error writing to Redis:', err);
  } else {
    console.log('Successfully wrote to Redis:', result);
  }
});

// Get data from Redis
redis.get('test_key', (err, result) => {
  if (err) {
    console.error('Error reading from Redis:', err);
  } else {
    console.log('Successfully read from Redis:', result);
  }
});

module.exports = redis;