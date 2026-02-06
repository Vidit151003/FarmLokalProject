import { getDatabasePool } from '../config/database';
import { readFileSync } from 'fs';
import { join } from 'path';
import { logger } from '../observability/logger';

const runMigrations = async (): Promise<void> => {
    const pool = getDatabasePool();

    try {
        logger.info('Running database migrations...');

        const migrationPath = join(__dirname, '../prisma/migrations/001_initial_schema.sql');
        const sql = readFileSync(migrationPath, 'utf-8');

        const statements = sql
            .split(';')
            .map((stmt) => stmt.trim())
            .filter((stmt) => stmt.length > 0);

        for (const statement of statements) {
            await pool.execute(statement);
        }

        logger.info('Migrations completed successfully');
        process.exit(0);
    } catch (error) {
        logger.error({ error }, 'Migration failed');
        process.exit(1);
    }
};

runMigrations();
