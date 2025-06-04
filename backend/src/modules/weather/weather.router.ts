import { Router } from 'express';

import { WeatherController } from './weather.controller';

const router = Router();

const weatherRouterFactory = (weatherController: WeatherController) => {
  router.get('/weather', weatherController.getWeatherByCity.bind(weatherController));

  return router;
};

export default weatherRouterFactory;
