import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

async function migrate() {
  const sql = neon(DATABASE_URL!);

  console.log('🔄 Starting manual migration...');

  // Create new enum values (audit_action)
  try {
    await sql`CREATE TYPE "audit_action" AS ENUM (
      'user_created', 'user_updated', 'user_deactivated', 'user_activated',
      'admin_created', 'role_changed',
      'attendance_marked', 'attendance_corrected', 'attendance_deleted',
      'subject_created', 'subject_updated',
      'enrollment_created', 'enrollment_removed',
      'session_created', 'session_ended',
      'login', 'logout',
      'setting_updated'
    )`;
    console.log('✅ Created audit_action enum');
  } catch (e: any) {
    if (e.code === '42710') console.log('⏭️ audit_action enum already exists');
    else console.error('⚠️ audit_action:', e.message);
  }

  // Add missing enum values to subject_type
  const newSubjectTypes = ['core', 'elective', 'university_elective', 'audit_course', 'project', 'internship', 'skill_augmentation'];
  for (const val of newSubjectTypes) {
    try {
      await sql(`ALTER TYPE subject_type ADD VALUE IF NOT EXISTS '${val}'`);
      console.log(`✅ Added '${val}' to subject_type enum`);
    } catch (e: any) {
      if (e.message?.includes('already exists')) console.log(`⏭️ '${val}' already in subject_type`);
      else console.log(`⏭️ ${val}: ${e.message}`);
    }
  }

  // Create enrollments table
  try {
    await sql`CREATE TABLE IF NOT EXISTS "enrollments" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "student_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "subject_id" uuid NOT NULL REFERENCES "subjects"("id") ON DELETE CASCADE,
      "enrolled_at" timestamp with time zone NOT NULL DEFAULT now(),
      "enrolled_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
      "is_active" boolean NOT NULL DEFAULT true,
      "created_at" timestamp with time zone NOT NULL DEFAULT now(),
      "updated_at" timestamp with time zone NOT NULL DEFAULT now()
    )`;
    console.log('✅ Created enrollments table');
  } catch (e: any) {
    console.log(`⏭️ enrollments: ${e.message}`);
  }

  // Create indexes on enrollments
  try { await sql`CREATE UNIQUE INDEX IF NOT EXISTS "enrollments_student_subject_idx" ON "enrollments" ("student_id", "subject_id")`; } catch (e) {}
  try { await sql`CREATE INDEX IF NOT EXISTS "enrollments_subject_idx" ON "enrollments" ("subject_id")`; } catch (e) {}
  try { await sql`CREATE INDEX IF NOT EXISTS "enrollments_student_idx" ON "enrollments" ("student_id")`; } catch (e) {}
  console.log('✅ Enrollments indexes created');

  // Create attendance_sessions table
  try {
    await sql`CREATE TABLE IF NOT EXISTS "attendance_sessions" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "subject_id" uuid NOT NULL REFERENCES "subjects"("id") ON DELETE CASCADE,
      "teacher_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "timetable_id" uuid REFERENCES "timetables"("id") ON DELETE SET NULL,
      "lecture_id" varchar(255) NOT NULL UNIQUE,
      "qr_token" varchar(255) NOT NULL,
      "expiry_seconds" integer NOT NULL DEFAULT 30,
      "is_active" boolean NOT NULL DEFAULT true,
      "started_at" timestamp with time zone NOT NULL DEFAULT now(),
      "ended_at" timestamp with time zone,
      "created_at" timestamp with time zone NOT NULL DEFAULT now()
    )`;
    console.log('✅ Created attendance_sessions table');
  } catch (e: any) {
    console.log(`⏭️ attendance_sessions: ${e.message}`);
  }

  // Create indexes on attendance_sessions
  try { await sql`CREATE INDEX IF NOT EXISTS "sessions_teacher_idx" ON "attendance_sessions" ("teacher_id")`; } catch (e) {}
  try { await sql`CREATE INDEX IF NOT EXISTS "sessions_subject_idx" ON "attendance_sessions" ("subject_id")`; } catch (e) {}
  try { await sql`CREATE INDEX IF NOT EXISTS "sessions_active_idx" ON "attendance_sessions" ("is_active")`; } catch (e) {}
  console.log('✅ attendance_sessions indexes created');

  // Create audit_logs table
  try {
    await sql`CREATE TABLE IF NOT EXISTS "audit_logs" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
      "action" "audit_action" NOT NULL,
      "target_type" varchar(100),
      "target_id" varchar(255),
      "description" text NOT NULL,
      "metadata" jsonb,
      "ip_address" varchar(50),
      "created_at" timestamp with time zone NOT NULL DEFAULT now()
    )`;
    console.log('✅ Created audit_logs table');
  } catch (e: any) {
    console.log(`⏭️ audit_logs: ${e.message}`);
  }

  // Create indexes on audit_logs
  try { await sql`CREATE INDEX IF NOT EXISTS "audit_logs_user_idx" ON "audit_logs" ("user_id")`; } catch (e) {}
  try { await sql`CREATE INDEX IF NOT EXISTS "audit_logs_action_idx" ON "audit_logs" ("action")`; } catch (e) {}
  try { await sql`CREATE INDEX IF NOT EXISTS "audit_logs_created_idx" ON "audit_logs" ("created_at")`; } catch (e) {}
  try { await sql`CREATE INDEX IF NOT EXISTS "audit_logs_target_idx" ON "audit_logs" ("target_type", "target_id")`; } catch (e) {}
  console.log('✅ audit_logs indexes created');

  // Add new columns to existing tables (IF NOT EXISTS style)
  // -- subjects: year, academic_year, teaching_hours
  try { await sql`ALTER TABLE "subjects" ADD COLUMN IF NOT EXISTS "year" integer`; console.log('✅ subjects.year added'); } catch (e) {}
  try { await sql`ALTER TABLE "subjects" ADD COLUMN IF NOT EXISTS "academic_year" varchar(20)`; console.log('✅ subjects.academic_year added'); } catch (e) {}
  try { await sql`ALTER TABLE "subjects" ADD COLUMN IF NOT EXISTS "teaching_hours" integer`; console.log('✅ subjects.teaching_hours added'); } catch (e) {}

  // -- attendance: session_id, marked_by, is_manual, remarks
  try { await sql`ALTER TABLE "attendance" ADD COLUMN IF NOT EXISTS "session_id" uuid REFERENCES "attendance_sessions"("id") ON DELETE SET NULL`; console.log('✅ attendance.session_id added'); } catch (e) {}
  try { await sql`ALTER TABLE "attendance" ADD COLUMN IF NOT EXISTS "marked_by" uuid REFERENCES "users"("id") ON DELETE SET NULL`; console.log('✅ attendance.marked_by added'); } catch (e) {}
  try { await sql`ALTER TABLE "attendance" ADD COLUMN IF NOT EXISTS "is_manual" boolean NOT NULL DEFAULT false`; console.log('✅ attendance.is_manual added'); } catch (e) {}
  try { await sql`ALTER TABLE "attendance" ADD COLUMN IF NOT EXISTS "remarks" text`; console.log('✅ attendance.remarks added'); } catch (e) {}

  // -- attendance index on session
  try { await sql`CREATE INDEX IF NOT EXISTS "attendance_session_idx" ON "attendance" ("session_id")`; } catch (e) {}

  console.log('\n🎉 Migration complete!');
}

migrate().catch(console.error);
