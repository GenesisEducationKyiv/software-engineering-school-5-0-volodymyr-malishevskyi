jest.mock('@/config', () => {
  return {
    __esModule: true,
    default: {},
  };
});

import { createApp } from '@/app';
import { GmailEmailingService } from '@/common/services/gmail-emailing';
import { CityNotFoundError } from '@/modules/weather/weather-providers/weather-api/errors/weather-api';
import { WeatherApiService } from '@/modules/weather/weather-providers/weather-api/weather-api';
import { Weather } from '@/modules/weather/weather-providers/weather-provider';
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

describe('Weather Integration Tests', () => {
  let app: App;

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
  }, 60000);

  afterAll(async () => {
    // Clean up resources
    await teardownTestDatabase();
  });

  beforeEach(() => {
    // Reset mocks before each test
    mockWeatherApiService.getWeatherByCity.mockClear();
    mockWeatherApiService.searchCity.mockClear();
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

      // Mock implementation
      mockWeatherApiService.getWeatherByCity = jest.fn().mockResolvedValue(mockWeatherData);

      // Act
      const response = await request(app).get('/api/weather').query({ city: 'Kyiv' });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        temperature: 25,
        humidity: 65,
        description: 'Sunny',
      });
      expect(mockWeatherApiService.getWeatherByCity).toHaveBeenCalledWith('Kyiv');
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
      mockWeatherApiService.getWeatherByCity = jest.fn().mockRejectedValue(new CityNotFoundError());

      // Act
      const response = await request(app).get('/api/weather').query({ city: 'NonexistentCity' });

      // Assert
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message', 'City not found');
    });

    it('should return 500 Internal Server Error for unexpected errors', async () => {
      // Arrange
      mockWeatherApiService.getWeatherByCity = jest.fn().mockRejectedValue(new Error('Unexpected error'));

      // Act
      const response = await request(app).get('/api/weather').query({ city: 'Kyiv' });

      // Assert
      expect(response.status).toBe(500);
    });
  });
});
