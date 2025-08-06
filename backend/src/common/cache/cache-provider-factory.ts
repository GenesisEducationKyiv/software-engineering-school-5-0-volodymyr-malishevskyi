import { InstrumentedCacheProvider } from '@/common/cache/instrumented-cache-provider';
import { ICacheProvider } from '@/common/cache/interfaces/cache-provider';
import { InMemoryCacheProvider } from '@/common/cache/providers/in-memory-cache-provider';
import { MemcachedCacheProvider } from '@/common/cache/providers/memcached-cache-provider';
import { RedisCacheProvider } from '@/common/cache/providers/redis-cache-provider';
import config from '@/config';
import { MetricsService } from '../metrics/metrics.service';

export class CacheProviderFactory {
  static create(metricsService: MetricsService, serviceName: string): ICacheProvider {
    let provider: ICacheProvider;

    switch (config.cache.provider) {
      case 'redis':
        if (!config.cache.redisUrl) {
          throw new Error('Redis URL is not configured');
        }
        provider = new RedisCacheProvider(config.cache.redisUrl);
        break;
      case 'memcached':
        if (!config.cache.memcachedLocation) {
          throw new Error('Memcached location is not configured');
        }
        provider = new MemcachedCacheProvider(config.cache.memcachedLocation);
        break;
      default:
        provider = new InMemoryCacheProvider();
    }

    return new InstrumentedCacheProvider(provider, metricsService, serviceName);
  }
}
