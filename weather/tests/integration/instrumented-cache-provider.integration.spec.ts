import { Registry } from 'prom-client';
import 'reflect-metadata';
import { container } from 'tsyringe';

import { InstrumentedCacheProvider } from '@/common/cache/instrumented-cache-provider';
import { ICacheProvider } from '@/common/cache/interfaces/cache-provider';
import { InMemoryCacheProvider } from '@/common/cache/providers/in-memory-cache-provider';
import { MetricsService } from '@/common/metrics/metrics.service';

/**
 * Extended InMemoryCacheProvider with controlled behavior for testing metrics
 */
class TestableInMemoryCacheProvider extends InMemoryCacheProvider {
  private shouldReturnValue = true; // Control cache hit/miss behavior
  private shouldDelay = true; // Control timing behavior

  // Method to control cache behavior for testing
  setShouldReturnValue(value: boolean) {
    this.shouldReturnValue = value;
  }

  // Method to control timing behavior for testing
  setShouldDelay(value: boolean) {
    this.shouldDelay = value;
  }

  async get<T>(key: string): Promise<T | null> {
    // Simulate some delay for realistic timing tests
    if (this.shouldDelay) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    if (!this.shouldReturnValue) {
      return null; // Force cache miss
    }

    // Use parent implementation
    return super.get<T>(key);
  }

  async set<T>(key: string, value: T, ttl: number): Promise<void> {
    // Simulate some delay for realistic timing tests
    if (this.shouldDelay) {
      await new Promise((resolve) => setTimeout(resolve, 5));
    }

    // Use parent implementation
    await super.set<T>(key, value, ttl);
  }
}

describe('InstrumentedCacheProvider Metrics Tests', () => {
  let instrumentedProvider: InstrumentedCacheProvider;
  let mockProvider: TestableInMemoryCacheProvider;
  let metricsService: MetricsService;
  let registry: Registry;

  beforeAll(() => {
    // Setup dependency injection
    registry = new Registry();
    container.register('PromClientRegistry', { useValue: registry });
    container.register('MetricsService', { useClass: MetricsService });
  });

  beforeEach(() => {
    // Clear registry before each test to ensure clean metrics
    registry.clear();

    // Create fresh instances
    mockProvider = new TestableInMemoryCacheProvider();
    // Disable delays for faster tests (can be enabled for specific tests)
    mockProvider.setShouldDelay(false);
    metricsService = container.resolve('MetricsService');
    instrumentedProvider = new InstrumentedCacheProvider(mockProvider, metricsService, 'test-service');
  });

  afterEach(async () => {
    await instrumentedProvider.clear();
  });

  describe('Cache Hit Metrics', () => {
    it('should increment cache_hits_total when cache returns a value', async () => {
      // Arrange - Ensure cache will return a value
      mockProvider.setShouldReturnValue(true);
      await instrumentedProvider.set('test-key', 'test-value', 60);

      // Act
      await instrumentedProvider.get('test-key');

      // Assert - Verify cache hit metric
      const metrics = await metricsService.getMetrics();
      expect(metrics).toContain('cache_hits_total{service="test-service"} 1');
      expect(metrics).not.toContain('cache_misses_total{service="test-service"}');
    });

    it('should increment cache_hits_total multiple times for multiple hits', async () => {
      // Arrange
      mockProvider.setShouldReturnValue(true);
      await instrumentedProvider.set('key1', 'value1', 60);
      await instrumentedProvider.set('key2', 'value2', 60);

      // Act - Multiple cache hits
      await instrumentedProvider.get('key1');
      await instrumentedProvider.get('key2');
      await instrumentedProvider.get('key1'); // Second hit on same key

      // Assert - Verify multiple hits are counted
      const metrics = await metricsService.getMetrics();
      expect(metrics).toContain('cache_hits_total{service="test-service"} 3');
    });
  });

  describe('Cache Miss Metrics', () => {
    it('should increment cache_misses_total when cache returns null', async () => {
      // Arrange - Ensure cache will return null
      mockProvider.setShouldReturnValue(false);

      // Act
      await instrumentedProvider.get('non-existent-key');

      // Assert - Verify cache miss metric
      const metrics = await metricsService.getMetrics();
      expect(metrics).toContain('cache_misses_total{service="test-service"} 1');
      expect(metrics).not.toContain('cache_hits_total{service="test-service"}');
    });

    it('should increment cache_misses_total multiple times for multiple misses', async () => {
      // Arrange
      mockProvider.setShouldReturnValue(false);

      // Act - Multiple cache misses
      await instrumentedProvider.get('key1');
      await instrumentedProvider.get('key2');
      await instrumentedProvider.get('key3');

      // Assert - Verify multiple misses are counted
      const metrics = await metricsService.getMetrics();
      expect(metrics).toContain('cache_misses_total{service="test-service"} 3');
    });
  });

  describe('Mixed Cache Hit/Miss Metrics', () => {
    it('should correctly track both hits and misses in mixed scenario', async () => {
      // Arrange
      await instrumentedProvider.set('existing-key', 'value', 60);
      mockProvider.setShouldReturnValue(true);

      // Act - Mix of hits and misses
      await instrumentedProvider.get('existing-key'); // Hit
      mockProvider.setShouldReturnValue(false);
      await instrumentedProvider.get('non-existent'); // Miss
      mockProvider.setShouldReturnValue(true);
      await instrumentedProvider.get('existing-key'); // Hit again

      // Assert - Verify both metrics are tracked correctly
      const metrics = await metricsService.getMetrics();
      expect(metrics).toContain('cache_hits_total{service="test-service"} 2');
      expect(metrics).toContain('cache_misses_total{service="test-service"} 1');
    });
  });

  describe('Cache Set Duration Metrics', () => {
    it('should track cache_set_duration_seconds for set operations', async () => {
      // Act
      await instrumentedProvider.set('test-key', 'test-value', 60);

      // Assert - Verify set duration metric is tracked
      const metrics = await metricsService.getMetrics();
      expect(metrics).toContain('cache_set_duration_seconds');
      expect(metrics).toContain('cache_set_duration_seconds_count{service="test-service"}');
      expect(metrics).toContain('cache_set_duration_seconds_sum{service="test-service"}');
    });

    it('should accumulate set duration metrics for multiple operations', async () => {
      // Act - Multiple set operations
      await instrumentedProvider.set('key1', 'value1', 60);
      await instrumentedProvider.set('key2', 'value2', 60);
      await instrumentedProvider.set('key3', 'value3', 60);

      // Assert - Verify count increases
      const metrics = await metricsService.getMetrics();
      expect(metrics).toContain('cache_set_duration_seconds_count{service="test-service"} 3');
    });
  });

  describe('Cache Get Duration Metrics', () => {
    it('should track cache_get_duration_seconds for get operations', async () => {
      // Arrange
      await instrumentedProvider.set('test-key', 'test-value', 60);

      // Act
      await instrumentedProvider.get('test-key');

      // Assert - Verify get duration metric is tracked
      const metrics = await metricsService.getMetrics();
      expect(metrics).toContain('cache_get_duration_seconds');
      expect(metrics).toContain('cache_get_duration_seconds_count{service="test-service"}');
      expect(metrics).toContain('cache_get_duration_seconds_sum{service="test-service"}');
    });

    it('should track get duration even for cache misses', async () => {
      // Arrange
      mockProvider.setShouldReturnValue(false);

      // Act
      await instrumentedProvider.get('non-existent-key');

      // Assert - Verify get duration is tracked for misses too
      const metrics = await metricsService.getMetrics();
      expect(metrics).toContain('cache_get_duration_seconds');
      expect(metrics).toContain('cache_get_duration_seconds_count{service="test-service"}');
    });
  });

  describe('Service Name Labeling', () => {
    it('should use correct service name in all metrics', async () => {
      // Arrange
      const customServiceProvider = new InstrumentedCacheProvider(mockProvider, metricsService, 'custom-service-name');

      // Act
      await customServiceProvider.set('test-key', 'test-value', 60);
      await customServiceProvider.get('test-key');

      // Assert - Verify service name is used in all metrics
      const metrics = await metricsService.getMetrics();
      expect(metrics).toContain('cache_hits_total{service="custom-service-name"}');
      expect(metrics).toContain('cache_set_duration_seconds_count{service="custom-service-name"}');
      expect(metrics).toContain('cache_get_duration_seconds_count{service="custom-service-name"}');
    });
  });

  describe('Metrics Accuracy', () => {
    it('should accurately count operations without interference from cache operations', async () => {
      // Arrange
      await instrumentedProvider.set('key1', 'value1', 60);
      await instrumentedProvider.set('key2', 'value2', 60);

      // Act - Perform operations that don't affect metrics
      await instrumentedProvider.del('key1');
      await instrumentedProvider.clear();

      // Get operations to test metrics - after clear, both should be misses
      mockProvider.setShouldReturnValue(false);
      await instrumentedProvider.get('key2'); // Should be a miss (cache was cleared)
      await instrumentedProvider.get('key1'); // Should be a miss (key was deleted)

      // Assert - Verify metrics are accurate
      const metrics = await metricsService.getMetrics();
      // Prometheus doesn't show counters with 0 value, so we only check misses
      expect(metrics).toContain('cache_misses_total{service="test-service"} 2');
      // Verify that hits counter is not present (since it's 0)
      expect(metrics).not.toContain('cache_hits_total{service="test-service"}');
    });

    it('should maintain separate counters for different service names', async () => {
      // Arrange
      const service1Provider = new InstrumentedCacheProvider(mockProvider, metricsService, 'service-1');
      const service2Provider = new InstrumentedCacheProvider(mockProvider, metricsService, 'service-2');

      // Act
      mockProvider.setShouldReturnValue(true);
      await service1Provider.set('key1', 'value1', 60);
      await service1Provider.get('key1'); // Hit for service-1

      await service2Provider.set('key2', 'value2', 60);
      await service2Provider.get('key2'); // Hit for service-2

      // Assert - Verify separate counters
      const metrics = await metricsService.getMetrics();
      expect(metrics).toContain('cache_hits_total{service="service-1"} 1');
      expect(metrics).toContain('cache_hits_total{service="service-2"} 1');
    });
  });

  describe('Error Handling in Metrics', () => {
    it('should still track metrics even when cache operations fail', async () => {
      // Arrange - Create a provider that throws errors
      const errorProvider: ICacheProvider = {
        async get<T>(): Promise<T | null> {
          throw new Error('Cache error');
        },
        async set(): Promise<void> {
          throw new Error('Cache error');
        },
        async del(): Promise<void> {
          throw new Error('Cache error');
        },
        async clear(): Promise<void> {
          throw new Error('Cache error');
        },
      };

      const errorInstrumentedProvider = new InstrumentedCacheProvider(errorProvider, metricsService, 'error-service');

      // Act & Assert - Verify that metrics are still tracked even when errors occur
      await expect(errorInstrumentedProvider.get('test')).rejects.toThrow('Cache error');
      await expect(errorInstrumentedProvider.set('test', 'value', 60)).rejects.toThrow('Cache error');

      // Verify that metrics are still tracked
      const metrics = await metricsService.getMetrics();
      expect(metrics).toContain('cache_get_duration_seconds');
      expect(metrics).toContain('cache_set_duration_seconds');
    });
  });

  describe('Timing Accuracy', () => {
    it('should accurately measure operation timing', async () => {
      // Arrange
      const testData = { complex: 'data', nested: { value: 42 } };

      // Enable delays for timing test
      mockProvider.setShouldDelay(true);

      // Act
      const setStart = Date.now();
      await instrumentedProvider.set('timing-test', testData, 60);
      const setEnd = Date.now();

      const getStart = Date.now();
      await instrumentedProvider.get('timing-test');
      const getEnd = Date.now();

      // Assert
      const setDuration = setEnd - setStart;
      const getDuration = getEnd - getStart;

      // Should be at least the mock delay time (with some tolerance for timing variations)
      expect(setDuration).toBeGreaterThanOrEqual(3);
      expect(getDuration).toBeGreaterThanOrEqual(8);

      // Verify metrics contain timing data
      const metrics = await metricsService.getMetrics();
      expect(metrics).toContain('cache_set_duration_seconds');
      expect(metrics).toContain('cache_get_duration_seconds');
    });

    it('should handle TTL expiration correctly', async () => {
      // Arrange - Set data with very short TTL
      await instrumentedProvider.set('ttl-test', 'test-value', 0.001); // 1ms TTL

      // Act - Wait for TTL to expire
      await new Promise((resolve) => setTimeout(resolve, 10)); // Wait 10ms

      // Get the expired value
      const result = await instrumentedProvider.get('ttl-test');

      // Assert - Should be null due to TTL expiration
      expect(result).toBeNull();

      // Verify metrics - Should count as a miss
      const metrics = await metricsService.getMetrics();
      expect(metrics).toContain('cache_misses_total{service="test-service"}');
    });
  });
});
