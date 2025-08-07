import type * as grpc from '@grpc/grpc-js';

export interface ProtoGrpcType {
  weather: {
    WeatherService: grpc.ServiceClientConstructor;
    WeatherRequest: WeatherRequestConstructor;
    WeatherResponse: WeatherResponseConstructor;
    SearchCityRequest: SearchCityRequestConstructor;
    SearchCityResponse: SearchCityResponseConstructor;
    City: CityConstructor;
  };
}

export interface WeatherRequest {
  city: string;
}

export interface WeatherRequestConstructor {
  new (properties?: WeatherRequest): WeatherRequest;
}

export interface WeatherResponse {
  temperature: number;
  humidity: number;
  description: string;
  city_full_name: string;
}

export interface WeatherResponseConstructor {
  new (properties?: WeatherResponse): WeatherResponse;
}

export interface SearchCityRequest {
  query: string;
}

export interface SearchCityRequestConstructor {
  new (properties?: SearchCityRequest): SearchCityRequest;
}

export interface SearchCityResponse {
  cities: City[];
}

export interface SearchCityResponseConstructor {
  new (properties?: SearchCityResponse): SearchCityResponse;
}

export interface City {
  id: string;
  name: string;
  region: string;
  country: string;
  lat: number;
  lon: number;
  full_name: string;
}

export interface CityConstructor {
  new (properties?: City): City;
}
