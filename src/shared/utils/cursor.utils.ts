import { CursorData } from '../types/pagination.types';

export const encodeCursor = (data: CursorData): string => {
    const jsonString = JSON.stringify(data);
    return Buffer.from(jsonString).toString('base64url');
};

export const decodeCursor = (cursor: string): CursorData => {
    try {
        const jsonString = Buffer.from(cursor, 'base64url').toString('utf-8');
        return JSON.parse(jsonString) as CursorData;
    } catch (error) {
        throw new Error('Invalid cursor format');
    }
};
