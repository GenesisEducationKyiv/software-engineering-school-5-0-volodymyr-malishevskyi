import { ICacheProvider } from '@/common/cache/interfaces/cache-provider';
import { injectable } from 'tsyringe';

@injectable()
export class InMemoryCacheProvider implements ICacheProvider {
  private readonly cache = new Map<string, { value: string; expiresAt: number }>();

  public async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    if (entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      return null;
    }

    return JSON.parse(entry.value) as T;
  }

  public async set<T>(key: string, value: T, ttl: number): Promise<void> {
    const expiresAt = Date.now() + ttl * 1000;
    this.cache.set(key, { value: JSON.stringify(value), expiresAt });
  }

  public async del(key: string): Promise<void> {
    this.cache.delete(key);
  }

  public async clear(): Promise<void> {
    this.cache.clear();
  }

  /**
   * No-op for in-memory cache
   */
  public async disconnect(): Promise<void> {
    // In-memory cache doesn't need to disconnect
  }
}
