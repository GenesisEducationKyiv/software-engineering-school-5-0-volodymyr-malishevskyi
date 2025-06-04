import cors from 'cors';
import express from 'express';
import errorHandleMiddleware from './common/middlewares/error-handle';
import config from './config';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

import prisma from './lib/prisma';

// Common Dependencies
import { emailingService, weatherApiService } from './dependencies';

// Weather Module
import { WeatherController } from './modules/weather/weather.controller';
import weatherRouterFactory from './modules/weather/weather.router';
import { WeatherService } from './modules/weather/weather.service';
const weatherService = new WeatherService(weatherApiService);
const weatherController = new WeatherController(weatherService);
app.use('/api', weatherRouterFactory(weatherController));

// Subscription Module
import { SubscriptionController } from './modules/subscription/subscription.controller';
import subscriptionRouterFactory from './modules/subscription/subscription.router';
import { SubscriptionService } from './modules/subscription/subscription.service';
const subscriptionService = new SubscriptionService(prisma, weatherApiService, emailingService, {
  appUrl: config.appUrl,
});
const subscriptionController = new SubscriptionController(subscriptionService);
app.use('/api', subscriptionRouterFactory(subscriptionController));

// Error handling middleware
app.use(errorHandleMiddleware);

export default app;
