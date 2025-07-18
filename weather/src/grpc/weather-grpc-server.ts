import logger from '@/common/logging/logger';
import { DependencyContainer } from '@/container';
import { IWeatherService } from '@/modules/weather/application/types/weather.service';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';

interface WeatherRequest {
  city: string;
}

interface WeatherResponse {
  temperature: number;
  humidity: number;
  description: string;
  city_full_name: string;
}

interface SearchCityRequest {
  query: string;
}

interface SearchCityResponse {
  cities: Array<{
    id: string;
    name: string;
    region: string;
    country: string;
    lat: number;
    lon: number;
    full_name: string;
  }>;
}

/**
 * gRPC Weather Service Implementation
 *
 * Provides gRPC endpoints for weather data retrieval and city search.
 * Implements the WeatherService proto definition.
 */
export class WeatherGrpcServer {
  private server: grpc.Server;
  private readonly weatherService: IWeatherService;

  constructor(private readonly container: DependencyContainer) {
    this.server = new grpc.Server();
    this.weatherService = this.container.resolve<IWeatherService>('WeatherService');
    this.loadProtoAndRegisterService();
  }

  private loadProtoAndRegisterService(): void {
    const PROTO_PATH = path.resolve(__dirname, '../protos/weather.proto');

    const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
    });

    const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as unknown as {
      weather: {
        WeatherService: {
          service: grpc.ServiceDefinition;
        };
      };
    };

    const weatherServiceImpl = {
      GetWeatherByCity: async (
        call: grpc.ServerUnaryCall<WeatherRequest, WeatherResponse>,
        callback: grpc.sendUnaryData<WeatherResponse>,
      ) => {
        try {
          const { city } = call.request;

          if (!city || city.trim() === '') {
            return callback({
              code: grpc.status.INVALID_ARGUMENT,
              message: 'City name is required',
            });
          }

          const weather = await this.weatherService.getWeatherByCity(city);

          callback(null, {
            temperature: weather.temperature,
            humidity: weather.humidity,
            description: weather.description,
            city_full_name: city,
          });

          logger.info('gRPC GetWeatherByCity completed', { city });
        } catch (error) {
          logger.error('gRPC GetWeatherByCity failed', { city: call.request.city, error });
          callback({
            code: grpc.status.INTERNAL,
            message: error instanceof Error ? error.message : 'Internal server error',
          });
        }
      },

      SearchCity: async (
        call: grpc.ServerUnaryCall<SearchCityRequest, SearchCityResponse>,
        callback: grpc.sendUnaryData<SearchCityResponse>,
      ) => {
        try {
          const { query } = call.request;

          if (!query || query.trim() === '') {
            return callback({
              code: grpc.status.INVALID_ARGUMENT,
              message: 'Search query is required',
            });
          }

          const cities = await this.weatherService.searchCity(query);

          callback(null, {
            cities: cities.map((city) => ({
              id: city.id,
              name: city.name,
              region: city.region,
              country: city.country,
              lat: city.lat,
              lon: city.lon,
              full_name: city.full_name,
            })),
          });

          logger.info('gRPC SearchCity completed', { query, resultCount: cities.length });
        } catch (error) {
          logger.error('gRPC SearchCity failed', { query: call.request.query, error });
          callback({
            code: grpc.status.INTERNAL,
            message: error instanceof Error ? error.message : 'Internal server error',
          });
        }
      },
    };

    this.server.addService(protoDescriptor.weather.WeatherService.service, weatherServiceImpl);
  }

  /**
   * Start the gRPC server
   */
  async start(grpcUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.bindAsync(grpcUrl, grpc.ServerCredentials.createInsecure(), (error: Error | null, port: number) => {
        if (error) {
          logger.error('Failed to start gRPC server', { error: error.message, stack: error.stack, grpcUrl });
          return reject(error);
        }

        logger.info(`gRPC server started on ${grpcUrl}`, { type: 'startup', port, grpcUrl });
        resolve();
      });
    });
  }

  /**
   * Gracefully shutdown the gRPC server
   */
  async shutdown(): Promise<void> {
    return new Promise((resolve) => {
      logger.info('Shutting down gRPC server...', { type: 'shutdown' });

      this.server.tryShutdown((error?: Error) => {
        if (error) {
          logger.error('Error during gRPC server shutdown', { error, type: 'shutdown' });
          this.server.forceShutdown();
        } else {
          logger.info('gRPC server shut down gracefully', { type: 'shutdown' });
        }
        resolve();
      });
    });
  }
}
