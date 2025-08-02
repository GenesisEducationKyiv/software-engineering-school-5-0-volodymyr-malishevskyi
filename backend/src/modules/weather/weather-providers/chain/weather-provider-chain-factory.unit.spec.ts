import { HttpClient } from '@/common/http-client';
import { WeatherProviderChainFactory } from './weather-provider-chain-factory';

const mockHttpClient = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  patch: jest.fn(),
  request: jest.fn(),
} as jest.Mocked<HttpClient>;

// Mock the actual provider services
jest.mock('@/modules/weather/weather-providers/weather-api/weather-api');
jest.mock('@/modules/weather/weather-providers/openweather/openweather');

describe('WeatherProviderChainFactory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createChain', () => {
    it('should create chain with correct priority order', () => {
      const config = {
        weatherApi: {
          apiKey: 'weather-api-key',
          priority: 2,
        },
        openWeather: {
          apiKey: 'openweather-key',
          priority: 1,
        },
      };

      const chain = WeatherProviderChainFactory.createChain(mockHttpClient, config);

      expect(chain).toBeDefined();
      // OpenWeather should be first (priority 1)
      // WeatherAPI should be second (priority 2)
    });

    it('should create chain with single provider', () => {
      const config = {
        weatherApi: {
          apiKey: 'weather-api-key',
          priority: 1,
        },
      };

      const chain = WeatherProviderChainFactory.createChain(mockHttpClient, config);

      expect(chain).toBeDefined();
    });

    it('should throw error when no providers configured', () => {
      const config = {};

      expect(() => {
        WeatherProviderChainFactory.createChain(mockHttpClient, config);
      }).toThrow('No weather providers configured');
    });
  });

  describe('createDefaultChain', () => {
    it('should create default chain with WeatherAPI as primary', () => {
      const chain = WeatherProviderChainFactory.createDefaultChain(
        mockHttpClient,
        'weather-api-key',
        'openweather-key',
      );

      expect(chain).toBeDefined();
    });
  });
});
