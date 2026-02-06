import pinoHttp from 'pino-http';
import { logger } from '../observability/logger';

export const loggingMiddleware = pinoHttp({
    logger,
    customLogLevel: (_req, res) => {
        if (res.statusCode >= 500) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
    },
    customSuccessMessage: (req, res) => {
        return `${req.method} ${req.url} ${res.statusCode}`;
    },
    customErrorMessage: (req, res) => {
        return `${req.method} ${req.url} ${res.statusCode}`;
    },
    customAttributeKeys: {
        req: 'request',
        res: 'response',
        err: 'error',
        responseTime: 'duration',
    },
});
