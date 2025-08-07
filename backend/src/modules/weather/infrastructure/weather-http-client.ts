import { FetchHttpClient } from '@/common/http-client';
import logger from '@/common/logging/logger';
import { inject, injectable } from 'tsyringe';
import { ICityResponse, IWeatherProvider, IWeatherResponse } from './types/weather.client';

interface WeatherServiceHttpClientConfig {
  baseUrl: string;
}

@injectable()
export class WeatherServiceHttpClient implements IWeatherProvider {
  constructor(
    @inject('HttpClient')
    private readonly httpClient: FetchHttpClient,
    @inject('WeatherServiceHttpClientConfig')
    private readonly config: WeatherServiceHttpClientConfig,
  ) {}

  async getWeatherByCity(city: string): Promise<IWeatherResponse> {
    try {
      logger.info('Fetching weather via HTTP', {
        type: 'http-client',
        city: city,
        endpoint: 'getWeatherByCity',
      });

      const response = await this.httpClient.get<IWeatherResponse>(`${this.config.baseUrl}/api/weather`, {
        queryParams: { city },
        timeout: 10000,
      });

      // Map weather service response to backend Weather format
      return {
        temperature: response.data.temperature,
        humidity: response.data.humidity,
        description: response.data.description,
      };
    } catch (error) {
      logger.error('Weather HTTP client error', {
        type: 'http-client',
        error: error instanceof Error ? error.message : 'Unknown error',
        city: city,
        endpoint: 'getWeatherByCity',
      });
      throw error;
    }
  }

  async searchCity(city: string): Promise<ICityResponse> {
    try {
      logger.info('Searching cities via HTTP', {
        type: 'http-client',
        query: city,
        endpoint: 'searchCity',
      });

      const response = await this.httpClient.get<ICityResponse>(`${this.config.baseUrl}/api/v1/weather/search`, {
        queryParams: { query: city },
        timeout: 10000,
      });

      // Map weather service cities to backend City format
      return response.data;
    } catch (error) {
      logger.error('City search HTTP client error', {
        type: 'http-client',
        error: error instanceof Error ? error.message : 'Unknown error',
        query: city,
        endpoint: 'searchCity',
      });
      throw error;
    }
  }
}
