import { Pool } from 'pg';
import fs from 'fs/promises';
import path from 'path';

export async function runMigrations() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL must be set for migrations');
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  console.log('Checking database schema...');
  
  try {
    // Read the migration SQL file
    const migrationPath = path.join(process.cwd(), 'migrations', '0000_good_juggernaut.sql');
    let migrationSQL = await fs.readFile(migrationPath, 'utf-8');
    
    // Replace all "CREATE TABLE" with "CREATE TABLE IF NOT EXISTS" to make it idempotent
    migrationSQL = migrationSQL.replace(/CREATE TABLE "/g, 'CREATE TABLE IF NOT EXISTS "');
    migrationSQL = migrationSQL.replace(/CREATE INDEX "/g, 'CREATE INDEX IF NOT EXISTS "');
    
    // Split by statement breakpoint and execute each statement
    const statements = migrationSQL.split('--> statement-breakpoint').filter(s => s.trim());
    
    for (const statement of statements) {
      const trimmed = statement.trim();
      if (trimmed) {
        try {
          await pool.query(trimmed);
        } catch (error: any) {
          // Ignore "already exists" errors (tables, indexes, constraints)
          if (error.code === '42P07' || error.code === '42710') {
            // 42P07 = duplicate_table, 42710 = duplicate_object
            console.log(`Skipping: ${error.message}`);
            continue;
          }
          throw error;
        }
      }
    }
    
    console.log('✓ Database schema verified/created successfully');
    
    // Add intelligence feature columns if they don't exist
    console.log('Adding intelligence feature columns...');
    const intelligenceColumns = `
      ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS win_back_discount_percent INTEGER DEFAULT 15;
      ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS win_back_email_subject TEXT;
      ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS win_back_email_body TEXT;
      ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS churn_risk_high_days INTEGER DEFAULT 90;
      ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS churn_risk_medium_days INTEGER DEFAULT 60;
      ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS anomaly_promo_creation_threshold INTEGER DEFAULT 5;
      ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS anomaly_promo_creation_minutes INTEGER DEFAULT 10;
      ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS anomaly_invoice_change_percent INTEGER DEFAULT 80;
      ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS anomaly_cancellation_threshold INTEGER DEFAULT 10;
      ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS anomaly_cancellation_hours INTEGER DEFAULT 24;
      ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS quick_reply_templates JSONB DEFAULT '[]'::jsonb;
      ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS enable_churn_risk_scoring BOOLEAN DEFAULT true;
      ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS enable_win_back_campaigns BOOLEAN DEFAULT true;
      ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS enable_anomaly_detection BOOLEAN DEFAULT true;
    `;
    
    await pool.query(intelligenceColumns);
    console.log('✓ Intelligence feature columns added/verified');
    
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  } finally {
    await pool.end();
  }
}
