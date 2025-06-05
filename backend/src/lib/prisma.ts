import config from '@/config';

import { PrismaClient } from '@prisma/client';

const isDev = config.nodeEnv === 'development';

const prisma = new PrismaClient({
  log: isDev ? ['query', 'info', 'warn', 'error'] : [],
});

export default prisma;

export * from '@prisma/client';
