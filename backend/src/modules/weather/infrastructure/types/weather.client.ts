export interface IWeatherProvider {
  getWeatherByCity(city: string): Promise<IWeatherResponse>;
  searchCity(city: string): Promise<ICityResponse>;
}

export interface IWeatherResponse {
  temperature: number;
  humidity: number;
  description: string;
}

export type City = {
  id: number;
  name: string;
  region: string;
  country: string;
  lat: number;
  lon: number;
  url: string;
};

export type ICityResponse = City[];
