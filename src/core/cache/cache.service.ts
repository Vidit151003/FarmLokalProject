import { getRedisClient } from '../../config/redis';
import { logger } from '../../observability/logger';
import { cacheHitsTotal, cacheMissesTotal } from '../../observability/metrics';

export class CacheService {
    private readonly cacheName: string;

    constructor(cacheName: string) {
        this.cacheName = cacheName;
    }

    async get<T>(key: string): Promise<T | null> {
        try {
            const client = await getRedisClient();
            const value = await client.get(this.buildKey(key));

            if (value === null) {
                cacheMissesTotal.inc({ cache_name: this.cacheName });
                return null;
            }

            cacheHitsTotal.inc({ cache_name: this.cacheName });
            return JSON.parse(value) as T;
        } catch (error) {
            logger.error({ error, key }, 'Cache get error');
            return null;
        }
    }

    async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
        try {
            const client = await getRedisClient();
            const serialized = JSON.stringify(value);
            const fullKey = this.buildKey(key);

            if (ttlSeconds) {
                await client.setEx(fullKey, ttlSeconds, serialized);
            } else {
                await client.set(fullKey, serialized);
            }
        } catch (error) {
            logger.error({ error, key }, 'Cache set error');
        }
    }

    async delete(key: string): Promise<void> {
        try {
            const client = await getRedisClient();
            await client.del(this.buildKey(key));
        } catch (error) {
            logger.error({ error, key }, 'Cache delete error');
        }
    }

    async deletePattern(pattern: string): Promise<void> {
        try {
            const client = await getRedisClient();
            const fullPattern = this.buildKey(pattern);
            const keys = await client.keys(fullPattern);

            if (keys.length > 0) {
                await client.del(keys);
            }
        } catch (error) {
            logger.error({ error, pattern }, 'Cache delete pattern error');
        }
    }

    async exists(key: string): Promise<boolean> {
        try {
            const client = await getRedisClient();
            const result = await client.exists(this.buildKey(key));
            return result === 1;
        } catch (error) {
            logger.error({ error, key }, 'Cache exists error');
            return false;
        }
    }

    private buildKey(key: string): string {
        return `${this.cacheName}:${key}`;
    }
}
