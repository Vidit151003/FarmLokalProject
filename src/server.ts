import express, { Express } from 'express';
import cors from 'cors';
import { config } from './config/environment';
import { requestIdMiddleware } from './middleware/request-id.middleware';
import { loggingMiddleware } from './middleware/logging.middleware';
import { errorMiddleware } from './middleware/error-handler.middleware';
import { rateLimitMiddleware } from './middleware/rate-limit.middleware';
import productsRoutes from './modules/products/products.routes';
import webhooksRoutes from './modules/webhooks/webhooks.routes';
import { healthCheck, readinessCheck, livenessCheck } from './observability/health';
import { getMetrics } from './observability/metrics';
import { logger } from './observability/logger';

export const createServer = (): Express => {
    const app = express();

    app.use(
        cors({
            origin: config.CORS_ORIGINS.split(','),
            credentials: true,
        })
    );

    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    app.use(requestIdMiddleware);
    app.use(loggingMiddleware);

    app.get('/health', healthCheck);
    app.get('/health/ready', readinessCheck);
    app.get('/health/live', livenessCheck);
    app.get('/metrics', async (_req, res) => {
        res.setHeader('Content-Type', 'text/plain');
        const metrics = await getMetrics();
        res.send(metrics);
    });

    app.get('/', (_req, res) => {
        res.status(200).json({
            status: 'success',
            message: 'Welcome to the FarmLokal Backend API',
            version: '1.0.0',
            documentation: 'https://github.com/Vidit151003/FarmLokalProject',
            endpoints: {
                health: '/health',
                products: '/api/v1/products',
                webhooks: '/api/v1/webhooks',
            },
        });
    });

    app.use('/api/v1/products', rateLimitMiddleware, productsRoutes);
    app.use('/api/v1/webhooks', webhooksRoutes);

    app.use((_req, res) => {
        res.status(404).json({
            error: {
                code: 'NOT_FOUND',
                message: 'The requested resource does not exist. Please check the documentation for available endpoints.',
            },
        });
    });

    app.use(errorMiddleware);

    return app;
};

export const startServer = (app: Express): void => {
    const server = app.listen(config.PORT, () => {
        logger.info(`Server running on port ${config.PORT} in ${config.NODE_ENV} mode`);
    });

    const gracefulShutdown = async (signal: string): Promise<void> => {
        logger.info(`${signal} received, starting graceful shutdown`);

        server.close(async () => {
            logger.info('HTTP server closed');

            const { closeDatabasePool } = await import('./config/database');
            const { closeRedisClient } = await import('./config/redis');

            await closeDatabasePool();
            await closeRedisClient();

            logger.info('Connections closed, exiting');
            process.exit(0);
        });

        setTimeout(() => {
            logger.error('Graceful shutdown timeout, forcing exit');
            process.exit(1);
        }, 30000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    process.on('unhandledRejection', (reason, promise) => {
        logger.error({ reason, promise }, 'Unhandled Promise rejection');
    });

    process.on('uncaughtException', (error) => {
        logger.error({ error }, 'Uncaught exception');
        process.exit(1);
    });
};
