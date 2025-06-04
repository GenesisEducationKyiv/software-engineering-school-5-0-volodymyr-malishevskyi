import { WeatherResponse } from './weather';

export interface IWeatherService {
  getWeatherByCity(city: string): Promise<WeatherResponse>;
}
