import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import axiosRetry from 'axios-retry';
import CircuitBreaker from 'opossum';
import { config } from '../../config/environment';
import { OAuth2TokenManager } from '../../core/oauth/token.manager';
import { logger } from '../../observability/logger';
import { externalApiRequestsTotal, circuitBreakerState } from '../../observability/metrics';
import { ExternalApiError, GatewayTimeoutError } from '../../shared/errors/app.error';

export class ExternalApiService {
    private readonly httpClient: AxiosInstance;
    private readonly tokenManager: OAuth2TokenManager;
    private readonly circuitBreaker: CircuitBreaker;

    constructor() {
        this.tokenManager = new OAuth2TokenManager();

        this.httpClient = axios.create({
            baseURL: config.EXTERNAL_API_BASE_URL,
            timeout: config.EXTERNAL_API_TIMEOUT_MS,
        });

        this.setupRetry();
        this.setupInterceptors();

        this.circuitBreaker = new CircuitBreaker(this.executeRequest.bind(this), {
            timeout: config.EXTERNAL_API_TIMEOUT_MS,
            errorThresholdPercentage: 50,
            resetTimeout: config.CIRCUIT_BREAKER_RESET_TIMEOUT,
            volumeThreshold: config.CIRCUIT_BREAKER_FAILURE_THRESHOLD,
        });

        this.setupCircuitBreakerEvents();
    }

    async get<T>(path: string, scope?: string): Promise<T> {
        return (await this.circuitBreaker.fire('GET', path, undefined, scope)) as T;
    }

    async post<T>(path: string, data: unknown, scope?: string): Promise<T> {
        return (await this.circuitBreaker.fire('POST', path, data, scope)) as T;
    }

    private async executeRequest<T>(
        method: 'GET' | 'POST',
        path: string,
        data?: unknown,
        scope?: string
    ): Promise<T> {
        try {
            const token = await this.tokenManager.getToken(scope);

            const response = await this.httpClient.request<T>({
                method,
                url: path,
                data,
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            externalApiRequestsTotal.inc({ service: 'external-api', status: 'success' });
            return response.data;
        } catch (error) {
            externalApiRequestsTotal.inc({ service: 'external-api', status: 'failure' });

            if (error instanceof AxiosError) {
                if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
                    throw new GatewayTimeoutError('External API');
                }

                const status = error.response?.status || 500;
                const message = (error.response?.data as any)?.message || error.message;

                throw new ExternalApiError('External API', message, { status });
            }

            throw error;
        }
    }

    private setupRetry(): void {
        axiosRetry(this.httpClient, {
            retries: config.EXTERNAL_API_RETRY_MAX_ATTEMPTS,
            retryDelay: (retryCount: number) => {
                const delay = Math.min(
                    config.EXTERNAL_API_RETRY_INITIAL_DELAY * Math.pow(2, retryCount - 1),
                    config.EXTERNAL_API_RETRY_MAX_DELAY
                );
                const jitter = Math.random() * 100;
                return delay + jitter;
            },
            retryCondition: (error: AxiosError) => {
                return (
                    axiosRetry.isNetworkOrIdempotentRequestError(error) ||
                    (error.response?.status !== undefined && error.response.status >= 500)
                );
            },
            onRetry: (retryCount: number, error: AxiosError) => {
                logger.warn({ retryCount, error: error.message }, 'Retrying external API request');
            },
        });
    }

    private setupInterceptors(): void {
        this.httpClient.interceptors.request.use((reqConfig: InternalAxiosRequestConfig) => {
            logger.debug({ url: reqConfig.url, method: reqConfig.method }, 'External API request');
            return reqConfig;
        });

        this.httpClient.interceptors.response.use(
            (response: AxiosResponse) => {
                logger.debug({ url: response.config.url, status: response.status }, 'External API response');
                return response;
            },
            (error: AxiosError) => {
                logger.error({ error: error.message }, 'External API error');
                return Promise.reject(error);
            }
        );
    }

    private setupCircuitBreakerEvents(): void {
        this.circuitBreaker.on('open', () => {
            circuitBreakerState.set({ service: 'external-api' }, 1);
            logger.warn('Circuit breaker opened for external API');
        });

        this.circuitBreaker.on('halfOpen', () => {
            circuitBreakerState.set({ service: 'external-api' }, 2);
            logger.info('Circuit breaker half-open for external API');
        });

        this.circuitBreaker.on('close', () => {
            circuitBreakerState.set({ service: 'external-api' }, 0);
            logger.info('Circuit breaker closed for external API');
        });
    }
}
