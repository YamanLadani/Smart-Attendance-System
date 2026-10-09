import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function addEnumValues() {
  const sql = neon(process.env.DATABASE_URL!);
  
  const values = ['core', 'elective', 'university_elective', 'audit_course', 'project', 'internship', 'skill_augmentation'];
  
  for (const v of values) {
    try {
      await sql(`ALTER TYPE subject_type ADD VALUE IF NOT EXISTS '${v}'`);
      console.log(`✅ Added '${v}'`);
    } catch (e: any) {
      console.log(`⏭️ '${v}': ${e.message?.substring(0, 60)}`);
    }
  }
  
  console.log('Done!');
}

addEnumValues().catch(console.error);
