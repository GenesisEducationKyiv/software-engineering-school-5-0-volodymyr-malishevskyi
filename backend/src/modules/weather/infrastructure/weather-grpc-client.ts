import { GrpcClient } from '@/common/grpc-client';
import logger from '@/common/logging/logger';
import * as path from 'path';
import { inject, injectable } from 'tsyringe';
import { ICityResponse, IWeatherProvider, IWeatherResponse } from './types/weather.client';

interface WeatherServiceGrpcClientConfig {
  serverAddress: string;
  timeout?: number;
}

interface GetWeatherByCityRequest {
  city: string;
}

interface GetWeatherByCityResponse {
  temperature: number;
  humidity: number;
  description: string;
}

interface SearchCityRequest {
  query: string;
}

interface SearchCityResponse {
  cities: Array<{
    id: number;
    name: string;
    region: string;
    country: string;
    lat: number;
    lon: number;
    url: string;
  }>;
}

@injectable()
export class WeatherServiceGrpcClient extends GrpcClient implements IWeatherProvider {
  constructor(
    @inject('WeatherServiceGrpcClientConfig')
    private readonly clientConfig: WeatherServiceGrpcClientConfig,
  ) {
    super({
      serverAddress: clientConfig.serverAddress,
      protoPath: path.resolve(__dirname, '../../../protos/weather.proto'),
      serviceName: 'weather.WeatherService',
      timeout: clientConfig.timeout,
    });
  }

  async getWeatherByCity(city: string): Promise<IWeatherResponse> {
    try {
      logger.info('Fetching weather via gRPC', {
        type: 'grpc-client',
        city: city,
        endpoint: 'getWeatherByCity',
      });

      const request: GetWeatherByCityRequest = { city };
      const response = await this.promisifyCall<GetWeatherByCityRequest, GetWeatherByCityResponse>(
        'getWeatherByCity',
        request,
      );

      return {
        temperature: response.temperature,
        humidity: response.humidity,
        description: response.description,
      };
    } catch (error) {
      logger.error('Weather gRPC client error', {
        type: 'grpc-client',
        error: error instanceof Error ? error.message : 'Unknown error',
        city: city,
        endpoint: 'getWeatherByCity',
      });
      throw error;
    }
  }

  async searchCity(city: string): Promise<ICityResponse> {
    try {
      logger.info('Searching cities via gRPC', {
        type: 'grpc-client',
        query: city,
        endpoint: 'searchCity',
      });

      const request: SearchCityRequest = { query: city };
      const response = await this.promisifyCall<SearchCityRequest, SearchCityResponse>('searchCity', request);

      return response.cities.map((cityData) => ({
        id: cityData.id,
        name: cityData.name,
        region: cityData.region,
        country: cityData.country,
        lat: cityData.lat,
        lon: cityData.lon,
        url: cityData.url,
      }));
    } catch (error) {
      logger.error('City search gRPC client error', {
        type: 'grpc-client',
        error: error instanceof Error ? error.message : 'Unknown error',
        query: city,
        endpoint: 'searchCity',
      });
      throw error;
    }
  }
}
