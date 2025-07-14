import cors from 'cors';
import express from 'express';
import { MetricsService } from './common/metrics/metrics.service';
import errorHandleMiddleware from './common/middlewares/error-handler';
import requestLoggingMiddleware from './common/middlewares/request-logging';
import { DependencyContainer } from './container';
import { subscriptionRouterFactory } from './modules/subscription';
import { SubscriptionController } from './modules/subscription/subscription.controller';
import { weatherRouterFactory } from './modules/weather';
import { WeatherController } from './modules/weather/weather.controller';

export function createApp(container: DependencyContainer) {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cors());
  app.use(requestLoggingMiddleware);

  // Weather Module
  const weatherController = container.resolve('WeatherController') as WeatherController;
  app.use('/api', weatherRouterFactory(weatherController));

  // Subscription Module
  const subscriptionController = container.resolve('SubscriptionController') as SubscriptionController;
  app.use('/api', subscriptionRouterFactory(subscriptionController));

  // Metrics Module
  const metricsService = container.resolve('MetricsService') as MetricsService;
  const prometheusRegistry = metricsService.getRegistry();
  app.get('/metrics', async (req, res) => {
    res.set('Content-Type', prometheusRegistry.contentType);
    res.end(await prometheusRegistry.metrics());
  });

  // Error handling middleware
  app.use(errorHandleMiddleware);

  return app;
}
