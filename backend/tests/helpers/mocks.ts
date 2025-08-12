import { ICacheProvider } from '@/common/cache/interfaces/cache-provider';
import { MetricsService } from '@/common/metrics/metrics.service';
import { GmailEmailingService } from '@/modules/notification/infrastructure/email/gmail-emailing.service';
import { ISubscriptionRepository } from '@/modules/subscription/domain/interfaces/subscription.repository';
import { IWeatherProvider } from '@/modules/weather/infrastructure/types/weather.client';

export const mockEmailingService = {
  sendEmail: jest.fn(),
} as unknown as jest.Mocked<GmailEmailingService>;

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

export const mockSubscriptionRepository = {
  create: jest.fn(),
  findByEmail: jest.fn(),
  findByConfirmationToken: jest.fn(),
  findByRevokeToken: jest.fn(),
  updateByConfirmationToken: jest.fn(),
  deleteByRevokeToken: jest.fn(),
} as unknown as jest.Mocked<ISubscriptionRepository>;

export const mockMetricsService = {
  getMetrics: jest.fn(),
  getRegistry: jest.fn(),
  incrementCacheHits: jest.fn(),
  incrementCacheMisses: jest.fn(),
  startSetDurationTimer: jest.fn(),
} as unknown as jest.Mocked<MetricsService>;
