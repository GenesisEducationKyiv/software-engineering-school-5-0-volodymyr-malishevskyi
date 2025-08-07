import { ICacheProvider } from '@/common/cache/interfaces/cache-provider';
import { inject, injectable } from 'tsyringe';
import { MetricsService } from '../metrics/metrics.service';

/**
 * Instrumented Cache Provider (Decorator)
 * @description This class is used to instrument the cache provider
 * @param provider - The cache provider to instrument
 * @param metricsService - The metrics service to use
 * @param serviceName - The name of the service to use
 */
@injectable()
export class InstrumentedCacheProvider implements ICacheProvider {
  constructor(
    private readonly provider: ICacheProvider,
    @inject('MetricsService') private readonly metricsService: MetricsService,
    private readonly serviceName: string,
  ) {}

  public async get<T>(key: string): Promise<T | null> {
    const endTimer = this.metricsService.startGetDurationTimer({ service: this.serviceName });
    const value = await this.provider.get<T>(key);
    endTimer();

    if (value) {
      this.metricsService.incrementCacheHits({ service: this.serviceName });
    } else {
      this.metricsService.incrementCacheMisses({ service: this.serviceName });
    }

    return value;
  }

  public async set<T>(key: string, value: T, ttl: number): Promise<void> {
    const endTimer = this.metricsService.startSetDurationTimer({ service: this.serviceName });
    await this.provider.set(key, value, ttl);
    endTimer();
  }

  public del(key: string): Promise<void> {
    return this.provider.del(key);
  }

  public async clear(): Promise<void> {
    await this.provider.clear();
  }
}
