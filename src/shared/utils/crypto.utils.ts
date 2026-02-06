import * as crypto from 'crypto';

export const generateHMACSignature = (payload: string, secret: string): string => {
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
};

export const verifyHMACSignature = (
    payload: string,
    signature: string,
    secret: string
): boolean => {
    const expectedSignature = generateHMACSignature(payload, secret);
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
};

export const isTimestampValid = (
    timestamp: number,
    toleranceSeconds: number = 300
): boolean => {
    const now = Math.floor(Date.now() / 1000);
    const diff = Math.abs(now - timestamp);
    return diff <= toleranceSeconds;
};
