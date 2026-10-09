import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { env } from './env';
import { logger } from '../utils/logger';
import * as schema from '../db/schema';

/**
 * Neon serverless PostgreSQL client + Drizzle ORM.
 * Uses HTTP-based queries (ideal for serverless, also works in long-running servers).
 */
let db: ReturnType<typeof drizzle<typeof schema>>;

export const connectDB = async (): Promise<void> => {
  try {
    if (!env.DATABASE_URL) {
      logger.warn('DATABASE_URL is not set. Skipping database connection.');
      return;
    }

    const sql = neon(env.DATABASE_URL);
    db = drizzle(sql, { schema });

    // Test the connection by running a simple query
    await sql`SELECT 1`;
    logger.info('✅ Neon PostgreSQL connected successfully');
  } catch (error) {
    logger.error('Neon PostgreSQL connection failed:', error);
    // Don't crash the server — let it run without DB for development
  }
};

export const getDB = () => {
  if (!db) {
    throw new Error('Database not initialized. Call connectDB() first.');
  }
  return db;
};

export { db };
