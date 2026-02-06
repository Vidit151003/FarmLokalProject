import pino from 'pino';
import { config } from '../config/environment';

const pinoConfig = {
    level: config.LOG_LEVEL,
    formatters: {
        level: (label: string) => ({ level: label }),
        bindings: () => ({}),
    },
    timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
    redact: {
        paths: ['req.headers.authorization', 'password', 'secret', 'token'],
        remove: true,
    },
};

const prettyConfig =
    config.LOG_FORMAT === 'pretty'
        ? {
            transport: {
                target: 'pino-pretty',
                options: {
                    colorize: true,
                    translateTime: 'SYS:standard',
                    ignore: 'pid,hostname',
                },
            },
        }
        : {};

export const logger = pino({
    ...pinoConfig,
    ...prettyConfig,
});

export const createChildLogger = (context: Record<string, unknown>): pino.Logger => {
    return logger.child(context);
};
