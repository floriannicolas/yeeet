import 'dotenv/config';
import { createClient } from '@vercel/postgres';
import { Pool } from 'pg';
import * as schema from './db/schema';
import { drizzle } from 'drizzle-orm/node-postgres';
import { drizzle as vercelDrizzle } from 'drizzle-orm/vercel-postgres';

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

export const db = (process.env.VERCEL)
  ? vercelDrizzle(createClient({
    connectionString: process.env.POSTGRES_URL,
  }), { schema })
  : drizzle(pool, { schema });

export default db; 