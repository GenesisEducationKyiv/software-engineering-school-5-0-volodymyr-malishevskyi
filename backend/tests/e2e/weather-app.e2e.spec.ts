import 'reflect-metadata';

import { createApp } from '@/app';
import { ICacheProvider } from '@/common/cache/interfaces/cache-provider';
import { RedisCacheProvider } from '@/common/cache/providers/redis-cache-provider';
import { EventBus } from '@/common/events/event-bus';
import { SubscriptionCreatedEvent, SubscriptionConfirmedEvent, SubscriptionCancelledEvent } from '@/common/events';
import { ConfigFactory } from '@/config/config-factory';
import { container } from '@/container';
import { SubscriptionEventConsumer } from '@/modules/notification/application/consumers/subscription-event.consumer';
import { NotificationService } from '@/modules/notification/application/services/notification.service';
import { EmailTemplateService } from '@/modules/notification/infrastructure/templates/email-template.service';
import { PrismaClient } from '@prisma/client';
import { DependencyContainer } from 'tsyringe';
import request from 'supertest';
import { App } from 'supertest/types';
import { setupTestDatabase, teardownTestDatabase } from '../helpers/test-database';
import { setupTestRedis, teardownTestRedis } from '../helpers/test-redis';
import { mockEmailingService, mockWeatherProvider, mockMetricsService } from '../helpers/mocks';

// Mock token generator utility with unique tokens
jest.mock('@/common/utils/token-generator', () => ({
  generateConfirmationToken: jest.fn(() => `confirmation-${Date.now()}-${Math.random()}`),
  generateRevokeToken: jest.fn(() => `revoke-${Date.now()}-${Math.random()}`),
  generateToken: jest.fn((length: number) => `token-${Date.now()}-${Math.random()}`.slice(0, length)),
}));

describe('App E2E Tests', () => {
  let app: App;
  let prisma: PrismaClient;
  let cacheProvider: ICacheProvider;
  let testContainer: DependencyContainer;

  beforeAll(async () => {
    // Setup test database and Redis
    const dbSetup = await setupTestDatabase();
    const redisSetup = await setupTestRedis();

    // Create child container from main container
    testContainer = container.createChildContainer();

    // Register test config and database
    const config = ConfigFactory.createTestConfig();
    testContainer.registerInstance('Config', config);
    testContainer.registerInstance('PrismaClient', dbSetup.prisma);

    // Override services with mocks
    testContainer.registerInstance('MetricsService', mockMetricsService);
    testContainer.registerInstance('EmailingService', mockEmailingService);
    testContainer.registerInstance('WeatherProvider', mockWeatherProvider);

    // Register real Redis cache provider for full integration testing
    cacheProvider = new RedisCacheProvider(redisSetup.redisUrl);
    testContainer.registerInstance('CacheProvider', cacheProvider);

    // Register NotificationService and EmailTemplateService to ensure proper dependency injection
    testContainer.registerSingleton('EmailTemplateService', EmailTemplateService);
    testContainer.registerSingleton('NotificationService', NotificationService);

    // Register EventBus and SubscriptionEventConsumer as singletons
    testContainer.registerSingleton('EventBus', EventBus);
    testContainer.registerSingleton('SubscriptionEventConsumer', SubscriptionEventConsumer);

    // Initialize event consumers with test container
    const testEventBus = testContainer.resolve<EventBus>('EventBus');
    const testSubscriptionEventConsumer = testContainer.resolve<SubscriptionEventConsumer>('SubscriptionEventConsumer');

    testEventBus.subscribe(
      SubscriptionCreatedEvent.EVENT_TYPE,
      testSubscriptionEventConsumer.getSubscriptionCreatedHandler(),
    );
    testEventBus.subscribe(
      SubscriptionConfirmedEvent.EVENT_TYPE,
      testSubscriptionEventConsumer.getSubscriptionConfirmedHandler(),
    );
    testEventBus.subscribe(
      SubscriptionCancelledEvent.EVENT_TYPE,
      testSubscriptionEventConsumer.getSubscriptionCancelledHandler(),
    );

    app = createApp(testContainer);
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
    // Reset all mocks before each test
    jest.clearAllMocks();

    await prisma.subscription.deleteMany();
    await prisma.city.deleteMany();

    // Clear Redis cache before each test
    const cacheProvider = testContainer.resolve<ICacheProvider>('CacheProvider');
    await cacheProvider.clear();

    // Setup mocks with default implementations
    mockWeatherProvider.searchCity = jest.fn().mockResolvedValue([
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

    mockWeatherProvider.getWeatherByCity = jest.fn().mockResolvedValue({
      temperature: 25,
      humidity: 65,
      description: 'Sunny',
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

      // Wait for async event processing and verify email was sent
      await new Promise((resolve) => setTimeout(resolve, 100));
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
      mockWeatherProvider.searchCity = jest.fn().mockResolvedValue([]);

      const subscribeResponse = await request(app).post('/api/subscribe').send({
        email: 'user@example.com',
        city: 'NonexistentCity',
        frequency: 'daily',
      });

      expect(subscribeResponse.status).toBe(400);

      // Test weather API failures
      mockWeatherProvider.getWeatherByCity = jest.fn().mockRejectedValue(new Error('API error'));

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
