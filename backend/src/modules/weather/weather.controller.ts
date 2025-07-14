import { HTTPBadRequestError, HTTPNotFoundError } from '@/common/errors/http-error';
import { WeatherApiCityNotFoundError } from './weather-providers/weather-api/errors/weather-api';
import { OpenWeatherCityNotFoundError } from './weather-providers/openweather/errors/openweather';
import { NextFunction, Request, Response } from 'express';
import { inject, injectable } from 'tsyringe';
import { z } from 'zod';
import { IWeatherService } from './types/weather-service';

@injectable()
export class WeatherController {
  constructor(
    @inject('WeatherService')
    private weatherService: IWeatherService,
  ) {}

  async getWeatherByCity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const city = z.string().min(1).parse(req.query.city);

      const weatherData = await this.weatherService.getWeatherByCity(city);
      res.json(weatherData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return next(new HTTPBadRequestError('Invalid request'));
      }
      if (error instanceof WeatherApiCityNotFoundError || error instanceof OpenWeatherCityNotFoundError) {
        return next(new HTTPNotFoundError('City not found'));
      }
      next(error);
    }
  }
}
