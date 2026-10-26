import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.ts';

declare global {
  var _postgresPool: Pool | undefined;
}

export const isCloudSqlConfigured = Boolean(
  process.env.SQL_HOST &&
  process.env.SQL_USER &&
  process.env.SQL_DB_NAME
);

export const createPool = (): Pool | null => {
  if (!isCloudSqlConfigured) {
    return null;
  }
  if (!global._postgresPool) {
    global._postgresPool = new Pool({
      host: process.env.SQL_HOST,
      user: process.env.SQL_USER,
      password: process.env.SQL_PASSWORD,
      database: process.env.SQL_DB_NAME,
      max: 10,
      connectionTimeoutMillis: 15000,
    });

    global._postgresPool.on('error', (err) => {
      console.error('Unexpected error on idle SQL pool client:', err);
    });
  }
  return global._postgresPool;
};

const pool = createPool();

// Create safe no-op mock if Cloud SQL is not active
const createSafeNoOpDb = () => {
  return new Proxy({}, {
    get() {
      return () => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([]),
            orderBy: () => Promise.resolve([]),
          }),
          orderBy: () => Promise.resolve([]),
          limit: () => Promise.resolve([]),
        }),
        values: () => ({
          returning: () => Promise.resolve([]),
          onConflictDoUpdate: () => ({
            returning: () => Promise.resolve([]),
          }),
        }),
        set: () => ({
          where: () => ({
            returning: () => Promise.resolve([]),
          }),
        }),
        delete: () => ({
          where: () => Promise.resolve([]),
        }),
      });
    }
  }) as any;
};

export const db = isCloudSqlConfigured && pool ? drizzle(pool, { schema }) : createSafeNoOpDb();
export { pool };

