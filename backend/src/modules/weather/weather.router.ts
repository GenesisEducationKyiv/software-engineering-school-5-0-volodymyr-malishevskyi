import { Router } from 'express';

import { WeatherController } from './weather.controller';

const weatherRouterFactory = (weatherController: WeatherController) => {
  const router = Router();

  router.get('/weather', weatherController.getWeatherByCity.bind(weatherController));

  return router;
};

export default weatherRouterFactory;
