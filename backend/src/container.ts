import { CacheProviderFactory } from '@/common/cache/cache-provider-factory';
import { InstrumentedCacheProvider } from '@/common/cache/instrumented-cache-provider';
import { InMemoryCacheProvider } from '@/common/cache/providers/in-memory-cache-provider';
import { MemcachedCacheProvider } from '@/common/cache/providers/memcached-cache-provider';
import { RedisCacheProvider } from '@/common/cache/providers/redis-cache-provider';
import { FetchHttpClient } from '@/common/http-client';
import { EmailTemplateService } from '@/common/services/email-template-service';
import { GmailEmailingService } from '@/common/services/gmail-emailing';
import logger from '@/common/services/logger';
import { BroadcastService } from '@/common/services/broadcast';
import { NotificationService } from '@/common/services/notification';
import { Config } from '@/config';
import { PrismaClientInstance } from '@/lib/prisma';
import SubscriptionRepository from '@/modules/subscription/repository/subscription';
import { SubscriptionController } from '@/modules/subscription/subscription.controller';
import { SubscriptionService } from '@/modules/subscription/subscription.service';
import { CachedWeatherProvider } from '@/modules/weather/weather-providers/cached-weather-provider';
import { WeatherProviderChainFactory } from '@/modules/weather/weather-providers/chain/weather-provider-chain-factory';
import { OpenWeatherMapProvider } from '@/modules/weather/weather-providers/openweather/openweather';
import { WeatherApiProvider } from '@/modules/weather/weather-providers/weather-api/weather-api';
import { WeatherController } from '@/modules/weather/weather.controller';
import { WeatherService } from '@/modules/weather/weather.service';
import { Registry } from 'prom-client';
import 'reflect-metadata';
import { container, DependencyContainer } from 'tsyringe';
import { MetricsService } from './common/metrics/metrics.service';

/**
 * Initialize DI container with all dependencies
 * @param config - Configuration object to register in container
 */
export function initializeDI(config: Config): void {
  // Infrastructure services
  container.registerInstance('Config', config);
  container.registerSingleton('PrismaClient', PrismaClientInstance);
  container.registerInstance('Logger', logger);
  container.registerSingleton('HttpClient', FetchHttpClient);
  container.registerSingleton('PromClientRegistry', Registry);
  container.registerSingleton('MetricsService', MetricsService);

  // Cache providers
  container.registerSingleton('InMemoryCacheProvider', InMemoryCacheProvider);
  container.registerSingleton('RedisCacheProvider', RedisCacheProvider);
  container.registerSingleton('MemcachedCacheProvider', MemcachedCacheProvider);
  container.registerSingleton('InstrumentedCacheProvider', InstrumentedCacheProvider);

  // Main cache provider (resolved by factory)
  container.register('CacheProvider', {
    useFactory: () => {
      const metricsService = container.resolve<MetricsService>('MetricsService');
      return CacheProviderFactory.create(metricsService, 'weather-service');
    },
  });

  // Weather providers
  container.registerSingleton('WeatherApiService', WeatherApiProvider);
  container.registerSingleton('OpenWeatherService', OpenWeatherMapProvider);

  // Main weather provider (chain with failover)
  container.register('WeatherProvider', {
    useFactory: () => {
      const httpClient = container.resolve<FetchHttpClient>('HttpClient');
      const config = container.resolve<Config>('Config');

      const weatherProvidersConfig = {
        weatherApi: config.weather.providers.weatherApi.apiKey
          ? {
              apiKey: config.weather.providers.weatherApi.apiKey,
              priority: config.weather.providers.weatherApi.priority,
            }
          : undefined,
        openWeather: config.weather.providers.openWeather.apiKey
          ? {
              apiKey: config.weather.providers.openWeather.apiKey,
              priority: config.weather.providers.openWeather.priority,
            }
          : undefined,
      };

      return WeatherProviderChainFactory.createChain(httpClient, weatherProvidersConfig);
    },
  });

  // Business services
  container.registerSingleton('EmailingService', GmailEmailingService);
  container.registerSingleton('EmailTemplateService', EmailTemplateService);
  container.registerSingleton('NotificationService', NotificationService);
  container.registerSingleton('BroadcastService', BroadcastService);

  // Weather module
  container.registerSingleton('WeatherService', WeatherService);
  container.registerSingleton('CachedWeatherProvider', CachedWeatherProvider);
  container.registerSingleton('WeatherController', WeatherController);

  // Subscription module
  container.registerSingleton('SubscriptionRepository', SubscriptionRepository);
  container.registerSingleton('SubscriptionService', SubscriptionService);
  container.registerSingleton('SubscriptionController', SubscriptionController);
}

/**
 * Export container for direct access
 */
export { container, DependencyContainer };
