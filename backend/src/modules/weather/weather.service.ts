import { IWeatherProvider } from '@/modules/weather/weather-providers/weather-provider';
import { WeatherResponse } from './types/weather';

export class WeatherService {
  constructor(private weatherApiService: IWeatherProvider) {}

  async getWeatherByCity(city: string): Promise<WeatherResponse> {
    const weather = await this.weatherApiService.getWeatherByCity(city);

    return {
      temperature: weather.temperature.c,
      humidity: weather.humidity,
      description: weather.shortDescription,
    };
  }
}
