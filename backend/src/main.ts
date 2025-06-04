import 'module-alias/register';

import config from '@/config';

import prisma from '@/lib/prisma';
import nodeCron from 'node-cron';
import app from './app';
import { weatherBroadcastService } from './dependencies';

const port = config.port;

const server = app.listen(port, () => {
  console.log(`Server started: http://127.0.0.1:${port}`);
});

config.broadcastCrons.forEach(([type, cron]) => {
  if (!nodeCron.validate(cron)) {
    console.error(`Invalid cron expression for ${type}: ${cron}, skipping...`);
    return;
  }

  console.log(`Scheduling ${type} weather broadcast with cron: ${cron}`);
  nodeCron.schedule(cron, async () => {
    weatherBroadcastService.broadcast(type).catch((error) => {
      console.error(`Error broadcasting ${type} weather:`, error);
    });
  });
});

const gracefulShutdown = async (signal: string) => {
  console.log(`Received ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    console.log('HTTP server stopped.');
    try {
      await prisma.$disconnect();
      console.log('Prisma client disconnected.');
    } catch (e) {
      console.error('Error disconnecting Prisma client:', e);
    }
    process.exit(0);
  });

  // If the server does not close within a certain time, forcefully exit
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  gracefulShutdown('uncaughtException').then(() => process.exit(1));
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection').then(() => process.exit(1));
});
