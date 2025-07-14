import 'module-alias/register';
import 'reflect-metadata';

import logger from '@/common/services/logger';
import config from '@/config';
import prisma from '@/lib/prisma';
import nodeCron from 'node-cron';

import { IBroadcastService } from '@/common/interfaces/broadcast-service';
import { createApp } from './app';
import { container, initializeDI } from './container';

// Initialize DI container with configuration
initializeDI(config);

// Create express app
const app = createApp(container);

const server = app.listen(config.port, () => {
  logger.info(`Server started: http://127.0.0.1:${config.port}`, { type: 'startup', port: config.port });
});

config.broadcastCrons.forEach(([type, cron]: ['daily' | 'hourly', string]) => {
  if (!nodeCron.validate(cron)) {
    logger.error(`Invalid cron expression for ${type}: ${cron}, skipping...`, {
      type: 'cron',
      cronType: type,
      cronExpression: cron,
    });
    return;
  }

  logger.info(`Scheduling ${type} weather broadcast with cron: ${cron}`, {
    type: 'startup',
    cronType: type,
    cronExpression: cron,
  });
  nodeCron.schedule(cron, async () => {
    const broadcastService = container.resolve<IBroadcastService>('BroadcastService');
    broadcastService.broadcastWeatherUpdates(type).catch((error: Error) => {
      logger.error(`Error broadcasting ${type} weather`, {
        type: 'broadcast',
        cronType: type,
        error: error.message,
        stack: error.stack,
      });
    });
  });
});

const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Shutting down gracefully...`, { type: 'shutdown', signal });
  server.close(async () => {
    logger.info('HTTP server stopped.', { type: 'startup' });
    try {
      await prisma.$disconnect();
      logger.info('Prisma client disconnected.', { type: 'database' });
    } catch (e) {
      logger.error('Error disconnecting Prisma client', { type: 'database', error: e });
    }
    process.exit(0);
  });

  // If the server does not close within a certain time, forcefully exit
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
