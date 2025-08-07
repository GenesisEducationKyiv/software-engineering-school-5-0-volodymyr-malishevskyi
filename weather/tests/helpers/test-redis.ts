import { RedisContainer, StartedRedisContainer } from '@testcontainers/redis';
import { RedisClientType, createClient } from 'redis';

let container: StartedRedisContainer;
let client: RedisClientType;

export async function setupTestRedis(): Promise<{
  container: StartedRedisContainer;
  client: RedisClientType;
  redisUrl: string;
}> {
  // Create a Redis container for testing
  container = await new RedisContainer('redis:7-alpine').start();

  const redisUrl = `redis://${container.getHost()}:${container.getPort()}`;

  // Create a Redis client instance with the test Redis connection
  client = createClient({ url: redisUrl });

  // Add error handling for connection
  client.on('error', (err) => {
    console.error('Test Redis client instance error:', err);
  });

  await client.connect();

  return { container, client, redisUrl };
}

export async function teardownTestRedis() {
  if (client) {
    try {
      await client.disconnect();
    } catch (error) {
      // Ignore disconnect errors
      console.warn('Error disconnecting Redis client:', error);
    }
  }
  if (container) {
    try {
      await container.stop();
    } catch (error) {
      // Ignore stop errors
      console.warn('Error stopping Redis container:', error);
    }
  }
}
