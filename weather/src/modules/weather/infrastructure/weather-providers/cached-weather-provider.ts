import { ICacheProvider } from '@/common/cache/interfaces/cache-provider';
import { inject, injectable } from 'tsyringe';
import { City, IWeatherProvider, Weather } from './types/weather-provider';

const CACHE_TTL = 60 * 5; // 5 minutes

/**
 * Cached Weather Provider (Proxy pattern)
 *
 * Provides cached weather information with automatic cache management.
 * Implements weather provider with caching layer for improved performance.
 */
@injectable()
export class CachedWeatherProvider implements IWeatherProvider {
  constructor(
    @inject('WeatherProvider')
    private readonly weatherProvider: IWeatherProvider,
    @inject('CacheProvider')
    private readonly cacheProvider: ICacheProvider,
  ) {}

  /**
   * Search for cities by name
   *
   * @param city - City name to search for
   * @returns List of cities matching the search
   */
  async searchCity(city: string): Promise<City[]> {
    return this.getCachedData<City[]>(`city:${city}`, () => this.weatherProvider.searchCity(city));
  }

  /**
   * Get weather information for a specific city with caching
   *
   * @param city - City name to get weather for
   * @returns Weather information from cache or fresh data
   */
  async getWeatherByCity(city: string): Promise<Weather> {
    return this.getCachedData<Weather>(`weather:${city}`, () => this.weatherProvider.getWeatherByCity(city));
  }

  /**
   * Generic method to get cached data or fetch and cache if not available
   *
   * @param cacheKey - Cache key for the data
   * @param fetchData - Function to fetch data if not cached
   * @returns Cached or fresh data
   */
  private async getCachedData<T>(cacheKey: string, fetchData: () => Promise<T>): Promise<T> {
    const cachedData = await this.cacheProvider.get<T>(cacheKey);

    if (cachedData) {
      return cachedData;
    }

    const data = await fetchData();
    await this.cacheProvider.set(cacheKey, data, CACHE_TTL);

    return data;
  }
}
