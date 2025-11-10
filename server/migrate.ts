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
    // Run all migration files in order
    const migrationFiles = ['0000_good_juggernaut.sql', '0001_wild_nuke.sql'];
    
    for (const filename of migrationFiles) {
      const migrationPath = path.join(process.cwd(), 'migrations', filename);
      
      try {
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
              if (error.code === '42P07' || error.code === '42710' || error.code === '42P16' || error.code === '42701') {
                // 42P07 = duplicate_table, 42710 = duplicate_object, 42P16 = duplicate_constraint, 42701 = duplicate_column
                console.log(`Skipping: ${error.message}`);
                continue;
              }
              throw error;
            }
          }
        }
      } catch (error: any) {
        if (error.code === 'ENOENT') {
          console.log(`Migration file ${filename} not found, skipping`);
        } else {
          throw error;
        }
      }
    }
    
    console.log('✓ Database schema verified/created successfully');
    
    // Add intelligence feature columns to business_settings if they don't exist
    console.log('Adding intelligence feature columns to business_settings...');
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
      ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS anomaly_deletion_threshold INTEGER DEFAULT 20;
      ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS anomaly_deletion_minutes INTEGER DEFAULT 10;
      ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS quick_replies JSONB;
      ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS enable_churn_risk_scoring BOOLEAN DEFAULT true;
      ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS enable_win_back_campaigns BOOLEAN DEFAULT true;
      ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS enable_anomaly_detection BOOLEAN DEFAULT true;
      ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS promo_banner_show_promo_details BOOLEAN NOT NULL DEFAULT true;
    `;
    
    await pool.query(intelligenceColumns);
    console.log('✓ Business settings intelligence columns added/verified');
    
    // Add customer intelligence columns if they don't exist
    console.log('Adding customer intelligence columns...');
    const customerColumns = `
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS churn_risk TEXT DEFAULT 'low';
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS churn_risk_last_calculated TIMESTAMP;
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS tags TEXT[];
    `;
    
    await pool.query(customerColumns);
    console.log('✓ Customer intelligence columns added/verified');
    
    // Add employee scheduling columns if they don't exist
    console.log('Adding employee scheduling columns...');
    const employeeColumns = `
      ALTER TABLE employees ADD COLUMN IF NOT EXISTS availability JSONB;
      ALTER TABLE employees ADD COLUMN IF NOT EXISTS vacation_days TEXT[];
    `;
    
    await pool.query(employeeColumns);
    console.log('✓ Employee scheduling columns added/verified');
    
    // Create anomaly_alerts table if it doesn't exist
    console.log('Creating anomaly_alerts table...');
    const anomalyAlertsTable = `
      CREATE TABLE IF NOT EXISTS anomaly_alerts (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        type TEXT NOT NULL,
        severity TEXT NOT NULL DEFAULT 'medium',
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        payload JSONB,
        triggered_by VARCHAR REFERENCES users(id),
        status TEXT NOT NULL DEFAULT 'open',
        acknowledged_by VARCHAR REFERENCES users(id),
        acknowledged_at TIMESTAMP,
        resolved_by VARCHAR REFERENCES users(id),
        resolved_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT now()
      );
    `;
    
    await pool.query(anomalyAlertsTable);
    console.log('✓ Anomaly alerts table created/verified');
    
    // Add customer portal feature columns if they don't exist
    console.log('Adding customer portal feature columns...');
    const customerPortalColumns = `
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT true;
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS sms_notifications BOOLEAN DEFAULT true;
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS reminder_preference TEXT DEFAULT '24h';
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS saved_addresses JSONB;
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS special_requests TEXT[];
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS preferred_employees TEXT[];
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS loyalty_points INTEGER DEFAULT 0;
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS loyalty_tier TEXT DEFAULT 'bronze';
    `;
    
    await pool.query(customerPortalColumns);
    console.log('✓ Customer portal feature columns added/verified');
    
    // Add fraud protection columns for referrals
    console.log('Adding referral fraud protection columns...');
    const fraudProtectionColumns = `
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS ip_address TEXT;
      ALTER TABLE referral_settings ADD COLUMN IF NOT EXISTS max_referrals_per_day INTEGER DEFAULT 3;
      ALTER TABLE referral_settings ADD COLUMN IF NOT EXISTS max_referrals_per_week INTEGER DEFAULT 10;
      ALTER TABLE referral_settings ADD COLUMN IF NOT EXISTS fraud_detection_enabled BOOLEAN DEFAULT true;
      ALTER TABLE referral_settings ADD COLUMN IF NOT EXISTS block_same_address BOOLEAN DEFAULT true;
      ALTER TABLE referral_settings ADD COLUMN IF NOT EXISTS block_same_phone_number BOOLEAN DEFAULT true;
      ALTER TABLE referral_settings ADD COLUMN IF NOT EXISTS block_same_ip_address BOOLEAN DEFAULT true;
    `;
    
    await pool.query(fraudProtectionColumns);
    console.log('✓ Referral fraud protection columns added/verified');
    
    // Add scheduling control columns to business_settings
    console.log('Adding scheduling control columns...');
    const schedulingColumns = `
      ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS min_lead_hours INTEGER DEFAULT 12;
      ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS max_bookings_per_slot INTEGER DEFAULT 3;
      ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS require_booking_approval BOOLEAN DEFAULT true;
      ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS customer_dedup_enabled BOOLEAN DEFAULT true;
      ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS customer_merge_alert_enabled BOOLEAN DEFAULT true;
    `;
    
    await pool.query(schedulingColumns);
    console.log('✓ Scheduling control columns added/verified');
    
    // Create reschedule_requests table if it doesn't exist
    console.log('Creating reschedule_requests table...');
    const rescheduleRequestsTable = `
      CREATE TABLE IF NOT EXISTS reschedule_requests (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        booking_id VARCHAR NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
        requested_date TEXT NOT NULL,
        requested_time_slot TEXT NOT NULL,
        customer_notes TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        decision_by VARCHAR REFERENCES users(id),
        decision_at TIMESTAMP,
        decision_reason TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now()
      );
    `;
    
    await pool.query(rescheduleRequestsTable);
    console.log('✓ Reschedule requests table created/verified');
    
    // Create quote_photos table if it doesn't exist
    console.log('Creating quote_photos table...');
    const quotePhotosTable = `
      CREATE TABLE IF NOT EXISTS quote_photos (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        quote_id VARCHAR NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
        photo_data TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        original_name TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT now()
      );
    `;
    
    await pool.query(quotePhotosTable);
    console.log('✓ Quote photos table created/verified');
    
    // Add message tracking columns to contact_messages
    console.log('Adding message tracking columns to contact_messages...');
    const contactMessageColumns = `
      ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'new';
      ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS assigned_to VARCHAR;
      ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS reply_message TEXT;
      ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS replied_at TIMESTAMP;
    `;
    
    // Add the foreign key constraint separately (will skip if already exists)
    const contactMessageConstraint = `
      DO $$ BEGIN
        ALTER TABLE contact_messages 
        ADD CONSTRAINT contact_messages_assigned_to_fkey 
        FOREIGN KEY (assigned_to) REFERENCES employees(id);
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `;
    
    await pool.query(contactMessageColumns);
    await pool.query(contactMessageConstraint);
    console.log('✓ Contact message tracking columns added/verified');
    
    // Create CMS content table if it doesn't exist
    console.log('Creating cms_content table...');
    const cmsContentTable = `
      CREATE TABLE IF NOT EXISTS cms_content (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        section TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        content_type TEXT NOT NULL DEFAULT 'text',
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now(),
        UNIQUE(section, key)
      );
    `;
    
    await pool.query(cmsContentTable);
    console.log('✓ CMS content table created/verified');
    
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  } finally {
    await pool.end();
  }
}
