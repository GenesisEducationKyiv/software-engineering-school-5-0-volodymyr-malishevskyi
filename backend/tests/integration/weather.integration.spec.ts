import 'reflect-metadata';

import { ConfigFactory } from '@/config/config-factory';

const config = ConfigFactory.createTestConfig();

import { createApp } from '@/app';
import { ICacheProvider } from '@/common/cache/interfaces/cache-provider';
import { MetricsService } from '@/common/metrics/metrics.service';
import { GmailEmailingService } from '@/common/services/gmail-emailing';
import { SubscriptionController } from '@/modules/subscription/subscription.controller';
import { SubscriptionService } from '@/modules/subscription/subscription.service';
import { ISubscriptionRepository } from '@/modules/subscription/types/subscription-repository';
import { WeatherController, WeatherService } from '@/modules/weather';
import { CachedWeatherProvider } from '@/modules/weather/weather-providers/cached-weather-provider';
import { IWeatherProvider, Weather } from '@/modules/weather/weather-providers/types/weather-provider';
import { CityNotFoundError } from '@/modules/weather/weather-providers/weather-api/errors/weather-api';
import request from 'supertest';
import { App } from 'supertest/types';
import { container } from 'tsyringe';

const mockEmailingService = {
  sendEmail: jest.fn(),
} as unknown as jest.Mocked<GmailEmailingService>;

const mockWeatherProvider = {
  getWeatherByCity: jest.fn(),
  searchCity: jest.fn(),
} as jest.Mocked<IWeatherProvider>;

const mockCacheProvider = {
  get: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
  clear: jest.fn(),
} as unknown as jest.Mocked<ICacheProvider>;

const mockSubscriptionRepository = {
  create: jest.fn(),
  findByEmail: jest.fn(),
  findByConfirmationToken: jest.fn(),
  findByRevokeToken: jest.fn(),
  updateByConfirmationToken: jest.fn(),
  deleteByRevokeToken: jest.fn(),
} as unknown as jest.Mocked<ISubscriptionRepository>;

const mockMetricsService = {
  getMetrics: jest.fn(),
  getRegistry: jest.fn(),
  incrementCacheHits: jest.fn(),
  incrementCacheMisses: jest.fn(),
  startSetDurationTimer: jest.fn(),
} as unknown as jest.Mocked<MetricsService>;

describe('Weather Integration Tests', () => {
  let app: App;

  beforeAll(async () => {
    container.clearInstances();
    container.reset();

    // Register config
    container.registerInstance('Config', config);

    // Register Metrics
    container.registerInstance('MetricsService', mockMetricsService);

    // Register mock services
    container.registerInstance('WeatherApiProvider', mockWeatherProvider);
    container.registerInstance('OpenWeatherMapProvider', mockWeatherProvider);
    container.registerInstance('EmailingService', mockEmailingService);

    // Register dependencies for CachedWeatherProvider
    container.registerInstance('WeatherProvider', mockWeatherProvider);
    container.registerInstance('CacheProvider', mockCacheProvider);

    // Register CachedWeatherProvider as singleton (not instance)
    container.registerSingleton('CachedWeatherProvider', CachedWeatherProvider);

    // Register CachedWeatherService as singleton (not instance)
    container.registerSingleton('WeatherService', WeatherService);

    // Register WeatherController as singleton (not instance)
    container.registerSingleton('WeatherController', WeatherController);

    // Register mock subscription repository
    container.registerInstance('SubscriptionRepository', mockSubscriptionRepository);

    // Register SubscriptionService as singleton
    container.registerSingleton('SubscriptionService', SubscriptionService);

    // Register SubscriptionController as singleton
    container.registerSingleton('SubscriptionController', SubscriptionController);

    app = createApp(container);
  }, 60000);

  afterAll(async () => {});

  beforeEach(() => {
    // Reset mocks before each test
    mockWeatherProvider.getWeatherByCity.mockClear();
    mockWeatherProvider.searchCity.mockClear();
    mockCacheProvider.get.mockClear();
    mockCacheProvider.set.mockClear();
    mockSubscriptionRepository.create.mockClear();
    mockSubscriptionRepository.findByEmail.mockClear();
    mockSubscriptionRepository.findByConfirmationToken.mockClear();
    mockSubscriptionRepository.findByRevokeToken.mockClear();
    mockSubscriptionRepository.updateByConfirmationToken.mockClear();
    mockSubscriptionRepository.deleteByRevokeToken.mockClear();
  });

  describe('GET /api/weather', () => {
    it('should return weather data for a valid city', async () => {
      // Arrange
      const mockWeatherData: Weather = {
        city: 'Kyiv',
        temperature: {
          c: 25,
          f: 77,
        },
        humidity: 65,
        shortDescription: 'Sunny',
      };

      // Mock cache miss
      mockCacheProvider.get.mockResolvedValue(null);

      // Mock implementation
      mockWeatherProvider.getWeatherByCity.mockResolvedValue(mockWeatherData);

      // Act
      const response = await request(app).get('/api/weather').query({ city: 'Kyiv' });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        temperature: 25,
        humidity: 65,
        description: 'Sunny',
      });
      expect(mockWeatherProvider.getWeatherByCity).toHaveBeenCalledWith('Kyiv');
      expect(mockCacheProvider.get).toHaveBeenCalledWith('weather:Kyiv');
      expect(mockCacheProvider.set).toHaveBeenCalledWith(
        'weather:Kyiv',
        {
          city: 'Kyiv',
          temperature: {
            c: 25,
            f: 77,
          },
          humidity: 65,
          shortDescription: 'Sunny',
        },
        300,
      );
    });

    it('should return 400 Bad Request when city parameter is missing', async () => {
      // Act
      const response = await request(app).get('/api/weather').query({});

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'Invalid request');
    });

    it('should return 400 Bad Request when city parameter is empty', async () => {
      // Act
      const response = await request(app).get('/api/weather').query({ city: '' });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'Invalid request');
    });

    it('should return 404 Not Found when city is not found', async () => {
      // Arrange
      mockWeatherProvider.getWeatherByCity.mockRejectedValue(new CityNotFoundError());

      // Act
      const response = await request(app).get('/api/weather').query({ city: 'NonexistentCity' });

      // Assert
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message', 'City not found');
    });

    it('should return 500 Internal Server Error for unexpected errors', async () => {
      // Arrange
      mockWeatherProvider.getWeatherByCity.mockRejectedValue(new Error('Unexpected error'));

      // Act
      const response = await request(app).get('/api/weather').query({ city: 'Kyiv' });

      // Assert
      expect(response.status).toBe(500);
    });
  });
});
