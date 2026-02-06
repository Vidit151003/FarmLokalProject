import mysql from 'mysql2/promise';
import { config } from './environment';

export interface DatabaseConfig {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    connectionLimit: number;
    waitForConnections: boolean;
    queueLimit: number;
    enableKeepAlive: boolean;
    keepAliveInitialDelay: number;
    connectTimeout: number;
    idleTimeout: number;
}

export const databaseConfig: DatabaseConfig = {
    host: config.DATABASE_HOST,
    port: config.DATABASE_PORT,
    database: config.DATABASE_NAME,
    user: config.DATABASE_USER,
    password: config.DATABASE_PASSWORD,
    connectionLimit: config.DATABASE_POOL_MAX,
    waitForConnections: true,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    connectTimeout: config.DATABASE_CONNECTION_TIMEOUT,
    idleTimeout: config.DATABASE_IDLE_TIMEOUT,
};

let pool: mysql.Pool | null = null;

export const getDatabasePool = (): mysql.Pool => {
    if (!pool) {
        pool = mysql.createPool(databaseConfig);
    }
    return pool;
};

export const closeDatabasePool = async (): Promise<void> => {
    if (pool) {
        await pool.end();
        pool = null;
    }
};

export const checkDatabaseHealth = async (): Promise<boolean> => {
    try {
        const connection = await getDatabasePool().getConnection();
        await connection.ping();
        connection.release();
        return true;
    } catch (error) {
        return false;
    }
};
