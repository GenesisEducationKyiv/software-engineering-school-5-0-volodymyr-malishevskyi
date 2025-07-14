import { ConfigFactory } from '@/config/config-factory';

const config = ConfigFactory.createTestConfig();

import { createApp } from '@/app';
import { ICacheProvider } from '@/common/cache/interfaces/cache-provider';
import { MetricsService } from '@/common/metrics/metrics.service';
import { GmailEmailingService } from '@/common/services/gmail-emailing';
import { container } from '@/container';
import { SubscriptionRepository } from '@/modules/subscription';
import { SubscriptionController } from '@/modules/subscription/subscription.controller';
import { SubscriptionService } from '@/modules/subscription/subscription.service';
import { WeatherController, WeatherService } from '@/modules/weather';
import { CachedWeatherProvider } from '@/modules/weather/weather-providers/cached-weather-provider';
import { IWeatherProvider, Weather } from '@/modules/weather/weather-providers/types/weather-provider';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import { setupTestDatabase, teardownTestDatabase } from '../helpers/test-database';

const mockEmailingService = {
  sendEmail: jest.fn(),
} as unknown as jest.Mocked<GmailEmailingService>;

// Mock token generator utility
jest.mock('@/common/utils/token-generator', () => ({
  generateConfirmationToken: jest.fn().mockReturnValue('test-confirmation-token'),
  generateRevokeToken: jest.fn().mockReturnValue('test-revoke-token'),
  generateToken: jest.fn().mockReturnValue('test-token'),
}));

const mockEmailTemplateService = {
  getSubscriptionConfirmationTemplate: jest.fn().mockReturnValue('<html>confirmation</html>'),
  getSubscriptionConfirmedTemplate: jest.fn().mockReturnValue('<html>confirmed</html>'),
  getSubscriptionCancelledTemplate: jest.fn().mockReturnValue('<html>cancelled</html>'),
};

const mockWeatherApiService = {
  getWeatherByCity: jest.fn(),
  searchCity: jest.fn(),
} as jest.Mocked<IWeatherProvider>;

const mockCacheProvider = {
  get: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
  clear: jest.fn(),
} as unknown as jest.Mocked<ICacheProvider>;

const mockMetricsService = {
  getMetrics: jest.fn(),
  getRegistry: jest.fn(),
  incrementCacheHits: jest.fn(),
  incrementCacheMisses: jest.fn(),
  startSetDurationTimer: jest.fn(),
} as unknown as jest.Mocked<MetricsService>;

describe('Subscription Integration Tests', () => {
  let app: App;
  let prisma: PrismaClient;

  beforeAll(async () => {
    // Setup test database
    const dbSetup = await setupTestDatabase();

    container.clearInstances();
    container.reset();

    container.registerInstance('PrismaClient', dbSetup.prisma);

    // Register config
    container.registerInstance('Config', config);

    // Register Metrics
    container.registerInstance('MetricsService', mockMetricsService);

    // Register mock services
    // container.registerInstance('WeatherApiProvider', mockWeatherApiService);
    // container.registerInstance('OpenWeatherMapProvider', mockWeatherApiService);
    container.registerInstance('EmailingService', mockEmailingService);
    container.registerInstance('EmailTemplateService', mockEmailTemplateService);

    // Register dependencies for CachedWeatherProvider
    container.registerInstance('WeatherProvider', mockWeatherApiService);
    container.registerInstance('CacheProvider', mockCacheProvider);

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
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Clean database before each test
    await prisma.subscription.deleteMany();
    await prisma.city.deleteMany();

    // Set up default mock implementations
    mockWeatherApiService.searchCity = jest.fn().mockResolvedValue([
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

    mockWeatherApiService.getWeatherByCity = jest.fn().mockResolvedValue({
      city: 'Kyiv',
      temperature: {
        c: 25,
        f: 77,
      },
      humidity: 65,
      shortDescription: 'Sunny',
    } as Weather);

    // mockOpenWeatherService.searchCity = jest.fn().mockResolvedValue([
    //   {
    //     id: 123,
    //     name: 'Kyiv',
    //     region: 'Kyiv Oblast',
    //     country: 'Ukraine',
    //     lat: 50.45,
    //     lon: 30.52,
    //     url: 'kyiv-ukraine',
    //   },
    // ]);

    // mockOpenWeatherService.getWeatherByCity = jest.fn().mockResolvedValue({
    //   city: 'Kyiv',
    //   temperature: {
    //     c: 25,
    //     f: 77,
    //   },
    //   humidity: 65,
    //   shortDescription: 'Sunny',
    // } as Weather);

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

      // Verify email was sent
      expect(mockEmailingService.sendEmail).toHaveBeenCalled();
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

    it('should return 500 when search city fails', async () => {
      // Arrange
      mockWeatherApiService.searchCity = jest.fn().mockRejectedValue(new Error('External API error'));

      // Act
      const response = await request(app).post('/api/subscribe').send(validSubscriptionData);

      // Assert
      expect(response.status).toBe(500);
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
      // Arrange - Force a database error by mocking the delete method
      const originalDeleteMethod = prisma.subscription.delete;
      prisma.subscription.delete = jest.fn().mockRejectedValue(new Error('Database error')) as jest.Mock;

      // Act
      const response = await request(app).get(`/api/unsubscribe/${revokeToken}`);

      // Assert
      expect(response.status).toBe(500);

      // Restore original method
      prisma.subscription.delete = originalDeleteMethod;
    });
  });
});
