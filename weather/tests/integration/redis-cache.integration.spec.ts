import 'reflect-metadata';

import { RedisCacheProvider } from '@/common/cache/providers/redis-cache-provider';
import { setupTestRedis, teardownTestRedis } from '../helpers/test-redis';

describe('Redis Cache Integration Tests', () => {
  let cacheProvider: RedisCacheProvider;
  let redisSetup: Awaited<ReturnType<typeof setupTestRedis>>;

  beforeAll(async () => {
    redisSetup = await setupTestRedis();
    const redisUrl = `redis://${redisSetup.container.getHost()}:${redisSetup.container.getPort()}`;
    cacheProvider = new RedisCacheProvider(redisUrl);
  }, 30000);

  afterAll(async () => {
    if (cacheProvider) {
      await cacheProvider.disconnect();
    }
    await teardownTestRedis();
  });

  beforeEach(async () => {
    await cacheProvider.clear();
  });

  it('should set and get values from Redis cache', async () => {
    const testData = { city: 'Kyiv', temperature: 25 };

    // Set value
    await cacheProvider.set('test-key', testData, 60);

    // Get value
    const retrieved = await cacheProvider.get('test-key');

    expect(retrieved).toEqual(testData);
  });

  it('should return null for non-existent keys', async () => {
    const result = await cacheProvider.get('non-existent-key');
    expect(result).toBeNull();
  });

  it('should delete values from cache', async () => {
    const testData = { city: 'Lviv', temperature: 20 };

    // Set value
    await cacheProvider.set('delete-test', testData, 60);

    // Verify it exists
    let retrieved = await cacheProvider.get('delete-test');
    expect(retrieved).toEqual(testData);

    // Delete value
    await cacheProvider.del('delete-test');

    // Verify it's gone
    retrieved = await cacheProvider.get('delete-test');
    expect(retrieved).toBeNull();
  });

  it('should clear all values from cache', async () => {
    // Set multiple values
    await cacheProvider.set('key1', 'value1', 60);
    await cacheProvider.set('key2', 'value2', 60);

    // Verify they exist
    expect(await cacheProvider.get('key1')).toBe('value1');
    expect(await cacheProvider.get('key2')).toBe('value2');

    // Clear all
    await cacheProvider.clear();

    // Verify they're gone
    expect(await cacheProvider.get('key1')).toBeNull();
    expect(await cacheProvider.get('key2')).toBeNull();
  });
});
