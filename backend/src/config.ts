import { config as dotEnvConfig } from 'dotenv';
dotEnvConfig();

import { z } from 'zod';
import safeJsonParse from './common/utils/safe-json-parse';

const configSource = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
  appUrl: process.env.APP_URL || 'http://localhost:3000',
  broadcastCrons: safeJsonParse(process.env.BROADCAST_CRONS, [
    ['daily', '0 0 * * *'],
    ['hourly', '0 * * * *'],
  ]),
  smtp: {
    user: process.env.SMTP_USER,
    password: process.env.SMTP_PASSWORD,
    from: process.env.SMTP_FROM || 'Weather App <noreply@weather.app',
  },
  weather: {
    apiKey: process.env.WEATHER_API_KEY,
    baseUrl: process.env.WEATHER_API_BASE_URL || 'https://api.weatherapi.com/v1',
  },
};

const configSchema = z.object({
  nodeEnv: z.enum(['development', 'production'], {
    errorMap: () => ({ message: 'NODE_ENV must be either "development" or "production"' }),
  }),
  port: z.number().min(1, 'PORT must be a positive integer').max(65535, 'PORT must be a valid port number'),
  appUrl: z.string().url('APP_URL must be a valid URL'),
  broadcastCrons: z.array(z.tuple([z.enum(['daily', 'hourly']), z.string()])),
  smtp: z.object({
    user: z.string().min(1, 'SMTP_USER is required'),
    password: z.string().min(1, 'SMTP_PASSWORD is required'),
    from: z.string().min(1),
  }),
  weather: z.object({
    apiKey: z.string().min(1, 'WEATHER_API_KEY is required'),
    baseUrl: z.string().url('WEATHER_API_BASE_URL must be a valid URL').optional(),
  }),
});

const validation = configSchema.safeParse(configSource);

if (!validation.success) {
  console.error('Invalid configuration:');
  validation.error.issues.forEach((issue) => {
    console.error(`  - ${issue.path.join('.') || 'general'} - ${issue.message}`);
  });
  process.exit(1);
}

const config = validation.data;

export default config;

export type Config = z.infer<typeof configSchema>;
