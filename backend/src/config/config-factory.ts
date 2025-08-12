import safeJsonParse from '@/common/utils/safe-json-parse';
import { z } from 'zod';

/**
 * Configuration schema for validation
 */
export const configSchema = z.object({
  nodeEnv: z.enum(['development', 'production', 'test'], {
    errorMap: () => ({ message: 'NODE_ENV must be either "development", "production" or "test"' }),
  }),
  port: z.number().min(1, 'PORT must be a positive integer').max(65535, 'PORT must be a valid port number'),
  appUrl: z.string().url('APP_URL must be a valid URL'),
  broadcastCrons: z.array(z.tuple([z.enum(['daily', 'hourly']), z.string()])),
  communicationProtocol: z.enum(['http', 'grpc']),
  weatherService: z.object({
    httpUrl: z.string().url('WEATHER_SERVICE_URL must be a valid URL'),
    grpcUrl: z.string().min(1, 'WEATHER_SERVICE_GRPC_URL is required'),
  }),
  smtp: z.object({
    user: z.string().min(1, 'SMTP_USER is required'),
    password: z.string().min(1, 'SMTP_PASSWORD is required'),
    from: z.string().min(1),
  }),
  weather: z
    .object({
      providers: z.object({
        weatherApi: z.object({
          apiKey: z.string().optional(),
          priority: z.number().min(1).default(1),
        }),
        openWeather: z.object({
          apiKey: z.string().optional(),
          priority: z.number().min(1).default(2),
        }),
      }),
    })
    .refine((data) => data.providers.weatherApi.apiKey || data.providers.openWeather.apiKey, {
      message: 'At least one weather provider API key must be configured (WEATHER_API_KEY or OPENWEATHER_API_KEY)',
    }),
  cache: z
    .object({
      provider: z.enum(['redis', 'memcached', 'in-memory']),
      redisUrl: z.string().url().optional(),
      memcachedLocation: z.string().optional(),
    })
    .refine(
      (data) => {
        if (data.provider === 'redis') return !!data.redisUrl;
        if (data.provider === 'memcached') return !!data.memcachedLocation;
        return true;
      },
      {
        message: 'Redis URL or Memcached location is required for the selected cache provider',
      },
    ),
  eventBus: z
    .object({
      provider: z.enum(['in-memory', 'redpanda']),
      redpanda: z
        .object({
          brokers: z.array(z.string().min(1)).min(1),
          clientId: z.string().min(1),
          groupId: z.string().min(1),
          topic: z.string().min(1).default('weather-events'),
          connectionTimeout: z.number().positive().optional(),
          requestTimeout: z.number().positive().optional(),
          retry: z
            .object({
              retries: z.number().min(0),
              initialRetryTime: z.number().positive(),
              maxRetryTime: z.number().positive(),
            })
            .optional(),
        })
        .optional(),
    })
    .refine(
      (data) => {
        if (data.provider === 'redpanda') {
          return !!data.redpanda;
        }
        return true;
      },
      {
        message: 'Redpanda configuration is required when using Redpanda provider',
      },
    ),
});

export type Config = z.infer<typeof configSchema>;

/**
 * Configuration factory for creating and validating configuration
 */
export class ConfigFactory {
  /**
   * Creates configuration from environment variables
   */
  static createFromEnv(): Config {
    const configSource = {
      nodeEnv: (process.env.NODE_ENV || 'development') as 'development' | 'production' | 'test',
      port: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
      appUrl: process.env.APP_URL || 'http://localhost:3000',
      broadcastCrons: safeJsonParse(process.env.BROADCAST_CRONS, [
        ['daily', '0 0 * * *'],
        ['hourly', '0 * * * *'],
      ]),
      communicationProtocol: (process.env.COMMUNICATION_PROTOCOL || 'grpc') as 'http' | 'grpc',
      weatherService: {
        httpUrl: process.env.WEATHER_SERVICE_URL || 'http://localhost:3031',
        grpcUrl: process.env.WEATHER_SERVICE_GRPC_URL || 'localhost:50051',
      },
      smtp: {
        user: process.env.SMTP_USER || '',
        password: process.env.SMTP_PASSWORD || '',
        from: process.env.SMTP_FROM || 'Weather App <noreply@weather.app',
      },
      weather: {
        providers: {
          weatherApi: {
            apiKey: process.env.WEATHER_API_KEY,
            priority: parseInt(process.env.WEATHER_API_PRIORITY || '1', 10),
          },
          openWeather: {
            apiKey: process.env.OPENWEATHER_API_KEY,
            priority: parseInt(process.env.OPENWEATHER_API_PRIORITY || '2', 10),
          },
        },
      },
      cache: {
        provider: (process.env.CACHE_PROVIDER || 'in-memory') as 'redis' | 'memcached' | 'in-memory',
        redisUrl: process.env.REDIS_URL,
        memcachedLocation: process.env.MEMCACHED_LOCATION,
      },
      eventBus: {
        provider: (process.env.EVENT_BUS_PROVIDER || 'in-memory') as 'in-memory' | 'redpanda',
        redpanda:
          process.env.EVENT_BUS_PROVIDER === 'redpanda'
            ? {
                brokers: safeJsonParse(process.env.REDPANDA_BROKERS, ['localhost:9092']),
                clientId: process.env.REDPANDA_CLIENT_ID || 'weather-backend',
                groupId: process.env.REDPANDA_GROUP_ID || 'weather-backend-group',
                topic: process.env.REDPANDA_TOPIC || 'weather-events',
                connectionTimeout: process.env.REDPANDA_CONNECTION_TIMEOUT
                  ? parseInt(process.env.REDPANDA_CONNECTION_TIMEOUT, 10)
                  : undefined,
                requestTimeout: process.env.REDPANDA_REQUEST_TIMEOUT
                  ? parseInt(process.env.REDPANDA_REQUEST_TIMEOUT, 10)
                  : undefined,
                retry: {
                  retries: parseInt(process.env.REDPANDA_RETRY_RETRIES || '5', 10),
                  initialRetryTime: parseInt(process.env.REDPANDA_RETRY_INITIAL_TIME || '100', 10),
                  maxRetryTime: parseInt(process.env.REDPANDA_RETRY_MAX_TIME || '30000', 10),
                },
              }
            : undefined,
      },
    };

    const validation = configSchema.safeParse(configSource);

    if (!validation.success) {
      console.error('Invalid configuration:');
      validation.error.issues.forEach((issue) => {
        console.error(`  - ${issue.path.join('.') || 'general'} - ${issue.message}`);
      });

      // Don't exit in test environment
      if (process.env.NODE_ENV !== 'test' && !process.env.JEST_WORKER_ID) {
        process.exit(1);
      }
    }

    return validation.success ? validation.data : configSource;
  }

  /**
   * Creates test configuration
   */
  static createTestConfig(): Config {
    return {
      nodeEnv: 'test',
      port: 3000,
      appUrl: 'http://localhost:3000',
      broadcastCrons: [['daily', '0 0 * * *']],
      communicationProtocol: 'http',
      weatherService: {
        httpUrl: 'http://localhost:3001',
        grpcUrl: 'localhost:50051',
      },
      smtp: {
        user: 'test@example.com',
        password: 'password',
        from: 'test@example.com',
      },
      weather: {
        providers: {
          weatherApi: {
            apiKey: 'test-api-key',
            priority: 1,
          },
          openWeather: {
            apiKey: 'test-openweather-key',
            priority: 2,
          },
        },
      },
      cache: {
        provider: 'in-memory',
      },
      eventBus: {
        provider: 'in-memory',
      },
    };
  }

  /**
   * Creates configuration from provided object
   */
  static createFromObject(configObject: Partial<Config>): Config {
    const validation = configSchema.safeParse(configObject);

    if (!validation.success) {
      throw new Error(`Invalid configuration: ${validation.error.message}`);
    }

    return validation.data;
  }
}
