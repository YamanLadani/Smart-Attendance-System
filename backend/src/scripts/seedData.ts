import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function seedData() {
  console.log('🌱 Seeding initial user accounts, enrollments, and sample records...\n');

  const passwordHash = await bcrypt.hash('password123', 12);

  // 1. Create Super Admin / Dept Admin
  const adminUsers = [
    {
      email: 'admin.cse@college.edu',
      displayName: 'CSE Department Admin',
      role: 'admin',
      department: 'Computer Science',
      adminLevel: 'department',
    },
    {
      email: 'admin.it@college.edu',
      displayName: 'IT Department Admin',
      role: 'admin',
      department: 'Information Technology',
      adminLevel: 'department',
    },
  ];

  for (const adm of adminUsers) {
    const [existing] = await sql`SELECT id FROM users WHERE email = ${adm.email}`;
    let userId: string;
    if (existing) {
      userId = existing.id;
      await sql`UPDATE users SET password_hash = ${passwordHash}, is_active = true WHERE id = ${userId}`;
    } else {
      const [inserted] = await sql`
        INSERT INTO users (
          email, display_name, password_hash, role, department, is_active, is_email_verified
        ) VALUES (
          ${adm.email}, ${adm.displayName}, ${passwordHash}, ${adm.role}, ${adm.department}, true, true
        ) RETURNING id
      `;
      userId = inserted.id;
      await sql`
        INSERT INTO admins (user_id, admin_level, managed_departments)
        VALUES (${userId}, ${adm.adminLevel}, ${[adm.department]})
        ON CONFLICT (user_id) DO NOTHING
      `;
    }
    console.log(`  👑 Admin: ${adm.email} (password123)`);
  }

  // 2. Create Teachers
  const teacherUsers = [
    {
      email: 'teacher.sharma@college.edu',
      displayName: 'Prof. Rajesh Sharma',
      department: 'Computer Science',
      employeeId: 'EMP-CSE-001',
      designation: 'Associate Professor',
      specialization: 'Artificial Intelligence & Machine Learning',
    },
    {
      email: 'teacher.patel@college.edu',
      displayName: 'Dr. Ananya Patel',
      department: 'Computer Science',
      employeeId: 'EMP-CSE-002',
      designation: 'Professor',
      specialization: 'Operating Systems & System Architecture',
    },
  ];

  const teacherIds: string[] = [];
  for (const tch of teacherUsers) {
    const [existing] = await sql`SELECT id FROM users WHERE email = ${tch.email}`;
    let userId: string;
    if (existing) {
      userId = existing.id;
      await sql`UPDATE users SET password_hash = ${passwordHash}, is_active = true WHERE id = ${userId}`;
    } else {
      const [inserted] = await sql`
        INSERT INTO users (
          email, display_name, password_hash, role, department, is_active, is_email_verified
        ) VALUES (
          ${tch.email}, ${tch.displayName}, ${passwordHash}, 'teacher', ${tch.department}, true, true
        ) RETURNING id
      `;
      userId = inserted.id;
      await sql`
        INSERT INTO teachers (user_id, employee_id, department, designation, specialization, subjects)
        VALUES (${userId}, ${tch.employeeId}, ${tch.department}, ${tch.designation}, ${tch.specialization}, '{}')
        ON CONFLICT (user_id) DO NOTHING
      `;
    }
    teacherIds.push(userId);
    console.log(`  👨‍🏫 Teacher: ${tch.email} (password123)`);
  }

  // 3. Create Students (Sem 5, Sem 3, Sem 1)
  const studentUsers = [
    {
      email: 'student.sem5@college.edu',
      displayName: 'Aarav Mehta',
      department: 'Computer Science',
      semester: 5,
      division: 'A',
      rollNumber: '101',
      enrollmentNumber: 'EN2024CSE101',
      branch: 'Computer Science',
      careerGoal: 'Machine Learning Engineer',
    },
    {
      email: 'student.sem3@college.edu',
      displayName: 'Diya Sharma',
      department: 'Computer Science',
      semester: 3,
      division: 'A',
      rollNumber: '201',
      enrollmentNumber: 'EN2025CSE201',
      branch: 'Computer Science',
      careerGoal: 'Full Stack Developer',
    },
    {
      email: 'student.sem1@college.edu',
      displayName: 'Rohan Gupta',
      department: 'Computer Science',
      semester: 1,
      division: 'A',
      rollNumber: '301',
      enrollmentNumber: 'EN2026CSE301',
      branch: 'Computer Science',
      careerGoal: 'Software Engineer',
    },
  ];

  const studentIds: { id: string; semester: number }[] = [];
  for (const std of studentUsers) {
    const [existing] = await sql`SELECT id FROM users WHERE email = ${std.email}`;
    let userId: string;
    if (existing) {
      userId = existing.id;
      await sql`UPDATE users SET password_hash = ${passwordHash}, is_active = true WHERE id = ${userId}`;
    } else {
      const [inserted] = await sql`
        INSERT INTO users (
          email, display_name, password_hash, role, department, semester, division, roll_number, is_active, is_email_verified
        ) VALUES (
          ${std.email}, ${std.displayName}, ${passwordHash}, 'student', ${std.department}, ${std.semester}, ${std.division}, ${std.rollNumber}, true, true
        ) RETURNING id
      `;
      userId = inserted.id;
      await sql`
        INSERT INTO students (
          user_id, enrollment_number, branch, semester, division, roll_number, batch, career_goal, strong_subjects, weak_subjects
        ) VALUES (
          ${userId}, ${std.enrollmentNumber}, ${std.branch}, ${std.semester}, ${std.division}, ${std.rollNumber}, '2024-2028', ${std.careerGoal},
          ARRAY['Machine Learning', 'Data Structures'], ARRAY['Theory of Computation']
        )
        ON CONFLICT (user_id) DO NOTHING
      `;
    }
    studentIds.push({ id: userId, semester: std.semester });
    console.log(`  🎓 Student (Sem ${std.semester}): ${std.email} (password123)`);
  }

  // 4. Auto-enroll students in all subjects matching their semester
  console.log('\n📚 Auto-enrolling students in semester-specific subjects...');
  for (const std of studentIds) {
    const semSubjects = await sql`SELECT id, name FROM subjects WHERE semester = ${std.semester}`;
    for (const sub of semSubjects) {
      await sql`
        INSERT INTO enrollments (student_id, subject_id, is_active)
        VALUES (${std.id}, ${sub.id}, true)
        ON CONFLICT (student_id, subject_id) DO NOTHING
      `;
    }
    console.log(`  ✅ Enrolled student in ${semSubjects.length} subjects for Semester ${std.semester}`);
  }

  // 5. Assign teachers to Sem 5 subjects
  if (teacherIds.length > 0) {
    await sql`UPDATE subjects SET teacher_id = ${teacherIds[0]} WHERE code IN ('CSUC301', 'CEUC302', 'CEUP301')`;
    if (teacherIds.length > 1) {
      await sql`UPDATE subjects SET teacher_id = ${teacherIds[1]} WHERE code IN ('CEUC301', 'ITUE301', 'HSUA301')`;
    }
    console.log('\n👨‍🏫 Assigned faculty to Semester 5 core subjects.');
  }

  // 6. Generate sample attendance records for Semester 5 student (past 14 days)
  console.log('\n📊 Generating sample attendance history for testing...');
  const sem5Student = studentIds.find(s => s.semester === 5);
  if (sem5Student) {
    const sem5Subjects = await sql`SELECT id, name, code FROM subjects WHERE semester = 5 LIMIT 4`;
    const today = new Date();

    for (let d = 14; d >= 1; d--) {
      const date = new Date(today);
      date.setDate(date.getDate() - d);
      // Skip Sundays
      if (date.getDay() === 0) continue;

      for (let idx = 0; idx < sem5Subjects.length; idx++) {
        const sub = sem5Subjects[idx];
        const teacher = teacherIds[idx % teacherIds.length] || null;
        // 85% chance present, 10% absent, 5% late
        const rand = Math.random();
        const status = rand > 0.15 ? 'present' : rand > 0.05 ? 'absent' : 'late';
        const lectureId = `LEC-${date.toISOString().split('T')[0]}-${sub.code}-${idx}`;

        await sql`
          INSERT INTO attendance (
            student_id, teacher_id, subject_id, lecture_id, date, status, marked_at, is_manual
          ) VALUES (
            ${sem5Student.id}, ${teacher}, ${sub.id}, ${lectureId}, ${date}, ${status}, ${date}, false
          )
          ON CONFLICT (student_id, lecture_id) DO NOTHING
        `;
      }
    }
    console.log('  ✅ Sample attendance records populated for past 2 weeks!');
  }

  console.log('\n🎉 Seed data successfully created! All accounts ready with password: password123\n');
}

seedData().catch(console.error);
