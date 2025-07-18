import { ICacheProvider } from '@/common/cache/interfaces/cache-provider';
import safeJsonParse from '@/common/utils/safe-json-parse';
import Memcached from 'memcached';
import { injectable } from 'tsyringe';

@injectable()
export class MemcachedCacheProvider implements ICacheProvider {
  private readonly client: Memcached;

  constructor(location: string) {
    this.client = new Memcached(location);
  }

  public async get<T>(key: string): Promise<T | null> {
    return new Promise((resolve, reject) => {
      this.client.get(key, (err, data) => {
        if (err) {
          return reject(err);
        }
        if (!data) {
          return resolve(null);
        }
        resolve(safeJsonParse(data, null) as T | null);
      });
    });
  }

  public async set<T>(key: string, value: T, ttl: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client.set(key, JSON.stringify(value), ttl, (err) => {
        if (err) {
          return reject(err);
        }
        resolve();
      });
    });
  }

  public async del(key: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client.del(key, (err) => {
        if (err) {
          return reject(err);
        }
        resolve();
      });
    });
  }

  public async clear(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client.flush((err) => {
        if (err) {
          return reject(err);
        }
        resolve();
      });
    });
  }

  /**
   * Closes the Memcached connection
   */
  public async disconnect(): Promise<void> {
    return new Promise((resolve) => {
      this.client.end();
      resolve();
    });
  }
}
