import { IWeatherProvider } from '@/common/interfaces/weather-provider';
import { inject, injectable } from 'tsyringe';
import { WeatherResponse } from './types/weather';

/**
 * Weather Service
 *
 * Provides weather information for cities using configured weather providers.
 * Uses dependency injection for weather provider resolution.
 */
@injectable()
export class WeatherService {
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
  async getWeatherByCity(city: string): Promise<WeatherResponse> {
    const weather = await this.weatherProvider.getWeatherByCity(city);

    return {
      temperature: weather.temperature.c,
      humidity: weather.humidity,
      description: weather.shortDescription,
    };
  }
}
