import 'reflect-metadata';

import { createApp } from '@/app';
import { ConfigFactory } from '@/config/config-factory';
import { container } from '@/container';
import { IWeatherResponse } from '@/modules/weather/infrastructure/types/weather.client';
import request from 'supertest';
import { App } from 'supertest/types';
import { DependencyContainer } from 'tsyringe';
import {
  mockCacheProvider,
  mockEmailingService,
  mockMetricsService,
  mockSubscriptionRepository,
  mockWeatherProvider,
} from '../helpers/mocks';

// Mock token generator utility
jest.mock('@/common/utils/token-generator', () => ({
  generateConfirmationToken: jest.fn().mockReturnValue('test-confirmation-token'),
  generateRevokeToken: jest.fn().mockReturnValue('test-revoke-token'),
  generateToken: jest.fn().mockReturnValue('test-token'),
}));

describe('Weather Integration Tests', () => {
  let app: App;
  let testContainer: DependencyContainer;

  beforeAll(async () => {
    // Create child container from main container
    testContainer = container.createChildContainer();

    // Register test config
    const config = ConfigFactory.createTestConfig();
    testContainer.registerInstance('Config', config);

    // Override only the services we want to mock
    testContainer.registerInstance('MetricsService', mockMetricsService);
    testContainer.registerInstance('EmailingService', mockEmailingService);
    testContainer.registerInstance('WeatherProvider', mockWeatherProvider);
    testContainer.registerInstance('CacheProvider', mockCacheProvider);
    testContainer.registerInstance('SubscriptionRepository', mockSubscriptionRepository);

    app = createApp(testContainer);
  }, 60000);

  afterAll(async () => {});

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe('GET /api/weather', () => {
    it('should return weather data for a valid city', async () => {
      // Arrange
      const mockWeatherData: IWeatherResponse = {
        temperature: 25,
        humidity: 65,
        description: 'Sunny',
      };

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

    it('should return 500 Internal Server Error when weather provider fails', async () => {
      // Arrange
      mockWeatherProvider.getWeatherByCity.mockRejectedValue(new Error('Weather service unavailable'));

      // Act
      const response = await request(app).get('/api/weather').query({ city: 'NonexistentCity' });

      // Assert
      expect(response.status).toBe(500);
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
