import { IWeatherProvider } from '@/modules/weather/infrastructure/weather-providers/types/weather-provider';
import { inject, injectable } from 'tsyringe';
import { ICityResponse, IWeatherResponse, IWeatherService } from '../types/weather.service';

/**
 * Weather Service
 *
 * Provides weather information for cities using configured weather providers.
 * Uses dependency injection for weather provider resolution.
 */
@injectable()
export class WeatherService implements IWeatherService {
  constructor(
    @inject('CachedWeatherProvider')
    private readonly weatherProvider: IWeatherProvider,
  ) {}

  /**
   * Get weather information for a specific city
   *
   * @param city - City name to get weather for
   * @returns Weather information including temperature, humidity, and description
   */
  async getWeatherByCity(city: string): Promise<IWeatherResponse> {
    const weather = await this.weatherProvider.getWeatherByCity(city);

    return {
      temperature: weather.temperature.c,
      humidity: weather.humidity,
      description: weather.shortDescription,
    };
  }

  /**
   * Search for cities by name
   *
   * @param query - Search query for city name
   * @returns Array of cities matching the search query
   */
  async searchCity(query: string): Promise<ICityResponse[]> {
    const cities = await this.weatherProvider.searchCity(query);

    return cities.map((city) => ({
      id: city.id.toString(),
      name: city.name,
      region: city.region,
      country: city.country,
      lat: city.lat,
      lon: city.lon,
      full_name: `${city.name}, ${city.region}, ${city.country}`,
    }));
  }
}
