export type Weather = {
  city: string;
  temperature: {
    c: number;
    f: number;
  };
  humidity: number;
  shortDescription: string;
};

export type City = {
  id: number;
  name: string;
  region: string;
  country: string;
  lat: number;
  lon: number;
  url: string;
};

export interface IWeatherApiService {
  getWeatherByCity(city: string): Promise<Weather>;
  searchCity(city: string): Promise<City[]>;
}
