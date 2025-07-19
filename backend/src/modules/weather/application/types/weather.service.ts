export interface IWeatherResponse {
  temperature: number;
  humidity: number;
  description: string;
}

export interface IWeatherService {
  getWeatherByCity(city: string): Promise<IWeatherResponse>;
}
