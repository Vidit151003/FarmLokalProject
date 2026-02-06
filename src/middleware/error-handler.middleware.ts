import { Request, Response, NextFunction } from 'express';
import { AppError } from '../shared/errors/app.error';
import { logger } from '../observability/logger';
import { ZodError } from 'zod';
import { ErrorResponse } from '../shared/types/pagination.types';

export const errorMiddleware = (
    error: Error,
    req: Request,
    res: Response,
    _next: NextFunction
): void => {
    if (error instanceof AppError) {
        const errorResponse: ErrorResponse = {
            error: {
                code: error.code,
                message: error.message,
                details: error.details,
                requestId: req.requestId,
            },
        };

        res.status(error.statusCode).json(errorResponse);
        return;
    }

    if (error instanceof ZodError) {
        const errorResponse: ErrorResponse = {
            error: {
                code: 'VALIDATION_ERROR',
                message: 'Request validation failed',
                details: error.errors.map((err) => ({
                    field: err.path.join('.'),
                    message: err.message,
                })),
                requestId: req.requestId,
            },
        };

        res.status(400).json(errorResponse);
        return;
    }

    logger.error({ error, requestId: req.requestId }, 'Unhandled error');

    const errorResponse: ErrorResponse = {
        error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'An unexpected error occurred',
            requestId: req.requestId,
        },
    };

    res.status(500).json(errorResponse);
};
