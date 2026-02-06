import { Request } from 'express';

declare global {
    namespace Express {
        interface Request {
            requestId: string;
            user?: {
                clientId: string;
                scope: string[];
            };
        }
    }
}

export { };
