jest.mock('@/config', () => {
  return {
    __esModule: true,
    default: {},
  };
});

import { createApp } from '@/app';
import { GmailEmailingService } from '@/common/services/gmail-emailing';
import { WeatherApiService } from '@/common/services/weather-api/weather-api';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import { setupTestDatabase, teardownTestDatabase } from '../helpers/test-database';

const mockWeatherApiService = {
  getWeatherByCity: jest.fn(),
  searchCity: jest.fn(),
} as unknown as jest.Mocked<WeatherApiService>;

const mockEmailingService = {
  sendEmail: jest.fn(),
} as unknown as jest.Mocked<GmailEmailingService>;

describe('App E2E Tests', () => {
  let app: App;
  let prisma: PrismaClient;

  beforeAll(async () => {
    // Setup test database
    const dbSetup = await setupTestDatabase();

    app = createApp({
      weatherApiService: mockWeatherApiService,
      emailingService: mockEmailingService,
      config: {
        appUrl: 'http://localhost:3000',
      },
      prisma: dbSetup.prisma,
    });

    prisma = dbSetup.prisma;
  }, 60000);

  afterAll(async () => {
    // Clean up resources
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    // Reset mocks and clean database before each test
    mockWeatherApiService.getWeatherByCity.mockClear();
    mockWeatherApiService.searchCity.mockClear();
    mockEmailingService.sendEmail.mockClear();

    await prisma.subscription.deleteMany();
    await prisma.city.deleteMany();

    // Setup mocks with default implementations
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
      expect(subscribeEmailCallArgs.html).toContain(
        `http://localhost:3000/api/confirm/${pendingSubscription?.confirmationToken}`,
      );

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
      expect(confirmationEmailCallArgs.html).toContain(`City: ${confirmedSubscription?.city.fullName}`);
      expect(confirmationEmailCallArgs.html).toContain(`Frequency: ${confirmedSubscription?.frequency.toLowerCase()}`);
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
      expect(unsubscribeEmailCallArgs.subject).toBe('Weather Subscription Successfully Unsubscribed!');
      expect(unsubscribeEmailCallArgs.html).toContain(
        `http://localhost:3000/api/unsubscribe/${confirmedSubscription?.revokeToken}`,
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle error scenarios gracefully', async () => {
      // Test invalid city search
      mockWeatherApiService.searchCity = jest.fn().mockResolvedValue([]);

      const subscribeResponse = await request(app).post('/api/subscribe').send({
        email: 'user@example.com',
        city: 'NonexistentCity',
        frequency: 'daily',
      });

      expect(subscribeResponse.status).toBe(500);

      // Test weather API failures
      mockWeatherApiService.getWeatherByCity = jest.fn().mockRejectedValue(new Error('API error'));

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
