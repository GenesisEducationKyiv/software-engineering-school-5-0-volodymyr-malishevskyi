import { HTTPBadRequestError, HTTPNotFoundError } from '@/common/errors/http-error';
import { CityNotFoundError } from '@/common/services/weather-api/errors/weather-api';
import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { IWeatherService } from './types/weather-service';

export class WeatherController {
  constructor(private weatherService: IWeatherService) {}

  async getWeatherByCity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const city = z.string().min(1).parse(req.query.city);

      const weatherData = await this.weatherService.getWeatherByCity(city);
      res.json(weatherData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return next(new HTTPBadRequestError('Invalid request'));
      }
      if (error instanceof CityNotFoundError) {
        return next(new HTTPNotFoundError('City not found'));
      }
      next(error);
    }
  }
}
