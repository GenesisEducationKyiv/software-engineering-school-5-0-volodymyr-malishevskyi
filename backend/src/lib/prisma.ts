import config from '@/config';
import { PrismaClient } from '@prisma/client';
import 'reflect-metadata';
import { injectable } from 'tsyringe';

const isDev = config.nodeEnv === 'development';

@injectable()
export class PrismaClientInstance extends PrismaClient {
  constructor() {
    super({
      log: isDev ? ['query', 'info', 'warn', 'error'] : [],
    });
  }
}

const prisma = new PrismaClientInstance();

export default prisma;
export * from '@prisma/client';
