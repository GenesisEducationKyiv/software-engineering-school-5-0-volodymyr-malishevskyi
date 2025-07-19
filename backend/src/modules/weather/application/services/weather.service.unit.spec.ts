import { IWeatherProvider } from '@/modules/weather/infrastructure/types/weather.client';
import 'reflect-metadata';
import { container } from 'tsyringe';
import { WeatherService } from './weather.service';

const mockWeatherProvider = {
  getWeatherByCity: jest.fn(),
  searchCity: jest.fn(),
} as unknown as jest.Mocked<IWeatherProvider>;

describe('WeatherService', () => {
  let weatherService: WeatherService;
  let testContainer: typeof container;

  beforeEach(() => {
    testContainer = container.createChildContainer();
    testContainer.registerInstance('WeatherProvider', mockWeatherProvider);
    weatherService = testContainer.resolve(WeatherService);
    mockWeatherProvider.getWeatherByCity.mockClear();
  });

  afterEach(() => {
    testContainer.clearInstances();
  });

  describe('getWeatherByCity', () => {
    it('should return weather data for a valid city', async () => {
      const mockWeatherData = {
        temperature: 20,
        humidity: 65,
        description: 'Partly cloudy',
      };

      mockWeatherProvider.getWeatherByCity.mockResolvedValue(mockWeatherData);

      const result = await weatherService.getWeatherByCity('Kyiv');

      expect(result).toEqual({
        temperature: 20,
        humidity: 65,
        description: 'Partly cloudy',
      });
      expect(mockWeatherProvider.getWeatherByCity).toHaveBeenCalledWith('Kyiv');
    });

    it('should handle errors from weather provider', async () => {
      const error = new Error('Weather service unavailable');
      mockWeatherProvider.getWeatherByCity.mockRejectedValue(error);

      await expect(weatherService.getWeatherByCity('Kyiv')).rejects.toThrow('Weather service unavailable');
    });
  });
});
