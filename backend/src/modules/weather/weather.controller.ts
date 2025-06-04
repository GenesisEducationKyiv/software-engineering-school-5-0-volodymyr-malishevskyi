import { HTTPBadRequestError, HTTPNotFoundError } from '@/common/errors/http-error';
import { CityNotFoundError } from '@/common/services/weather-api/errors/weather-api';
import { NextFunction, Request, Response } from 'express';
import { IWeatherService } from './types/weather-service';

export class WeatherController {
  constructor(private weatherService: IWeatherService) {}

  async getWeatherByCity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const city = req.query.city as string | undefined;

      if (!city) {
        throw new HTTPBadRequestError('Invalid request');
      }
      const weatherData = await this.weatherService.getWeatherByCity(city);
      res.json(weatherData);
    } catch (error) {
      if (error instanceof CityNotFoundError) return next(new HTTPNotFoundError('City not found'));
      next(error);
    }
  }
}
