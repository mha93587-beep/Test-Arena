import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema.js';

const sql = neon(process.env.NEON_DATABASE_URL!);
export const db = drizzle(sql, { schema });

export async function initDb() {
  await sql`
    CREATE TABLE IF NOT EXISTS tests (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      topic TEXT NOT NULL,
      exam_type TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      question_count INTEGER NOT NULL,
      is_public BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS questions (
      id SERIAL PRIMARY KEY,
      test_id INTEGER NOT NULL REFERENCES tests(id),
      text TEXT NOT NULL,
      options JSONB NOT NULL,
      correct_answer TEXT NOT NULL,
      explanation TEXT,
      image_url TEXT,
      hint TEXT,
      section TEXT
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS sessions (
      id SERIAL PRIMARY KEY,
      test_id INTEGER NOT NULL REFERENCES tests(id),
      completed_at TIMESTAMPTZ,
      time_taken_seconds INTEGER,
      score INTEGER,
      total INTEGER
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS session_answers (
      id SERIAL PRIMARY KEY,
      session_id INTEGER NOT NULL REFERENCES sessions(id),
      question_id INTEGER NOT NULL REFERENCES questions(id),
      selected_answer TEXT,
      is_correct BOOLEAN,
      time_taken_seconds INTEGER
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS test_translations (
      id SERIAL PRIMARY KEY,
      test_id INTEGER NOT NULL REFERENCES tests(id),
      language TEXT NOT NULL,
      translated_data JSONB NOT NULL,
      UNIQUE(test_id, language)
    )
  `;

  console.log('Database tables ready.');
}
