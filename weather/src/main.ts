import 'module-alias/register';
import 'reflect-metadata';

import logger from '@/common/logging/logger';
import { type Config } from '@/config';

import { createApp } from './app';
import { container } from './container';
import { WeatherGrpcServer } from './grpc/weather-grpc-server';

// Get config from container
const config = container.resolve<Config>('Config');

// Create express app
const app = createApp(container);

// Create gRPC server
const grpcServer = new WeatherGrpcServer(container);

// Start HTTP server
const httpServer = app.listen(config.port, () => {
  logger.info(`HTTP server started: http://127.0.0.1:${config.port}`, { type: 'startup', port: config.port });
});

// Start gRPC server
grpcServer
  .start('0.0.0.0:50051')
  .then(() => {
    logger.info('gRPC server started on port 50051', { type: 'startup' });
  })
  .catch((error) => {
    logger.error('Failed to start gRPC server', { error, type: 'startup' });
    process.exit(1);
  });

const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Shutting down gracefully...`, { type: 'shutdown', signal });

  // Close HTTP server
  httpServer.close(async () => {
    logger.info('HTTP server stopped.', { type: 'shutdown' });

    // Close gRPC server
    await grpcServer.shutdown();
    process.exit(0);
  });

  // If the servers do not close within a certain time, forcefully exit
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down', { type: 'shutdown', forced: true });
    process.exit(1);
  }, 10000);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { type: 'system', error: error.message, stack: error.stack });
  gracefulShutdown('uncaughtException').then(() => process.exit(1));
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { type: 'system', reason, promise });
  gracefulShutdown('unhandledRejection').then(() => process.exit(1));
});
