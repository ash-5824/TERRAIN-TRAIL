
import { neon } from '@neondatabase/serverless';

export const sql = neon(
  process.env.DATABASE_URL ||
    'postgresql://placeholder:placeholder@placeholder.neon.tech/neondb?sslmode=require'
);

export async function initDB() {
  try {
    await sql`CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'Trail Scout',
      avatar_url TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`;

    await sql`CREATE TABLE IF NOT EXISTS hazard_reports ( 
      id SERIAL PRIMARY KEY, 
      latitude FLOAT NOT NULL, 
      longitude FLOAT NOT NULL, 
      risk_level TEXT NOT NULL, 
      hazard_type TEXT NOT NULL, 
      safe_to_proceed BOOLEAN NOT NULL, 
      recommended_action TEXT, 
      image_data TEXT,
      author_name TEXT,
      author_role TEXT,
      author_avatar TEXT,
      location_name TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP 
    );`;
    await sql`ALTER TABLE hazard_reports ADD COLUMN IF NOT EXISTS image_data TEXT;`;
    await sql`ALTER TABLE hazard_reports ADD COLUMN IF NOT EXISTS author_name TEXT;`;
    await sql`ALTER TABLE hazard_reports ADD COLUMN IF NOT EXISTS author_role TEXT;`;
    await sql`ALTER TABLE hazard_reports ADD COLUMN IF NOT EXISTS author_avatar TEXT;`;
    await sql`ALTER TABLE hazard_reports ADD COLUMN IF NOT EXISTS location_name TEXT;`;
  } catch (error) {
    console.error('Database initialization error (safely caught):', error);
  }
}
