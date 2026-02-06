import { createClient, RedisClientType } from 'redis';
import { config } from './environment';
import { logger } from '../observability/logger';

export interface RedisConfig {
    socket: {
        host: string;
        port: number;
        tls?: boolean;
        reconnectStrategy?: (retries: number) => number | Error;
    };
    password?: string;
}

export const redisConfig: RedisConfig = {
    socket: {
        host: config.REDIS_HOST,
        port: config.REDIS_PORT,
        tls: config.REDIS_TLS_ENABLED,
        reconnectStrategy: (retries: number) => {
            if (retries > config.REDIS_MAX_RETRIES) {
                return new Error('Redis max reconnection attempts exceeded');
            }
            return Math.min(retries * config.REDIS_RETRY_DELAY, 3000);
        },
    },
    password: config.REDIS_PASSWORD || undefined,
};

let client: RedisClientType | null = null;

export const getRedisClient = async (): Promise<RedisClientType> => {
    if (!client) {
        client = createClient(redisConfig);

        client.on('error', (error) => {
            logger.error({ error }, 'Redis client error');
        });

        client.on('connect', () => {
            logger.info('Redis client connected');
        });

        client.on('reconnecting', () => {
            logger.warn('Redis client reconnecting');
        });

        client.on('ready', () => {
            logger.info('Redis client ready');
        });

        await client.connect();
    }

    return client;
};

export const closeRedisClient = async (): Promise<void> => {
    if (client) {
        await client.quit();
        client = null;
    }
};

export const checkRedisHealth = async (): Promise<boolean> => {
    try {
        const redisClient = await getRedisClient();
        const result = await redisClient.ping();
        return result === 'PONG';
    } catch (error) {
        return false;
    }
};
