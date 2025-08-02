import { ICacheProvider } from '@/common/cache/interfaces/cache-provider';
import safeJsonParse from '@/common/utils/safe-json-parse';
import { RedisClientType, createClient } from 'redis';
import { injectable } from 'tsyringe';

@injectable()
export class RedisCacheProvider implements ICacheProvider {
  private client: RedisClientType | null = null;
  private readonly url: string;
  private isConnected = false;

  constructor(url: string) {
    this.url = url;
  }

  private async getClient(): Promise<RedisClientType> {
    if (!this.client || !this.isConnected) {
      // Close existing client if it exists but is not connected
      if (this.client) {
        try {
          await this.client.disconnect();
        } catch (error) {
          throw error;
        }
      }

      this.client = createClient({ url: this.url });
      await this.client.connect();
      this.isConnected = true;
    }
    return this.client;
  }

  public async get<T>(key: string): Promise<T | null> {
    try {
      const client = await this.getClient();
      const value = await client.get(key);
      if (!value) {
        return null;
      }
      return safeJsonParse(value, null) as T | null;
    } catch (error) {
      // Reset connection on error
      this.isConnected = false;
      throw error;
    }
  }

  public async set<T>(key: string, value: T, ttl: number): Promise<void> {
    try {
      const client = await this.getClient();
      await client.set(key, JSON.stringify(value), { EX: ttl });
    } catch (error) {
      // Reset connection on error
      this.isConnected = false;
      throw error;
    }
  }

  public async del(key: string): Promise<void> {
    try {
      const client = await this.getClient();
      await client.del(key);
    } catch (error) {
      // Reset connection on error
      this.isConnected = false;
      throw error;
    }
  }

  public async clear(): Promise<void> {
    try {
      const client = await this.getClient();
      await client.flushAll();
    } catch (error) {
      // Reset connection on error
      this.isConnected = false;
      throw error;
    }
  }

  /**
   * Closes the Redis connection
   */
  public async disconnect(): Promise<void> {
    if (this.client && this.isConnected) {
      try {
        await this.client.disconnect();
        this.isConnected = false;
      } catch (error) {
        throw error;
      }
    }
  }
}
