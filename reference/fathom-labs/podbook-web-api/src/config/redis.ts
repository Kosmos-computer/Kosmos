import { createClient } from 'redis';
import { logger } from '../utils/logger';

const redisUrl = process.env['REDIS_URL'] || 'redis://localhost:6379';

export const redis = createClient({
  url: redisUrl,
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        logger.error('Redis reconnection failed after 10 attempts');
        return new Error('Redis reconnection failed');
      }
      return Math.min(retries * 100, 3000);
    },
  },
});

redis.on('error', (err) => {
  logger.error('Redis Client Error:', err);
});

redis.on('connect', () => {
  logger.info('Redis client connected');
});

redis.on('ready', () => {
  logger.info('Redis client ready');
});

redis.on('end', () => {
  logger.info('Redis client disconnected');
});

export async function connectRedis() {
  try {
    await redis.connect();
    logger.info('Redis connection established');
  } catch (error) {
    logger.error('Failed to connect to Redis:', error);
    throw error;
  }
}

export async function disconnectRedis() {
  try {
    await redis.disconnect();
    logger.info('Redis connection closed');
  } catch (error) {
    logger.error('Error closing Redis connection:', error);
  }
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await disconnectRedis();
});
