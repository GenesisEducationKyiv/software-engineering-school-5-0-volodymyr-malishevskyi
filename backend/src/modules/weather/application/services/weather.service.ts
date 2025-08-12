import { IWeatherProvider } from '@/modules/weather/infrastructure/types/weather.client';
import { inject, injectable } from 'tsyringe';
import { IWeatherResponse, IWeatherService } from '../types/weather.service';

/**
 * Weather Service
 *
 * Provides weather information for cities using configured weather providers.
 * Uses dependency injection for weather provider resolution.
 */
@injectable()
export class WeatherService implements IWeatherService {
  constructor(
    @inject('WeatherProvider')
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
      temperature: weather.temperature,
      humidity: weather.humidity,
      description: weather.description,
    };
  }
}
