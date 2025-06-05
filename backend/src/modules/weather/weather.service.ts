import { IWeatherApiService } from '@/common/interfaces/weather-api-service';
import { WeatherResponse } from './types/weather';

export class WeatherService {
  constructor(private weatherApiService: IWeatherApiService) {}

  async getWeatherByCity(city: string): Promise<WeatherResponse> {
    const weather = await this.weatherApiService.getWeatherByCity(city);

    return {
      temperature: weather.temperature.c,
      humidity: weather.humidity,
      description: weather.shortDescription,
    };
  }
}
