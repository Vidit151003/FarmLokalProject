import { Request, Response, NextFunction } from 'express';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import { getRedisClient } from '../config/redis';
import { config } from '../config/environment';
import { RateLimitError } from '../shared/errors/app.error';

let rateLimiter: RateLimiterRedis | null = null;

const getRateLimiter = async (): Promise<RateLimiterRedis> => {
    if (!rateLimiter) {
        const redisClient = await getRedisClient();
        rateLimiter = new RateLimiterRedis({
            storeClient: redisClient,
            points: config.RATE_LIMIT_REQUESTS_PER_WINDOW,
            duration: Math.floor(config.RATE_LIMIT_WINDOW_MS / 1000),
            blockDuration: 0,
            keyPrefix: 'ratelimit',
        });
    }
    return rateLimiter;
};

export const rateLimitMiddleware = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const limiter = await getRateLimiter();
        const key = req.ip || 'unknown';

        const result = await limiter.consume(key, 1);

        res.setHeader('X-RateLimit-Limit', config.RATE_LIMIT_REQUESTS_PER_WINDOW);
        res.setHeader('X-RateLimit-Remaining', result.remainingPoints);
        res.setHeader('X-RateLimit-Reset', new Date(Date.now() + result.msBeforeNext).toISOString());

        next();
    } catch (error) {
        if (error instanceof Error && 'msBeforeNext' in error) {
            const msBeforeNext = (error as { msBeforeNext: number }).msBeforeNext;
            const retryAfter = Math.ceil(msBeforeNext / 1000);

            res.setHeader('Retry-After', retryAfter);
            res.setHeader('X-RateLimit-Limit', config.RATE_LIMIT_REQUESTS_PER_WINDOW);
            res.setHeader('X-RateLimit-Remaining', 0);

            next(new RateLimitError(retryAfter));
        } else {
            next(error);
        }
    }
};
