import { ErrorCode } from '../types/weather-api';

export class WeatherApiError extends Error {
  constructor(
    message: string,
    public code?: number,
  ) {
    super(message);
    this.name = 'WeatherApiError';
    this.code = code;
  }
}

export class CityNotFoundError extends WeatherApiError {
  constructor() {
    super(`City not found`);
    this.name = 'CityNotFoundError';
    this.code = ErrorCode.CITY_NOT_FOUND;
  }
}
