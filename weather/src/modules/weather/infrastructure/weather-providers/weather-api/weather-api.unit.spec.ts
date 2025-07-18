import { WeatherApiCityNotFoundError } from './errors/weather-api';
import { WeatherApiError } from './errors/weather-api';
import { WeatherApiProvider } from './weather-api';

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

describe('WeatherApiProvider', () => {
  const weatherApiProvider = new WeatherApiProvider(mockHttpClient, {
    apiKey: 'test-api-key',
  });

  it('should return weather data for a valid city', async () => {
    const mockWeatherResponse = {
      current: {
        temp_c: 20,
        temp_f: 68,
        humidity: 50,
        condition: { text: 'Sunny' },
      },
      location: { name: 'Kyiv' },
    };

    mockHttpClient.get.mockResolvedValue({
      data: mockWeatherResponse,
      status: 200,
      statusText: 'OK',
      headers: new Headers(),
    });

    const weather = await weatherApiProvider.getWeatherByCity('Kyiv');

    expect(weather).toEqual({
      city: 'Kyiv',
      temperature: { c: 20, f: 68 },
      humidity: 50,
      shortDescription: 'Sunny',
    });
  });

  it('should throw an error if invalid city', async () => {
    mockHttpClient.get.mockResolvedValue({
      data: {
        error: {
          code: 1006,
          message: 'No matching location found.',
        },
      },
      status: 400,
      statusText: 'Bad Request',
      headers: new Headers({
        'Content-Type': 'application/json',
      }),
    });
    await expect(weatherApiProvider.getWeatherByCity('InvalidCity')).rejects.toThrow(WeatherApiCityNotFoundError);
  });

  it('should handle non-JSON error response', async () => {
    mockHttpClient.get.mockResolvedValue({
      data: 'Not Found',
      status: 404,
      statusText: 'Not Found',
      headers: new Headers({
        'Content-Type': 'text/plain',
      }),
    });

    await expect(weatherApiProvider.getWeatherByCity('Some city')).rejects.toThrow(WeatherApiError);
  });
});
