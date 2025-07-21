import { WeatherService } from './weather.service';

const mockWeatherApiService = {
  getWeatherByCity: jest.fn(),
  searchCity: jest.fn(),
};

beforeEach(() => {
  mockWeatherApiService.getWeatherByCity.mockClear();
});

describe('WeatherService', () => {
  it('should return weather data in required structure', async () => {
    mockWeatherApiService.getWeatherByCity.mockResolvedValue({
      temperature: { c: 20, f: 68 },
      humidity: 50,
      shortDescription: 'Sunny',
    });

    const weatherService = new WeatherService(mockWeatherApiService);
    const weather = await weatherService.getWeatherByCity('Kyiv');

    expect(weather).toEqual({
      temperature: 20,
      humidity: 50,
      description: 'Sunny',
    });
  });
});
