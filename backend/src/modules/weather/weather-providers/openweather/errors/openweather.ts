export class OpenWeatherError extends Error {
  constructor(
    message: string,
    public code?: number | string,
  ) {
    super(message);
    this.name = 'OpenWeatherError';
    this.code = code;
  }
}

export class CityNotFoundError extends OpenWeatherError {
  constructor() {
    super('City not found');
    this.name = 'CityNotFoundError';
    this.code = '404';
  }
}
