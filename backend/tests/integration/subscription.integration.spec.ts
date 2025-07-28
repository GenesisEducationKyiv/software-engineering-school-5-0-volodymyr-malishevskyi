import 'reflect-metadata';

import { createApp } from '@/app';
import { SubscriptionCreatedEvent, SubscriptionConfirmedEvent, SubscriptionCancelledEvent } from '@/common/events';
import { EventBusFactory } from '@/common/events/event-bus-factory';
import { IEventBus } from '@/common/events/interfaces/event-bus.interface';
import { ConfigFactory } from '@/config/config-factory';
import { container } from '@/container';
import { SubscriptionEventConsumer } from '@/modules/notification/application/consumers/subscription-event.consumer';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import { DependencyContainer } from 'tsyringe';
import {
  mockCacheProvider,
  mockEmailingService,
  mockMetricsService,
  mockNotificationService,
  mockWeatherProvider,
} from '../helpers/mocks';
import { setupTestDatabase, teardownTestDatabase } from '../helpers/test-database';

// Mock token generator utility
jest.mock('@/common/utils/token-generator', () => ({
  generateConfirmationToken: jest.fn().mockReturnValue('test-confirmation-token'),
  generateRevokeToken: jest.fn().mockReturnValue('test-revoke-token'),
  generateToken: jest.fn().mockReturnValue('test-token'),
}));

describe('Subscription Integration Tests', () => {
  let app: App;
  let prisma: PrismaClient;
  let testContainer: DependencyContainer;

  beforeAll(async () => {
    // Setup test database
    const dbSetup = await setupTestDatabase();

    // Create child container from main container
    testContainer = container.createChildContainer();

    // Register test config and database
    const config = ConfigFactory.createTestConfig();
    testContainer.registerInstance('Config', config);
    testContainer.registerInstance('PrismaClient', dbSetup.prisma);

    // Override only the services we want to mock
    testContainer.registerInstance('MetricsService', mockMetricsService);
    testContainer.registerInstance('EmailingService', mockEmailingService);
    testContainer.registerInstance('NotificationService', mockNotificationService);
    testContainer.registerInstance('WeatherProvider', mockWeatherProvider);
    testContainer.registerInstance('CacheProvider', mockCacheProvider);

    // Create EventBus instance using factory with test config
    const testEventBusInstance = EventBusFactory.create(config.eventBus);
    testContainer.registerInstance('EventBus', testEventBusInstance);
    testContainer.registerSingleton('SubscriptionEventConsumer', SubscriptionEventConsumer);

    // Initialize event consumers with test container
    const testEventBus = testContainer.resolve<IEventBus>('EventBus');
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
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Clean database before each test
    await prisma.subscription.deleteMany();
    await prisma.city.deleteMany();

    // Set up default mock implementations
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

  describe('POST /api/subscribe', () => {
    const validSubscriptionData = {
      email: 'test@example.com',
      city: 'Kyiv',
      frequency: 'daily',
    };

    it('should create a new subscription and return 200', async () => {
      // Act
      const response = await request(app).post('/api/subscribe').send(validSubscriptionData);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Subscription successful. Confirmation email sent.');

      // Verify database entry was created
      const subscriptions = await prisma.subscription.findMany({
        where: { email: validSubscriptionData.email },
      });
      expect(subscriptions).toHaveLength(1);
      expect(subscriptions[0].email).toBe(validSubscriptionData.email);
      expect(subscriptions[0].frequency).toBe(validSubscriptionData.frequency);
      expect(subscriptions[0].confirmationToken).toBeTruthy();
      expect(subscriptions[0].revokeToken).toBeTruthy();

      // Wait for async event processing and verify notification service was called
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(mockNotificationService.sendSubscriptionConfirmation).toHaveBeenCalled();
    });

    it('should return 400 for invalid email format', async () => {
      // Act
      const response = await request(app)
        .post('/api/subscribe')
        .send({
          ...validSubscriptionData,
          email: 'invalid-email',
        });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'Invalid request');
    });

    it('should return 400 for missing required fields', async () => {
      // Act
      const response = await request(app).post('/api/subscribe').send({
        email: 'test@example.com',
        // Missing city and frequency
      });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'Invalid request');
    });

    it('should return 400 for invalid frequency', async () => {
      // Act
      const response = await request(app)
        .post('/api/subscribe')
        .send({
          ...validSubscriptionData,
          frequency: 'weekly', // Only daily or hourly are supported
        });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'Invalid request');
    });

    it('should return 400 when email already subscribed', async () => {
      // Arrange
      // First subscription
      await request(app).post('/api/subscribe').send(validSubscriptionData);

      // Act - Second subscription with same email
      const response = await request(app).post('/api/subscribe').send(validSubscriptionData);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'Email already subscribed');
    });

    it('should return 400 when search city fails', async () => {
      // Arrange
      mockWeatherProvider.searchCity = jest.fn().mockRejectedValue(new Error('External API error'));

      // Act
      const response = await request(app).post('/api/subscribe').send(validSubscriptionData);

      // Assert
      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/confirm/:token', () => {
    let confirmationToken: string;

    beforeEach(async () => {
      // Create a subscription to test confirmation
      await request(app).post('/api/subscribe').send({
        email: 'test@example.com',
        city: 'Kyiv',
        frequency: 'daily',
      });

      // Get the confirmation token from the database
      const subscription = await prisma.subscription.findUnique({
        where: { email: 'test@example.com' },
      });
      confirmationToken = subscription!.confirmationToken!;
    });

    it('should confirm subscription with valid token', async () => {
      // Act
      const response = await request(app).get(`/api/confirm/${confirmationToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Subscription confirmed! successfully');

      // Check database update
      const subscription = await prisma.subscription.findUnique({
        where: { email: 'test@example.com' },
      });
      expect(subscription!.isConfirmed).toBe(true);
      expect(subscription!.confirmationToken).toBeNull();
    });

    it('should return 404 for invalid token', async () => {
      // Act
      const response = await request(app).get('/api/confirm/invalid-token');

      // Assert
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message');
    });

    it('should return 500 for unexpected errors', async () => {
      // Arrange - Force a database error by disconnecting
      const originalUpdateMethod = prisma.subscription.update;
      prisma.subscription.update = jest.fn().mockRejectedValue(new Error('Database error')) as jest.Mock;

      // Act
      const response = await request(app).get(`/api/confirm/${confirmationToken}`);

      // Assert
      expect(response.status).toBe(500);

      // Restore original method
      prisma.subscription.update = originalUpdateMethod;
    });
  });

  describe('GET /api/unsubscribe/:token', () => {
    let revokeToken: string;

    beforeEach(async () => {
      // Create a subscription first
      const subscribeResponse = await request(app).post('/api/subscribe').send({
        email: 'test@example.com',
        city: 'Kyiv',
        frequency: 'daily',
      });
      expect(subscribeResponse.status).toBe(200);

      // Get the revoke token from the database
      const subscription = await prisma.subscription.findUnique({
        where: { email: 'test@example.com' },
      });
      revokeToken = subscription!.revokeToken!;

      // Confirm the subscription
      await prisma.subscription.update({
        where: { email: 'test@example.com' },
        data: { isConfirmed: true, confirmationToken: null },
      });
    });

    it('should unsubscribe with valid token', async () => {
      // Act
      const response = await request(app).get(`/api/unsubscribe/${revokeToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Unsubscribed successfully');

      // Check that subscription was deleted
      const subscription = await prisma.subscription.findUnique({
        where: { email: 'test@example.com' },
      });
      expect(subscription).toBeNull();
    });

    it('should return 404 for invalid token', async () => {
      // Act
      const response = await request(app).get('/api/unsubscribe/invalid-token');

      // Assert
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message');
    });

    it('should return 500 for unexpected errors', async () => {
      // Arrange - Mock the repository method to throw an error
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const subscriptionRepository = testContainer.resolve('SubscriptionRepository') as any;
      const originalDeleteMethod = subscriptionRepository.deleteByRevokeToken;
      subscriptionRepository.deleteByRevokeToken = jest.fn().mockRejectedValue(new Error('Database error'));

      // Act
      const response = await request(app).get(`/api/unsubscribe/${revokeToken}`);

      // Assert
      expect(response.status).toBe(500);

      // Restore original method
      subscriptionRepository.deleteByRevokeToken = originalDeleteMethod;
    });
  });
});
