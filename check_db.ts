import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

async function checkDb() {
  try {
    const sql = neon(process.env.NEON_DATABASE_URL!);
    
    // Check tables
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    
    console.log("✅ Successfully connected to Neon Database!");
    console.log("Tables found:", tables.map(t => t.table_name).join(', '));
    
    // Check counts
    for (const table of tables) {
      const count = await sql(`SELECT COUNT(*) FROM ${table.table_name}`);
      console.log(`- ${table.table_name}: ${count[0].count} rows`);
    }
    
  } catch (e) {
    console.error("❌ Database connection error:", e);
  }
}

checkDb();
