import { WeatherApiService } from '@/modules/weather/weather-providers/weather-api/weather-api';
import { City, Weather } from '@/modules/weather/weather-providers/weather-provider';
import { WeatherProviderHandler } from './weather-provider-handler';

/**
 * Adapter that wraps WeatherApiService to work with Chain of Responsibility pattern
 */
export class WeatherApiHandler extends WeatherProviderHandler {
  constructor(private weatherApiService: WeatherApiService) {
    super();
  }

  protected async handleWeatherRequest(city: string): Promise<Weather> {
    return await this.weatherApiService.getWeatherByCity(city);
  }

  protected async handleCitySearchRequest(city: string): Promise<City[]> {
    return await this.weatherApiService.searchCity(city);
  }

  protected getProviderName(): string {
    return 'WeatherAPI';
  }
}
