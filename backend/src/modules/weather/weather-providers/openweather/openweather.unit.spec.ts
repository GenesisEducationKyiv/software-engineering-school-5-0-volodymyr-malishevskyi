import { CityNotFoundError, OpenWeatherError } from './errors/openweather';
import { OpenWeatherMapProvider } from './openweather';

const mockHttpClient = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  patch: jest.fn(),
  request: jest.fn(),
};

beforeEach(() => {
  mockHttpClient.get.mockClear();
});

describe('OpenWeatherProvider', () => {
  const openWeatherProvider = new OpenWeatherMapProvider(mockHttpClient, {
    apiKey: 'test-api-key',
  });

  describe('getWeatherByCity', () => {
    it('should return weather data for a valid city', async () => {
      const mockWeatherResponse = {
        name: 'Kyiv',
        main: {
          temp: 20,
          humidity: 50,
        },
        weather: [
          {
            description: 'clear sky',
          },
        ],
      };

      mockHttpClient.get.mockResolvedValue({
        data: mockWeatherResponse,
        status: 200,
        statusText: 'OK',
        headers: new Headers({
          'Content-Type': 'application/json',
        }),
      });

      const weather = await openWeatherProvider.getWeatherByCity('Kyiv');

      expect(weather).toEqual({
        city: 'Kyiv',
        temperature: { c: 20, f: 68 },
        humidity: 50,
        shortDescription: 'clear sky',
      });
    });

    it('should throw CityNotFoundError for invalid city', async () => {
      mockHttpClient.get.mockResolvedValue({
        data: {
          cod: '404',
          message: 'city not found',
        },
        status: 404,
        statusText: 'Not Found',
        headers: new Headers({
          'Content-Type': 'application/json',
        }),
      });

      await expect(openWeatherProvider.getWeatherByCity('InvalidCity')).rejects.toThrow(CityNotFoundError);
    });

    it('should handle non-JSON error response', async () => {
      mockHttpClient.get.mockResolvedValue({
        data: 'Internal Server Error',
        status: 500,
        statusText: 'Internal Server Error',
        headers: new Headers({
          'Content-Type': 'text/plain',
        }),
      });

      await expect(openWeatherProvider.getWeatherByCity('SomeCity')).rejects.toThrow(OpenWeatherError);
    });
  });

  describe('searchCity', () => {
    it('should return city search results', async () => {
      const mockSearchResponse = [
        {
          name: 'Kyiv',
          country: 'UA',
          state: 'Kyiv City',
          lat: 50.4501,
          lon: 30.5234,
        },
      ];

      mockHttpClient.get.mockResolvedValue({
        data: mockSearchResponse,
        status: 200,
        statusText: 'OK',
        headers: new Headers({
          'Content-Type': 'application/json',
        }),
      });

      const cities = await openWeatherProvider.searchCity('Kyiv');

      expect(cities).toHaveLength(1);
      expect(cities[0]).toEqual({
        id: 1,
        name: 'Kyiv',
        region: 'Kyiv City',
        country: 'UA',
        lat: 50.4501,
        lon: 30.5234,
        url: 'kyiv-ua',
      });
    });

    it('should handle empty search results', async () => {
      mockHttpClient.get.mockResolvedValue({
        data: [],
        status: 200,
        statusText: 'OK',
        headers: new Headers({
          'Content-Type': 'application/json',
        }),
      });

      const cities = await openWeatherProvider.searchCity('NonexistentCity');

      expect(cities).toEqual([]);
    });
  });
});
