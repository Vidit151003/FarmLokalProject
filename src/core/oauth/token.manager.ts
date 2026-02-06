import axios, { AxiosInstance } from 'axios';
import { config } from '../../config/environment';
import { CacheService } from '../cache/cache.service';
import { getRedisClient } from '../../config/redis';
import { logger } from '../../observability/logger';
import { tokenRefreshTotal } from '../../observability/metrics';
import { AuthenticationError } from '../../shared/errors/app.error';

interface TokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
    scope?: string;
}

interface CachedToken {
    accessToken: string;
    expiresAt: number;
}

export class OAuth2TokenManager {
    private readonly httpClient: AxiosInstance;
    private readonly cacheService: CacheService;
    private readonly tokenLockPrefix = 'lock:token';
    private readonly tokenCachePrefix = 'token';
    private readonly lockTTL = 10;

    constructor() {
        this.httpClient = axios.create({
            timeout: 5000,
        });
        this.cacheService = new CacheService(this.tokenCachePrefix);
    }

    async getToken(scope: string = config.OAUTH_SCOPE): Promise<string> {
        const cacheKey = this.buildTokenCacheKey(scope);
        const cachedToken = await this.cacheService.get<CachedToken>(cacheKey);

        if (cachedToken && this.isTokenValid(cachedToken)) {
            return cachedToken.accessToken;
        }

        return await this.fetchTokenWithLock(scope);
    }

    private async fetchTokenWithLock(scope: string): Promise<string> {
        const lockKey = `${this.tokenLockPrefix}:${scope}`;
        const client = await getRedisClient();

        const lockAcquired = await client.set(lockKey, '1', {
            NX: true,
            EX: this.lockTTL,
        });

        if (!lockAcquired) {
            await this.waitForTokenInCache(scope);
            const cachedToken = await this.cacheService.get<CachedToken>(
                this.buildTokenCacheKey(scope)
            );
            if (cachedToken && this.isTokenValid(cachedToken)) {
                return cachedToken.accessToken;
            }
        }

        try {
            const token = await this.fetchNewToken(scope);
            await client.del(lockKey);
            return token;
        } catch (error) {
            await client.del(lockKey);
            throw error;
        }
    }

    private async fetchNewToken(scope: string): Promise<string> {
        try {
            const response = await this.httpClient.post<TokenResponse>(
                config.OAUTH_TOKEN_URL,
                {
                    grant_type: 'client_credentials',
                    client_id: config.OAUTH_CLIENT_ID,
                    client_secret: config.OAUTH_CLIENT_SECRET,
                    scope,
                },
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                }
            );

            const { access_token, expires_in } = response.data;
            const expiresAt = Date.now() + expires_in * 1000;

            const cachedToken: CachedToken = {
                accessToken: access_token,
                expiresAt,
            };

            const ttl = expires_in - config.CACHE_TOKEN_BUFFER_SECONDS;
            await this.cacheService.set(this.buildTokenCacheKey(scope), cachedToken, ttl);

            tokenRefreshTotal.inc({ status: 'success' });
            logger.info({ scope }, 'OAuth token fetched successfully');

            return access_token;
        } catch (error) {
            tokenRefreshTotal.inc({ status: 'failure' });
            logger.error({ error, scope }, 'OAuth token fetch failed');
            throw new AuthenticationError('Failed to obtain OAuth token');
        }
    }

    private async waitForTokenInCache(scope: string, maxWaitMs: number = 5000): Promise<void> {
        const startTime = Date.now();
        const pollInterval = 100;

        while (Date.now() - startTime < maxWaitMs) {
            const cachedToken = await this.cacheService.get<CachedToken>(
                this.buildTokenCacheKey(scope)
            );
            if (cachedToken && this.isTokenValid(cachedToken)) {
                return;
            }
            await this.sleep(pollInterval);
        }
    }

    private isTokenValid(token: CachedToken): boolean {
        return Date.now() < token.expiresAt;
    }

    private buildTokenCacheKey(scope: string): string {
        return `${config.OAUTH_CLIENT_ID}:${scope}`;
    }

    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
