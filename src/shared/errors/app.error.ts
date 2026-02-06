export class AppError extends Error {
    constructor(
        public message: string,
        public statusCode: number,
        public code: string,
        public details?: unknown
    ) {
        super(message);
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}

export class ValidationError extends AppError {
    constructor(message: string, details?: unknown) {
        super(message, 400, 'VALIDATION_ERROR', details);
    }
}

export class AuthenticationError extends AppError {
    constructor(message: string = 'Authentication failed', details?: unknown) {
        super(message, 401, 'AUTHENTICATION_ERROR', details);
    }
}

export class AuthorizationError extends AppError {
    constructor(message: string = 'Insufficient permissions', details?: unknown) {
        super(message, 403, 'AUTHORIZATION_ERROR', details);
    }
}

export class NotFoundError extends AppError {
    constructor(resource: string = 'Resource') {
        super(`${resource} not found`, 404, 'NOT_FOUND');
    }
}

export class RateLimitError extends AppError {
    constructor(retryAfter?: number) {
        super('Rate limit exceeded', 429, 'RATE_LIMIT_EXCEEDED', { retryAfter });
    }
}

export class ExternalApiError extends AppError {
    constructor(service: string, message: string, details?: unknown) {
        super(`External API error (${service}): ${message}`, 502, 'EXTERNAL_API_ERROR', details);
    }
}

export class ServiceUnavailableError extends AppError {
    constructor(service: string = 'Service', message?: string) {
        super(message || `${service} is currently unavailable`, 503, 'SERVICE_UNAVAILABLE');
    }
}

export class GatewayTimeoutError extends AppError {
    constructor(service: string = 'Upstream service') {
        super(`${service} timeout`, 504, 'GATEWAY_TIMEOUT');
    }
}

export class InternalServerError extends AppError {
    constructor(message: string = 'Internal server error', details?: unknown) {
        super(message, 500, 'INTERNAL_SERVER_ERROR', details);
    }
}
