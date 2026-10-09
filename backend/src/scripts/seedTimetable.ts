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

async function seedTimetables() {
  console.log('🗓️  Seeding Timetable Schedules for Semesters 1-5...\n');

  // Fetch subjects by code to get their IDs
  const subjectsRows = await sql`SELECT id, code, name, semester, department FROM subjects`;
  const subjectMap = new Map<string, any>();
  for (const s of subjectsRows) {
    subjectMap.set(s.code, s);
  }

  // Clear existing timetable entries to avoid duplication
  await sql`DELETE FROM timetables`;

  // Get a teacher ID if available
  const teachers = await sql`SELECT id FROM users WHERE role = 'teacher' LIMIT 2`;
  const defaultTeacherId = teachers.length > 0 ? teachers[0].id : null;
  const secondTeacherId = teachers.length > 1 ? teachers[1].id : defaultTeacherId;

  // Semester 5 Weekly Schedule (Monday = 1 to Saturday = 6)
  // Sem 5 Core: CEUC301 (OS), CSUC301 (ML), ITUE301 (Adv Web Dev), CEUC302 (TOC), HSUA301 (Soft Skills), CEUP301 (Project)
  const sem5Schedule = [
    // MONDAY
    { day: 1, start: '09:00', end: '10:00', code: 'CSUC301', room: 'CR-301', type: 'lecture', teacher: defaultTeacherId },
    { day: 1, start: '10:00', end: '11:00', code: 'CEUC301', room: 'CR-301', type: 'lecture', teacher: secondTeacherId },
    { day: 1, start: '11:15', end: '12:15', code: 'CEUC302', room: 'CR-301', type: 'lecture', teacher: defaultTeacherId },
    // 12:15 - 13:00 LUNCH / FREE PERIOD
    { day: 1, start: '13:00', end: '15:00', code: 'ITUE301', room: 'Lab-3 (Web)', type: 'practical', teacher: secondTeacherId },

    // TUESDAY
    { day: 2, start: '09:00', end: '10:00', code: 'CEUC301', room: 'CR-301', type: 'lecture', teacher: secondTeacherId },
    { day: 2, start: '10:00', end: '11:00', code: 'CEUC302', room: 'CR-301', type: 'lecture', teacher: defaultTeacherId },
    { day: 2, start: '11:15', end: '12:15', code: 'CSUC301', room: 'CR-301', type: 'lecture', teacher: defaultTeacherId },
    // 12:15 - 13:00 FREE
    { day: 2, start: '13:00', end: '15:00', code: 'CSUC301', room: 'Lab-1 (AI/ML)', type: 'practical', teacher: defaultTeacherId },

    // WEDNESDAY
    { day: 3, start: '09:00', end: '10:00', code: 'ITUE301', room: 'CR-301', type: 'lecture', teacher: secondTeacherId },
    { day: 3, start: '10:00', end: '11:00', code: 'HSUA301', room: 'CR-301', type: 'lecture', teacher: defaultTeacherId },
    { day: 3, start: '11:15', end: '12:15', code: 'CEUC301', room: 'CR-301', type: 'lecture', teacher: secondTeacherId },
    { day: 3, start: '13:00', end: '15:00', code: 'CEUP301', room: 'Project Lab', type: 'practical', teacher: secondTeacherId },

    // THURSDAY
    { day: 4, start: '09:00', end: '10:00', code: 'CEUC302', room: 'CR-301', type: 'lecture', teacher: defaultTeacherId },
    { day: 4, start: '10:00', end: '11:00', code: 'CSUC301', room: 'CR-301', type: 'lecture', teacher: defaultTeacherId },
    { day: 4, start: '11:15', end: '12:15', code: 'HSUA301', room: 'CR-301', type: 'lecture', teacher: defaultTeacherId },
    { day: 4, start: '13:00', end: '15:00', code: 'CEUC301', room: 'Lab-2 (OS)', type: 'practical', teacher: secondTeacherId },

    // FRIDAY
    { day: 5, start: '09:00', end: '10:00', code: 'CSUC301', room: 'CR-301', type: 'lecture', teacher: defaultTeacherId },
    { day: 5, start: '10:00', end: '11:00', code: 'CEUC301', room: 'CR-301', type: 'lecture', teacher: secondTeacherId },
    { day: 5, start: '11:15', end: '12:15', code: 'ITUE301', room: 'CR-301', type: 'lecture', teacher: secondTeacherId },
    { day: 5, start: '13:00', end: '14:00', code: 'CEUC302', room: 'CR-301', type: 'tutorial', teacher: defaultTeacherId },

    // SATURDAY
    { day: 6, start: '09:00', end: '11:00', code: 'CEUP301', room: 'Project Lab', type: 'practical', teacher: defaultTeacherId },
    { day: 6, start: '11:15', end: '13:00', code: 'HSUA301', room: 'Seminar Hall', type: 'lecture', teacher: secondTeacherId },
  ];

  // Insert Semester 5 schedule
  let inserted = 0;
  for (const slot of sem5Schedule) {
    const subj = subjectMap.get(slot.code);
    if (subj) {
      await sql`
        INSERT INTO timetables (
          subject_id, teacher_id, department, semester, division, day_of_week, start_time, end_time, room, type, is_active
        ) VALUES (
          ${subj.id}, ${slot.teacher}, 'Computer Science', 5, 'A', ${slot.day}, ${slot.start}, ${slot.end}, ${slot.room}, ${slot.type}, true
        )
      `;
      inserted++;
    }
  }

  // Insert Semester 3 Schedule (Sample for Sem 3 CSE)
  // Sem 3 Core: CSUC201 (DSA), MSUD203 (Discrete Math), CEUE203 (OOP), HSUV201 (Innovation), ITUC201 (Networks)
  const sem3Schedule = [
    { day: 1, start: '09:00', end: '10:00', code: 'CSUC201', room: 'CR-201', type: 'lecture' },
    { day: 1, start: '10:00', end: '11:00', code: 'MSUD203', room: 'CR-201', type: 'lecture' },
    { day: 1, start: '11:15', end: '12:15', code: 'CEUE203', room: 'CR-201', type: 'lecture' },
    { day: 2, start: '09:00', end: '10:00', code: 'MSUD203', room: 'CR-201', type: 'lecture' },
    { day: 2, start: '10:00', end: '12:00', code: 'CSUC201', room: 'Lab-1', type: 'practical' },
    { day: 3, start: '09:00', end: '10:00', code: 'ITUC201', room: 'CR-201', type: 'lecture' },
    { day: 3, start: '10:00', end: '11:00', code: 'CEUE203', room: 'CR-201', type: 'lecture' },
    { day: 4, start: '09:00', end: '10:00', code: 'CSUC201', room: 'CR-201', type: 'lecture' },
    { day: 4, start: '10:00', end: '11:00', code: 'HSUV201', room: 'CR-201', type: 'lecture' },
    { day: 5, start: '09:00', end: '10:00', code: 'ITUC201', room: 'CR-201', type: 'lecture' },
    { day: 5, start: '10:00', end: '12:00', code: 'CEUE203', room: 'Lab-2', type: 'practical' },
  ];

  for (const slot of sem3Schedule) {
    const subj = subjectMap.get(slot.code);
    if (subj) {
      await sql`
        INSERT INTO timetables (
          subject_id, teacher_id, department, semester, division, day_of_week, start_time, end_time, room, type, is_active
        ) VALUES (
          ${subj.id}, ${defaultTeacherId}, 'Computer Science', 3, 'A', ${slot.day}, ${slot.start}, ${slot.end}, ${slot.room}, ${slot.type}, true
        )
      `;
      inserted++;
    }
  }

  // Insert Semester 1 Schedule (Sample for Sem 1 CSE)
  // Sem 1 Core: MSUD101 (Math-I), CEUC101 (Programming), EEUD101 (BEE), PSUD101 (Physics-I), HSUA101 (English)
  const sem1Schedule = [
    { day: 1, start: '09:00', end: '10:00', code: 'MSUD101', room: 'CR-101', type: 'lecture' },
    { day: 1, start: '10:00', end: '11:00', code: 'CEUC101', room: 'CR-101', type: 'lecture' },
    { day: 1, start: '11:15', end: '12:15', code: 'EEUD101', room: 'CR-101', type: 'lecture' },
    { day: 2, start: '09:00', end: '10:00', code: 'PSUD101', room: 'CR-101', type: 'lecture' },
    { day: 2, start: '10:00', end: '12:00', code: 'CEUC101', room: 'Programming Lab', type: 'practical' },
    { day: 3, start: '09:00', end: '10:00', code: 'MSUD101', room: 'CR-101', type: 'lecture' },
    { day: 3, start: '10:00', end: '11:00', code: 'HSUA101', room: 'CR-101', type: 'lecture' },
    { day: 4, start: '09:00', end: '10:00', code: 'EEUD101', room: 'CR-101', type: 'lecture' },
    { day: 4, start: '10:00', end: '12:00', code: 'EEUD101', room: 'Electrical Lab', type: 'practical' },
    { day: 5, start: '09:00', end: '10:00', code: 'MSUD101', room: 'CR-101', type: 'lecture' },
    { day: 5, start: '10:00', end: '11:00', code: 'PSUD101', room: 'CR-101', type: 'lecture' },
  ];

  for (const slot of sem1Schedule) {
    const subj = subjectMap.get(slot.code);
    if (subj) {
      await sql`
        INSERT INTO timetables (
          subject_id, teacher_id, department, semester, division, day_of_week, start_time, end_time, room, type, is_active
        ) VALUES (
          ${subj.id}, ${defaultTeacherId}, 'Computer Science', 1, 'A', ${slot.day}, ${slot.start}, ${slot.end}, ${slot.room}, ${slot.type}, true
        )
      `;
      inserted++;
    }
  }

  console.log(`✅ Finished seeding! Created ${inserted} timetable slots across Semesters 1, 3, and 5.`);
}

seedTimetables().catch(console.error);
