import { SubscriptionCancelledEvent, SubscriptionConfirmedEvent, SubscriptionCreatedEvent } from '@/common/events';
import { EventBusFactory } from '@/common/events/event-bus-factory';
import { IEventBus } from '@/common/events/interfaces/event-bus.interface';
import { FetchHttpClient } from '@/common/http-client';
import logger from '@/common/logging/logger';
import { BroadcastService } from '@/common/services/broadcast.service';
import { ConfigFactory } from '@/config';
import { PrismaClientInstance } from '@/lib/prisma';
import {
  EmailTemplateService,
  GmailEmailingService,
  NotificationService,
  SubscriptionEventConsumer,
} from '@/modules/notification';
import { SubscriptionService } from '@/modules/subscription/application/services/subscription.service';
import SubscriptionRepository from '@/modules/subscription/infrastructure/repository/SubscriptionRepository';
import { SubscriptionController } from '@/modules/subscription/presentation/subscription.controller';
import { WeatherServiceHttpClient } from '@/modules/weather/infrastructure/weather-http-client';
import { Registry } from 'prom-client';
import 'reflect-metadata';
import { container, DependencyContainer } from 'tsyringe';
import { MetricsService } from './common/metrics/metrics.service';
import { WeatherService } from './modules/weather/application/services/weather.service';
import { WeatherServiceGrpcClient } from './modules/weather/infrastructure/weather-grpc-client';
import { WeatherController } from './modules/weather/presentation/weather.controller';

// Create config instance from environment variables
const config = ConfigFactory.createFromEnv();

// Infrastructure services
container.registerInstance('Config', config);
container.registerSingleton('PrismaClient', PrismaClientInstance);
container.registerInstance('Logger', logger);
container.registerSingleton('HttpClient', FetchHttpClient);
container.registerSingleton('PromClientRegistry', Registry);
container.registerSingleton('MetricsService', MetricsService);

// Event Bus
const eventBusInstance = EventBusFactory.create(config.eventBus);
container.registerInstance('EventBus', eventBusInstance);

// Weather service configuration
container.registerInstance('WeatherServiceHttpClientConfig', {
  baseUrl: config.weatherService.httpUrl,
});

container.registerInstance('WeatherServiceGrpcClientConfig', {
  serverAddress: config.weatherService.grpcUrl,
  timeout: 10000,
});

// Weather clients
container.registerSingleton('WeatherServiceHttpClient', WeatherServiceHttpClient);
container.registerSingleton('WeatherServiceGrpcClient', WeatherServiceGrpcClient);

// Main weather provider (switch between HTTP and gRPC based on config)
container.register('WeatherProvider', {
  useFactory: () => {
    if (config.communicationProtocol === 'grpc') {
      return container.resolve<WeatherServiceGrpcClient>('WeatherServiceGrpcClient');
    } else {
      return container.resolve<WeatherServiceHttpClient>('WeatherServiceHttpClient');
    }
  },
});

// Business services
container.registerSingleton('EmailingService', GmailEmailingService);
container.registerSingleton('EmailTemplateService', EmailTemplateService);
container.registerSingleton('NotificationService', NotificationService);
container.registerSingleton('BroadcastService', BroadcastService);

// Event consumers
container.registerSingleton('SubscriptionEventConsumer', SubscriptionEventConsumer);

// Weather module is now handled by weather-service via HTTP client
container.registerSingleton('WeatherController', WeatherController);
container.registerSingleton('WeatherService', WeatherService);

// Subscription module
container.registerSingleton('SubscriptionRepository', SubscriptionRepository);
container.registerSingleton('SubscriptionService', SubscriptionService);
container.registerSingleton('SubscriptionController', SubscriptionController);

// Initialize event consumers for main container
const eventBus = container.resolve<IEventBus>('EventBus');
const subscriptionEventConsumer = container.resolve<SubscriptionEventConsumer>('SubscriptionEventConsumer');

// Register subscription event handlers
eventBus.subscribe(SubscriptionCreatedEvent.EVENT_TYPE, subscriptionEventConsumer.getSubscriptionCreatedHandler());
eventBus.subscribe(SubscriptionConfirmedEvent.EVENT_TYPE, subscriptionEventConsumer.getSubscriptionConfirmedHandler());
eventBus.subscribe(SubscriptionCancelledEvent.EVENT_TYPE, subscriptionEventConsumer.getSubscriptionCancelledHandler());

/**
 * Export container for direct access
 */
export { container, DependencyContainer };
