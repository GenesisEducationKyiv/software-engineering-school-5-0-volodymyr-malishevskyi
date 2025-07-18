export type City = {
  id: number;
  name: string;
  region: string;
  country: string;
  lat: number;
  lon: number;
  url: string;
};

export interface IWeatherProvider {
  searchCity(city: string): Promise<City[]>;
}
