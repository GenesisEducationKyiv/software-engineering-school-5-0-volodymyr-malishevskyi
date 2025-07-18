import { IWeatherProvider } from '@/modules/weather/infrastructure/weather-providers/types/weather-provider';
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
    testContainer.registerInstance('CachedWeatherProvider', mockWeatherProvider);
    weatherService = testContainer.resolve(WeatherService);
    mockWeatherProvider.getWeatherByCity.mockClear();
    mockWeatherProvider.searchCity.mockClear();
  });

  afterEach(() => {
    testContainer.clearInstances();
  });

  describe('getWeatherByCity', () => {
    it('should return weather data for a valid city', async () => {
      const mockWeatherData = {
        city: 'Kyiv',
        temperature: { c: 20, f: 68 },
        humidity: 65,
        shortDescription: 'Partly cloudy',
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

  describe('searchCity', () => {
    it('should return transformed city data for a valid search query', async () => {
      const mockCityData = [
        {
          id: 123,
          name: 'Kyiv',
          region: 'Kyiv Oblast',
          country: 'Ukraine',
          lat: 50.45,
          lon: 30.52,
          url: 'kyiv-ukraine',
        },
        {
          id: 456,
          name: 'Kiev',
          region: 'Kyiv Oblast',
          country: 'Ukraine',
          lat: 50.45,
          lon: 30.52,
          url: 'kiev-ukraine',
        },
      ];

      mockWeatherProvider.searchCity.mockResolvedValue(mockCityData);

      const result = await weatherService.searchCity('Kyiv');

      expect(result).toEqual([
        {
          id: '123',
          name: 'Kyiv',
          region: 'Kyiv Oblast',
          country: 'Ukraine',
          lat: 50.45,
          lon: 30.52,
          full_name: 'Kyiv, Kyiv Oblast, Ukraine',
        },
        {
          id: '456',
          name: 'Kiev',
          region: 'Kyiv Oblast',
          country: 'Ukraine',
          lat: 50.45,
          lon: 30.52,
          full_name: 'Kiev, Kyiv Oblast, Ukraine',
        },
      ]);
      expect(mockWeatherProvider.searchCity).toHaveBeenCalledWith('Kyiv');
    });

    it('should handle errors from weather provider', async () => {
      const error = new Error('Search service unavailable');
      mockWeatherProvider.searchCity.mockRejectedValue(error);

      await expect(weatherService.searchCity('Kyiv')).rejects.toThrow('Search service unavailable');
    });

    it('should return empty array when no cities found', async () => {
      mockWeatherProvider.searchCity.mockResolvedValue([]);

      const result = await weatherService.searchCity('NonexistentCity');

      expect(result).toEqual([]);
      expect(mockWeatherProvider.searchCity).toHaveBeenCalledWith('NonexistentCity');
    });
  });
});
