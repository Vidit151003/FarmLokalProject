import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const environmentSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.string().transform(Number).pipe(z.number().min(1).max(65535)).default('3000'),

    DATABASE_HOST: z.string(),
    DATABASE_PORT: z.string().transform(Number).pipe(z.number()),
    DATABASE_NAME: z.string(),
    DATABASE_USER: z.string(),
    DATABASE_PASSWORD: z.string(),
    DATABASE_POOL_MIN: z.string().transform(Number).pipe(z.number()).default('10'),
    DATABASE_POOL_MAX: z.string().transform(Number).pipe(z.number()).default('100'),
    DATABASE_CONNECTION_TIMEOUT: z.string().transform(Number).pipe(z.number()).default('5000'),
    DATABASE_IDLE_TIMEOUT: z.string().transform(Number).pipe(z.number()).default('600000'),

    REDIS_HOST: z.string(),
    REDIS_PORT: z.string().transform(Number).pipe(z.number()),
    REDIS_PASSWORD: z.string().optional(),
    REDIS_TLS_ENABLED: z
        .string()
        .transform((val) => val === 'true')
        .default('false'),
    REDIS_MAX_RETRIES: z.string().transform(Number).pipe(z.number()).default('3'),
    REDIS_RETRY_DELAY: z.string().transform(Number).pipe(z.number()).default('100'),

    OAUTH_TOKEN_URL: z.string().url(),
    OAUTH_CLIENT_ID: z.string(),
    OAUTH_CLIENT_SECRET: z.string(),
    OAUTH_SCOPE: z.string().default('api:read api:write'),

    EXTERNAL_API_BASE_URL: z.string().url(),
    EXTERNAL_API_TIMEOUT_MS: z.string().transform(Number).pipe(z.number()).default('10000'),
    EXTERNAL_API_RETRY_MAX_ATTEMPTS: z.string().transform(Number).pipe(z.number()).default('3'),
    EXTERNAL_API_RETRY_INITIAL_DELAY: z.string().transform(Number).pipe(z.number()).default('100'),
    EXTERNAL_API_RETRY_MAX_DELAY: z.string().transform(Number).pipe(z.number()).default('5000'),

    WEBHOOK_SECRET: z.string(),
    WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS: z
        .string()
        .transform(Number)
        .pipe(z.number())
        .default('300'),

    RATE_LIMIT_REQUESTS_PER_WINDOW: z
        .string()
        .transform(Number)
        .pipe(z.number())
        .default('1000'),
    RATE_LIMIT_WINDOW_MS: z.string().transform(Number).pipe(z.number()).default('60000'),

    CACHE_PRODUCT_LIST_TTL: z.string().transform(Number).pipe(z.number()).default('300'),
    CACHE_PRODUCT_ITEM_TTL: z.string().transform(Number).pipe(z.number()).default('900'),
    CACHE_TOKEN_BUFFER_SECONDS: z.string().transform(Number).pipe(z.number()).default('60'),

    CIRCUIT_BREAKER_FAILURE_THRESHOLD: z
        .string()
        .transform(Number)
        .pipe(z.number())
        .default('5'),
    CIRCUIT_BREAKER_RESET_TIMEOUT: z.string().transform(Number).pipe(z.number()).default('30000'),

    LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
    LOG_FORMAT: z.enum(['json', 'pretty']).default('json'),

    CORS_ORIGINS: z.string().default('http://localhost:3000'),
});

type Environment = z.infer<typeof environmentSchema>;

const parseEnvironment = (): Environment => {
    try {
        return environmentSchema.parse(process.env);
    } catch (error) {
        if (error instanceof z.ZodError) {
            const formattedErrors = error.errors.map((err) => `${err.path.join('.')}: ${err.message}`);
            throw new Error(`Environment validation failed:\n${formattedErrors.join('\n')}`);
        }
        throw error;
    }
};

export const config = parseEnvironment();

export const isDevelopment = config.NODE_ENV === 'development';
export const isProduction = config.NODE_ENV === 'production';
export const isTest = config.NODE_ENV === 'test';
