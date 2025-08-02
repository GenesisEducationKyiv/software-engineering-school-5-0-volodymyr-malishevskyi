import { HttpClient } from '@/common/http-client';
import { OpenWeatherMapProvider } from '@/modules/weather/weather-providers/openweather/openweather';
import { IWeatherProvider } from '@/modules/weather/weather-providers/types/weather-provider';
import { WeatherApiProvider } from '@/modules/weather/weather-providers/weather-api/weather-api';
import { OpenWeatherHandler } from './openweather-handler';
import { WeatherApiHandler } from './weather-api-handler';
import { WeatherProviderHandler } from './weather-provider-handler';

export interface WeatherProvidersConfig {
  weatherApi?: {
    apiKey: string;
    priority: number;
  };
  openWeather?: {
    apiKey: string;
    priority: number;
  };
}

/**
 * Factory for creating weather provider chain with failover support
 */
export class WeatherProviderChainFactory {
  /**
   * Creates a chain of weather providers ordered by priority (lower number = higher priority)
   * If a provider fails, the next one in chain will be tried
   */
  static createChain(httpClient: HttpClient, config: WeatherProvidersConfig): IWeatherProvider {
    const providers: Array<{ handler: WeatherProviderHandler; priority: number }> = [];

    // Create WeatherAPI handler if configured
    if (config.weatherApi?.apiKey) {
      const weatherApiService = new WeatherApiProvider(httpClient, {
        apiKey: config.weatherApi.apiKey,
      });
      const weatherApiHandler = new WeatherApiHandler(weatherApiService);
      providers.push({
        handler: weatherApiHandler,
        priority: config.weatherApi.priority,
      });
    }

    // Create OpenWeatherMap handler if configured
    if (config.openWeather?.apiKey) {
      const openWeatherService = new OpenWeatherMapProvider(httpClient, {
        apiKey: config.openWeather.apiKey,
      });
      const openWeatherHandler = new OpenWeatherHandler(openWeatherService);
      providers.push({
        handler: openWeatherHandler,
        priority: config.openWeather.priority,
      });
    }

    if (providers.length === 0) {
      throw new Error('No weather providers configured');
    }

    // Sort providers by priority (lower number = higher priority)
    providers.sort((a, b) => a.priority - b.priority);

    // Chain providers together
    for (let i = 0; i < providers.length - 1; i++) {
      providers[i].handler.setNext(providers[i + 1].handler);
    }

    // Return the first provider in chain (highest priority)
    return providers[0].handler;
  }

  /**
   * Creates a simple chain with WeatherAPI as primary and OpenWeatherMap as fallback
   */
  static createDefaultChain(
    httpClient: HttpClient,
    weatherApiKey: string,
    openWeatherApiKey: string,
  ): IWeatherProvider {
    return this.createChain(httpClient, {
      weatherApi: {
        apiKey: weatherApiKey,
        priority: 1, // Primary provider
      },
      openWeather: {
        apiKey: openWeatherApiKey,
        priority: 2, // Fallback provider
      },
    });
  }
}
