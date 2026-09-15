import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

const connectionString = process.env.DATABASE_URL;

export let pool: Pool | null = null;
let isInitialized = false;
let isFallback = !connectionString;

if (connectionString) {
  try {
    const isCloud = connectionString.includes('neon.tech') || 
                    connectionString.includes('sslmode=require') || 
                    connectionString.includes('supabase') ||
                    connectionString.includes('amazonaws.com');
    pool = new Pool({
      connectionString,
      ssl: isCloud ? { rejectUnauthorized: false } : undefined,
      connectionTimeoutMillis: 5000,
    });
    console.log('[QA Hub DB] PostgreSQL pool configured with SSL support.');
  } catch {
    console.warn('[QA Hub DB] DB initialization failed — mock fallback active');
    isFallback = true;
  }
} else {
  console.warn('[QA Hub DB] No DATABASE_URL provided — mock fallback active');
}

export async function initDb() {
  if (isInitialized || isFallback || !pool) return;

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
    isFallback = true;
    console.warn('[QA Hub DB] PostgreSQL offline — mock fallback active:', (err as Error).message);
  }
}

export async function query(text: string, params?: any[]): Promise<{ rows: any[] }> {
  if (isFallback || !pool) {
    return { rows: [] };
  }
  try {
    await initDb();
    if (isFallback || !pool) {
      return { rows: [] };
    }
    return await pool.query(text, params);
  } catch (err) {
    isFallback = true;
    console.warn('[QA Hub DB Query Error — falling back to in-memory]', (err as Error).message);
    return { rows: [] };
  }
}

export async function getDbStatus(): Promise<{ connected: boolean; message: string }> {
  if (!pool || isFallback) {
    return {
      connected: false,
      message: connectionString ? 'Database unreachable or credentials invalid (using local fallback)' : 'DATABASE_URL not configured (using local fallback)'
    };
  }
  try {
    const res = await pool.query('SELECT NOW() as current_time');
    return {
      connected: true,
      message: `Connected to PostgreSQL (${res.rows[0]?.current_time || 'online'})`
    };
  } catch (err) {
    return {
      connected: false,
      message: (err as Error).message
    };
  }
}

