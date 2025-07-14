import { OpenWeatherMapProvider } from '@/modules/weather/weather-providers/openweather/openweather';
import { City, Weather } from '@/common/interfaces/weather-provider';
import { WeatherProviderHandler } from './weather-provider-handler';

/**
 * Adapter that wraps OpenWeatherService to work with Chain of Responsibility pattern
 */
export class OpenWeatherHandler extends WeatherProviderHandler {
  constructor(private openWeatherService: OpenWeatherMapProvider) {
    super();
  }

  protected async handleWeatherRequest(city: string): Promise<Weather> {
    return await this.openWeatherService.getWeatherByCity(city);
  }

  protected async handleCitySearchRequest(city: string): Promise<City[]> {
    return await this.openWeatherService.searchCity(city);
  }

  protected getProviderName(): string {
    return 'OpenWeatherMap';
  }
}
