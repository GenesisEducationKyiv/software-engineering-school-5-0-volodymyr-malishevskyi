import cors from 'cors';
import express from 'express';
import { IEmailingService } from './common/interfaces/emailing-service';
import { IWeatherApiService } from './common/interfaces/weather-api-service';
import errorHandleMiddleware from './common/middlewares/error-handle';
import { PrismaClient } from './lib/prisma';
import {
  SubscriptionController,
  SubscriptionRepository,
  subscriptionRouterFactory,
  SubscriptionService,
} from './modules/subscription';
import { WeatherController, weatherRouterFactory, WeatherService } from './modules/weather';

export function createApp(dependencies: {
  config: {
    appUrl: string;
  };
  weatherApiService: IWeatherApiService;
  emailingService: IEmailingService;
  prisma: PrismaClient;
}) {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cors());

  // Weather Module
  const weatherService = new WeatherService(dependencies.weatherApiService);
  const weatherController = new WeatherController(weatherService);
  app.use('/api', weatherRouterFactory(weatherController));

  // Subscription Module
  const subscriptionRepository = new SubscriptionRepository(dependencies.prisma);
  const subscriptionService = new SubscriptionService(
    subscriptionRepository,
    dependencies.weatherApiService,
    dependencies.emailingService,
    {
      appUrl: dependencies.config.appUrl,
    },
  );
  const subscriptionController = new SubscriptionController(subscriptionService);
  app.use('/api', subscriptionRouterFactory(subscriptionController));

  // Error handling middleware
  app.use(errorHandleMiddleware);

  return app;
}
