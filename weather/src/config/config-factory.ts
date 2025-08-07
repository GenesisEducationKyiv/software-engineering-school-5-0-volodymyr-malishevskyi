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
  communicationProtocol: z.enum(['http', 'grpc']),
  weatherService: z.object({
    httpUrl: z.string().url('WEATHER_SERVICE_URL must be a valid URL'),
    grpcUrl: z.string().min(1, 'WEATHER_SERVICE_GRPC_URL is required'),
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
      communicationProtocol: (process.env.COMMUNICATION_PROTOCOL || 'http') as 'http' | 'grpc',
      weatherService: {
        httpUrl: process.env.WEATHER_SERVICE_URL || 'http://localhost:3001',
        grpcUrl: process.env.WEATHER_SERVICE_GRPC_URL || 'localhost:50051',
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
      communicationProtocol: 'http',
      weatherService: {
        httpUrl: 'http://localhost:3001',
        grpcUrl: 'localhost:50051',
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
