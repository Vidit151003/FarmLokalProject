import * as crypto from 'crypto';

export interface CacheKeyParams {
    [key: string]: string | number | boolean | undefined;
}

export const generateCacheKey = (params: CacheKeyParams): string => {
    const normalizedParams: Record<string, string> = {};

    Object.keys(params)
        .sort()
        .forEach((key) => {
            const value = params[key];
            if (value !== undefined && value !== null) {
                normalizedParams[key] = String(value).toLowerCase();
            }
        });

    const queryString = Object.entries(normalizedParams)
        .map(([key, value]) => `${key}=${value}`)
        .join('&');

    return crypto.createHash('md5').update(queryString).digest('hex');
};
