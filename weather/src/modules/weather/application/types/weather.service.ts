export interface IWeatherResponse {
  temperature: number;
  humidity: number;
  description: string;
}

export interface ICityResponse {
  id: string;
  name: string;
  region: string;
  country: string;
  lat: number;
  lon: number;
  full_name: string;
}

export interface IWeatherService {
  getWeatherByCity(city: string): Promise<IWeatherResponse>;
  searchCity(query: string): Promise<ICityResponse[]>;
}
