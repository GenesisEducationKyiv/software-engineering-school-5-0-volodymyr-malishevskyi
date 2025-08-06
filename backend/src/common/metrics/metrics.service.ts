import { Counter, Histogram, Registry, collectDefaultMetrics } from 'prom-client';
import { inject, injectable } from 'tsyringe';

@injectable()
export class MetricsService {
  private readonly cacheHits: Counter;
  private readonly cacheMisses: Counter;
  private readonly cacheSetDuration: Histogram;
  private readonly cacheGetDuration: Histogram;

  constructor(@inject('PromClientRegistry') private readonly register: Registry) {
    this.cacheHits = new Counter({
      name: 'cache_hits_total',
      help: 'Total number of cache hits',
      labelNames: ['service'],
      registers: [this.register],
    });

    this.cacheMisses = new Counter({
      name: 'cache_misses_total',
      help: 'Total number of cache misses',
      labelNames: ['service'],
      registers: [this.register],
    });

    this.cacheSetDuration = new Histogram({
      name: 'cache_set_duration_seconds',
      help: 'Duration of cache set operations in seconds',
      labelNames: ['service'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5],
      registers: [this.register],
    });

    this.cacheGetDuration = new Histogram({
      name: 'cache_get_duration_seconds',
      help: 'Duration of cache get operations in seconds',
      labelNames: ['service'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5],
      registers: [this.register],
    });

    collectDefaultMetrics({
      register: this.register,
    });
  }

  /**
   * Get the metrics from the registry
   * @returns The metrics in the Prometheus format
   */
  public getMetrics(): Promise<string> {
    return this.register.metrics();
  }

  /**
   * Get the registry
   * @returns The registry
   */
  public getRegistry(): Registry {
    return this.register;
  }

  public incrementCacheHits(labels: Record<string, string | number>, value?: number): void {
    this.cacheHits.inc(labels, value);
  }

  public incrementCacheMisses(labels: Record<string, string | number>, value?: number): void {
    this.cacheMisses.inc(labels, value);
  }

  public startSetDurationTimer(labels: Record<string, string | number>): () => number {
    return this.cacheSetDuration.startTimer(labels);
  }

  public startGetDurationTimer(labels: Record<string, string | number>): () => number {
    return this.cacheGetDuration.startTimer(labels);
  }
}
