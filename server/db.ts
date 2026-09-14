import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/qahub';

export const pool = new Pool({
  connectionString,
  // Allow running even if local DB server is offline or in mock fallback mode
  connectionTimeoutMillis: 3000,
});

let isInitialized = false;

export async function initDb() {
  if (isInitialized) return;

  try {
    const client = await pool.connect();
    try {
      const schemaPath = path.join(process.cwd(), 'server', 'schema.sql');
      if (fs.existsSync(schemaPath)) {
        const sql = fs.readFileSync(schemaPath, 'utf8');
        await client.query(sql);
        console.log('[QA Hub DB] PostgreSQL database schema initialized successfully.');
      }
      isInitialized = true;
    } finally {
      client.release();
    }
  } catch (err) {
    console.warn('[QA Hub DB] PostgreSQL connection warning/fallback mode active:', (err as Error).message);
  }
}

export async function query(text: string, params?: any[]) {
  try {
    await initDb();
    return await pool.query(text, params);
  } catch (err) {
    console.error('[QA Hub DB Query Error]', err);
    throw err;
  }
}
