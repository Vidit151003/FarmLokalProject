import { register, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';

collectDefaultMetrics({ register });

export const httpRequestsTotal = new Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'path', 'status'],
    registers: [register],
});

export const httpRequestDurationSeconds = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'path', 'status'],
    buckets: [0.01, 0.05, 0.1, 0.2, 0.5, 1.0, 2.0, 5.0],
    registers: [register],
});

export const databaseQueryDurationSeconds = new Histogram({
    name: 'database_query_duration_seconds',
    help: 'Database query duration in seconds',
    labelNames: ['operation', 'table'],
    buckets: [0.001, 0.005, 0.01, 0.02, 0.05, 0.1, 0.5, 1.0],
    registers: [register],
});

export const cacheHitsTotal = new Counter({
    name: 'cache_hits_total',
    help: 'Total number of cache hits',
    labelNames: ['cache_name'],
    registers: [register],
});

export const cacheMissesTotal = new Counter({
    name: 'cache_misses_total',
    help: 'Total number of cache misses',
    labelNames: ['cache_name'],
    registers: [register],
});

export const circuitBreakerState = new Gauge({
    name: 'circuit_breaker_state',
    help: 'Circuit breaker state (0=closed, 1=open, 2=half-open)',
    labelNames: ['service'],
    registers: [register],
});

export const externalApiRequestsTotal = new Counter({
    name: 'external_api_requests_total',
    help: 'Total number of external API requests',
    labelNames: ['service', 'status'],
    registers: [register],
});

export const tokenRefreshTotal = new Counter({
    name: 'token_refresh_total',
    help: 'Total number of token refresh attempts',
    labelNames: ['status'],
    registers: [register],
});

export const getMetrics = async (): Promise<string> => {
    return await register.metrics();
};
