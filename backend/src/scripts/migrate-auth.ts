import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function migrate() {
  console.log('🔄 Applying schema migration...\n');

  const queries = [
    // 1. Make firebaseUid nullable
    `ALTER TABLE users ALTER COLUMN firebase_uid DROP NOT NULL;`,

    // 2. Add passwordHash column
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);`,

    // 3. Add googleId column with unique constraint
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255);`,
    `DO $$ BEGIN
       IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_google_id_unique') THEN
         ALTER TABLE users ADD CONSTRAINT users_google_id_unique UNIQUE (google_id);
       END IF;
     END $$;`,

    // 4. Add bio column
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;`,

    // 5. Add OTP columns
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_code VARCHAR(10);`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMPTZ;`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_attempts INTEGER NOT NULL DEFAULT 0;`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_last_sent_at TIMESTAMPTZ;`,
  ];

  for (const query of queries) {
    try {
      await sql(query);
      const shortQuery = query.replace(/\s+/g, ' ').substring(0, 80);
      console.log(`  ✅ ${shortQuery}...`);
    } catch (err: any) {
      // Ignore "already exists" errors
      if (err.message?.includes('already exists') || err.message?.includes('duplicate')) {
        const shortQuery = query.replace(/\s+/g, ' ').substring(0, 60);
        console.log(`  ⏭️  Skipped (already exists): ${shortQuery}...`);
      } else {
        console.error(`  ❌ Failed: ${query.substring(0, 60)}...`);
        console.error(`     Error: ${err.message}`);
      }
    }
  }

  console.log('\n✅ Schema migration complete!');
}

migrate().catch(console.error);
