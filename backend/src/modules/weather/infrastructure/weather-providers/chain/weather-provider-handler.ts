import logger from '@/common/logging/logger';
import { City, IWeatherProvider, Weather } from '@/common/interfaces/weather-provider';

/**
 * Abstract base class for weather provider chain handlers
 */
export abstract class WeatherProviderHandler implements IWeatherProvider {
  protected nextHandler?: WeatherProviderHandler;

  /**
   * Set the next handler in the chain
   */
  setNext(handler: WeatherProviderHandler): WeatherProviderHandler {
    this.nextHandler = handler;
    return handler;
  }

  /**
   * Handle the weather request. If this provider fails, try the next one in chain.
   */
  async getWeatherByCity(city: string): Promise<Weather> {
    try {
      return await this.handleWeatherRequest(city);
    } catch (error) {
      if (this.nextHandler) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.warn(`${this.getProviderName()} failed, trying next provider`, {
          type: 'external',
          provider: this.getProviderName(),
          city,
          error: errorMessage,
        });
        return await this.nextHandler.getWeatherByCity(city);
      }
      throw error;
    }
  }

  /**
   * Handle the city search request. If this provider fails, try the next one in chain.
   */
  async searchCity(city: string): Promise<City[]> {
    try {
      return await this.handleCitySearchRequest(city);
    } catch (error) {
      if (this.nextHandler) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.warn(`${this.getProviderName()} search failed, trying next provider`, {
          type: 'external',
          provider: this.getProviderName(),
          city,
          error: errorMessage,
        });
        return await this.nextHandler.searchCity(city);
      }
      throw error;
    }
  }

  /**
   * Abstract method to handle weather request - must be implemented by concrete handlers
   */
  protected abstract handleWeatherRequest(city: string): Promise<Weather>;

  /**
   * Abstract method to handle city search request - must be implemented by concrete handlers
   */
  protected abstract handleCitySearchRequest(city: string): Promise<City[]>;

  /**
   * Abstract method to get provider name for logging
   */
  protected abstract getProviderName(): string;
}
