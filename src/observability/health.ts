import { Request, Response } from 'express';
import { checkDatabaseHealth } from '../config/database';
import { checkRedisHealth } from '../config/redis';

export const healthCheck = (_req: Request, res: Response): void => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
    });
};

export const readinessCheck = async (_req: Request, res: Response): Promise<void> => {
    const checks = {
        database: await checkDatabaseHealth(),
        redis: await checkRedisHealth(),
    };

    const isReady = Object.values(checks).every((status) => status === true);

    if (isReady) {
        res.status(200).json({
            status: 'ready',
            checks,
            timestamp: new Date().toISOString(),
        });
    } else {
        res.status(503).json({
            status: 'not ready',
            checks,
            timestamp: new Date().toISOString(),
        });
    }
};

export const livenessCheck = (_req: Request, res: Response): void => {
    res.status(200).json({
        status: 'alive',
        timestamp: new Date().toISOString(),
    });
};
