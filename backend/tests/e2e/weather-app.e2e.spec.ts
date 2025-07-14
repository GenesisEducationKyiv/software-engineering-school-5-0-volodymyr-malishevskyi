import 'reflect-metadata';

import { ConfigFactory } from '@/config/config-factory';

const config = ConfigFactory.createTestConfig();

import { createApp } from '@/app';
import { ICacheProvider } from '@/common/cache/interfaces/cache-provider';
import { RedisCacheProvider } from '@/common/cache/providers/redis-cache-provider';
import { MetricsService } from '@/common/metrics/metrics.service';
import { EmailTemplateService } from '@/common/services/email-template-service';
import { GmailEmailingService } from '@/common/services/gmail-emailing';
import { NotificationService } from '@/common/services/notification';
import { container } from '@/container';
import SubscriptionRepository from '@/modules/subscription/repository/subscription';
import { SubscriptionController } from '@/modules/subscription/subscription.controller';
import { SubscriptionService } from '@/modules/subscription/subscription.service';
import { CachedWeatherProvider } from '@/modules/weather/weather-providers/cached-weather-provider';
import { IWeatherProvider } from '@/modules/weather/weather-providers/types/weather-provider';
import { WeatherController } from '@/modules/weather/weather.controller';
import { WeatherService } from '@/modules/weather/weather.service';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import { setupTestDatabase, teardownTestDatabase } from '../helpers/test-database';
import { setupTestRedis, teardownTestRedis } from '../helpers/test-redis';

const mockEmailingService = {
  sendEmail: jest.fn(),
} as unknown as jest.Mocked<GmailEmailingService>;

// Mock token generator utility with unique tokens
jest.mock('@/common/utils/token-generator', () => ({
  generateConfirmationToken: jest.fn(() => `confirmation-${Date.now()}-${Math.random()}`),
  generateRevokeToken: jest.fn(() => `revoke-${Date.now()}-${Math.random()}`),
  generateToken: jest.fn((length: number) => `token-${Date.now()}-${Math.random()}`.slice(0, length)),
}));

const mockWeatherApiProvider = {
  getWeatherByCity: jest.fn(),
  searchCity: jest.fn(),
} as jest.Mocked<IWeatherProvider>;

const mockMetricsService = {
  getMetrics: jest.fn(),
  getRegistry: jest.fn(),
  incrementCacheHits: jest.fn(),
  incrementCacheMisses: jest.fn(),
  startSetDurationTimer: jest.fn(),
} as unknown as jest.Mocked<MetricsService>;

describe('App E2E Tests', () => {
  let app: App;
  let prisma: PrismaClient;
  let cacheProvider: ICacheProvider;

  beforeAll(async () => {
    // Setup test database and Redis
    const dbSetup = await setupTestDatabase();
    const redisSetup = await setupTestRedis();

    container.clearInstances();
    container.reset();

    container.registerInstance('PrismaClient', dbSetup.prisma);

    // Register config
    container.registerInstance('Config', config);

    // Register Metrics
    container.registerInstance('MetricsService', mockMetricsService);

    // Register mock services
    container.registerInstance('EmailingService', mockEmailingService);

    // Register real EmailTemplateService for full integration testing
    container.registerSingleton('EmailTemplateService', EmailTemplateService);

    // Register NotificationService as singleton (depends on EmailingService and EmailTemplateService)
    container.registerSingleton('NotificationService', NotificationService);

    // Register dependencies for CachedWeatherProvider
    container.registerInstance('WeatherProvider', mockWeatherApiProvider);

    // Register real Redis cache provider instead of mock
    // try {
    //   new RedisCacheProvider(redisSetup.redisUrl)
    // } catch (error) {
    //   console.log('error1', error);
    // }

    cacheProvider = new RedisCacheProvider(redisSetup.redisUrl);
    container.registerInstance('CacheProvider', cacheProvider);
    // container.registerSingleton('CacheProvider', InMemoryCacheProvider);

    // Register CachedWeatherProvider as singleton (not instance)
    container.registerSingleton('CachedWeatherProvider', CachedWeatherProvider);

    // Register CachedWeatherService as singleton (not instance)
    container.registerSingleton('WeatherService', WeatherService);

    // Register WeatherController as singleton (not instance)
    container.registerSingleton('WeatherController', WeatherController);

    // Register mock subscription repository
    container.registerSingleton('SubscriptionRepository', SubscriptionRepository);

    // Register SubscriptionService as singleton
    container.registerSingleton('SubscriptionService', SubscriptionService);

    // Register SubscriptionController as singleton
    container.registerSingleton('SubscriptionController', SubscriptionController);

    app = createApp(container);

    prisma = dbSetup.prisma;
  }, 60000);

  afterAll(async () => {
    // Clean up resources
    if (cacheProvider && typeof cacheProvider.disconnect === 'function') {
      await cacheProvider.disconnect();
    }
    await teardownTestDatabase();
    await teardownTestRedis();
  });

  beforeEach(async () => {
    // Reset mocks and clean database before each test
    mockWeatherApiProvider.getWeatherByCity.mockClear();
    mockWeatherApiProvider.searchCity.mockClear();
    mockEmailingService.sendEmail.mockClear();

    await prisma.subscription.deleteMany();
    await prisma.city.deleteMany();

    // Clear Redis cache before each test
    const cacheProvider = container.resolve<ICacheProvider>('CacheProvider');
    await cacheProvider.clear();

    // Setup mocks with default implementations
    mockWeatherApiProvider.searchCity = jest.fn().mockResolvedValue([
      {
        id: 123,
        name: 'Kyiv',
        region: 'Kyiv Oblast',
        country: 'Ukraine',
        lat: 50.45,
        lon: 30.52,
        url: 'kyiv-ukraine',
      },
    ]);

    mockWeatherApiProvider.getWeatherByCity = jest.fn().mockResolvedValue({
      city: 'Kyiv',
      temperature: {
        c: 25,
        f: 77,
      },
      humidity: 65,
      shortDescription: 'Sunny',
    });

    mockEmailingService.sendEmail = jest.fn().mockResolvedValue(undefined);
  });

  describe('Complete User Journey', () => {
    it('should allow a user to subscribe, confirm, check weather, and unsubscribe', async () => {
      // Step 1: Subscribe to weather updates
      const subscribeResponse = await request(app).post('/api/subscribe').send({
        email: 'user@example.com',
        city: 'Kyiv',
        frequency: 'daily',
      });

      expect(subscribeResponse.status).toBe(200);
      expect(subscribeResponse.body).toHaveProperty('message', 'Subscription successful. Confirmation email sent.');
      expect(mockEmailingService.sendEmail).toHaveBeenCalled();

      // Step 2: Get subscription from database to get confirmation token
      const pendingSubscription = await prisma.subscription.findUnique({
        where: { email: 'user@example.com' },
        include: { city: true },
      });

      expect(pendingSubscription).toBeDefined();
      expect(pendingSubscription?.isConfirmed).toBe(false);
      expect(pendingSubscription?.confirmationToken).toBeTruthy();
      expect(pendingSubscription?.revokeToken).toBeTruthy();
      expect(pendingSubscription?.city.name).toBe('Kyiv');

      // Verify subscribe email
      const subscribeEmailCallArgs = mockEmailingService.sendEmail.mock.calls[0][0];
      expect(subscribeEmailCallArgs.to).toBe('user@example.com');
      expect(subscribeEmailCallArgs.subject).toBe('Weather Subscription Confirmation');
      expect(subscribeEmailCallArgs.html).toContain('Weather Subscription Confirmation');
      expect(subscribeEmailCallArgs.html).toContain('Confirm Subscription');
      expect(subscribeEmailCallArgs.html).toContain(
        `http://localhost:3000/api/confirm/${pendingSubscription?.confirmationToken}`,
      );
      expect(subscribeEmailCallArgs.html).toContain('<strong>City:</strong> Kyiv, Kyiv Oblast, Ukraine');
      expect(subscribeEmailCallArgs.html).toContain('<strong>Frequency:</strong> daily');

      // Step 3: Confirm subscription
      const confirmResponse = await request(app).get(`/api/confirm/${pendingSubscription!.confirmationToken}`);

      expect(confirmResponse.status).toBe(200);
      expect(confirmResponse.body).toHaveProperty('message', 'Subscription confirmed! successfully');

      // Step 4: Check subscription status after confirmation
      const confirmedSubscription = await prisma.subscription.findUnique({
        where: { email: 'user@example.com' },
        include: { city: true },
      });

      expect(confirmedSubscription).toBeDefined();
      expect(confirmedSubscription?.isConfirmed).toBe(true);
      expect(confirmedSubscription?.confirmationToken).toBeNull();

      // Verify confirmation email
      const confirmationEmailCallArgs = mockEmailingService.sendEmail.mock.calls[1][0];
      expect(confirmationEmailCallArgs.to).toBe('user@example.com');
      expect(confirmationEmailCallArgs.subject).toBe('Weather Subscription Successfully Confirmed!');
      expect(confirmationEmailCallArgs.html).toContain('Subscription Successfully Confirmed!');
      expect(confirmationEmailCallArgs.html).toContain(
        `<strong>City:</strong> ${confirmedSubscription?.city.fullName}`,
      );
      expect(confirmationEmailCallArgs.html).toContain(
        `<strong>Frequency:</strong> ${confirmedSubscription?.frequency.toLowerCase()}`,
      );
      expect(confirmationEmailCallArgs.html).toContain('Unsubscribe');
      expect(confirmationEmailCallArgs.html).toContain(
        `http://localhost:3000/api/unsubscribe/${confirmedSubscription?.revokeToken}`,
      );

      // Step 5: Check weather data for the subscribed city
      const weatherResponse = await request(app).get('/api/weather').query({ city: 'Kyiv' });

      expect(weatherResponse.status).toBe(200);
      expect(weatherResponse.body).toHaveProperty('temperature');
      expect(weatherResponse.body).toHaveProperty('humidity');
      expect(weatherResponse.body).toHaveProperty('description', 'Sunny');

      // Step 6: Unsubscribe
      const unsubscribeResponse = await request(app).get(`/api/unsubscribe/${pendingSubscription!.revokeToken}`);

      expect(unsubscribeResponse.status).toBe(200);
      expect(unsubscribeResponse.body).toHaveProperty('message', 'Unsubscribed successfully');

      // Step 7: Verify subscription was removed
      const deletedSubscription = await prisma.subscription.findUnique({
        where: { email: 'user@example.com' },
      });

      expect(deletedSubscription).toBeNull();

      // Verify unsubscribe email
      const unsubscribeEmailCallArgs = mockEmailingService.sendEmail.mock.calls[2][0];
      expect(unsubscribeEmailCallArgs.to).toBe('user@example.com');
      expect(unsubscribeEmailCallArgs.subject).toBe('Weather Subscription Cancelled');
      expect(unsubscribeEmailCallArgs.html).toContain('Weather Subscription Cancelled');
      expect(unsubscribeEmailCallArgs.html).toContain(`<strong>City:</strong> ${confirmedSubscription?.city.fullName}`);
      expect(unsubscribeEmailCallArgs.html).toContain(
        `<strong>Frequency:</strong> ${confirmedSubscription?.frequency}`,
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle error scenarios gracefully', async () => {
      // Test invalid city search
      mockWeatherApiProvider.searchCity = jest.fn().mockResolvedValue([]);

      const subscribeResponse = await request(app).post('/api/subscribe').send({
        email: 'user@example.com',
        city: 'NonexistentCity',
        frequency: 'daily',
      });

      expect(subscribeResponse.status).toBe(500);

      // Test weather API failures
      mockWeatherApiProvider.getWeatherByCity = jest.fn().mockRejectedValue(new Error('API error'));

      const weatherResponse = await request(app).get('/api/weather').query({ city: 'Kyiv' });

      expect(weatherResponse.status).toBe(500);

      // Test invalid confirmation token
      const confirmResponse = await request(app).get('/api/confirm/invalid-token-that-does-not-exist');

      expect(confirmResponse.status).toBe(404);

      // Test invalid unsubscribe token
      const unsubscribeResponse = await request(app).get('/api/unsubscribe/invalid-token-that-does-not-exist');

      expect(unsubscribeResponse.status).toBe(404);
    });
  });

  describe('Subscription with different frequencies', () => {
    it('should allow both daily and hourly frequencies', async () => {
      // Daily subscription
      const dailyResponse = await request(app).post('/api/subscribe').send({
        email: 'daily@example.com',
        city: 'Kyiv',
        frequency: 'daily',
      });

      expect(dailyResponse.status).toBe(200);

      const dailySubscription = await prisma.subscription.findUnique({
        where: { email: 'daily@example.com' },
      });

      expect(dailySubscription?.frequency).toBe('daily');

      // Hourly subscription
      const hourlyResponse = await request(app).post('/api/subscribe').send({
        email: 'hourly@example.com',
        city: 'Kyiv',
        frequency: 'hourly',
      });

      expect(hourlyResponse.status).toBe(200);

      const hourlySubscription = await prisma.subscription.findUnique({
        where: { email: 'hourly@example.com' },
      });

      expect(hourlySubscription?.frequency).toBe('hourly');
    });
  });
});
