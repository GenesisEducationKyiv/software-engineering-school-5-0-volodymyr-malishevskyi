import { ICacheProvider } from '@/common/cache/interfaces/cache-provider';
import { MetricsService } from '@/common/metrics/metrics.service';
import { IWeatherProvider } from '@/modules/weather/infrastructure/weather-providers/types/weather-provider';

export const mockWeatherProvider = {
  getWeatherByCity: jest.fn(),
  searchCity: jest.fn(),
} as jest.Mocked<IWeatherProvider>;

export const mockCacheProvider = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  clear: jest.fn(),
} as unknown as jest.Mocked<ICacheProvider>;

export const mockMetricsService = {
  getMetrics: jest.fn(),
  getRegistry: jest.fn(),
  incrementCacheHits: jest.fn(),
  incrementCacheMisses: jest.fn(),
  startSetDurationTimer: jest.fn(),
} as unknown as jest.Mocked<MetricsService>;
