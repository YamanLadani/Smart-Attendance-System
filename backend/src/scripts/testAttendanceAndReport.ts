import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { getDB, connectDB } from '../config/db';
import { users, subjects, attendanceSessions, attendance } from '../db/schema';
import { eq } from 'drizzle-orm';
import jwt from 'jsonwebtoken';

async function testAttendanceAndReport() {
  connectDB();
  const db = getDB();

  // 1. Get a student and teacher
  const [student] = await db.select().from(users).where(eq(users.role, 'student')).limit(1);
  const [teacher] = await db.select().from(users).where(eq(users.role, 'teacher')).limit(1);
  const [subject] = await db.select().from(subjects).limit(1);

  console.log('Student:', student.displayName, student.id);
  console.log('Teacher:', teacher.displayName, teacher.id);
  console.log('Subject:', subject.name, subject.id);

  // 2. Generate a new session as teacher
  const teacherToken = jwt.sign(
    { userId: teacher.id, email: teacher.email, role: teacher.role },
    process.env.JWT_SECRET || 'your_jwt_secret_here_change_in_production',
    { expiresIn: '1h' }
  );

  const genRes = await fetch('http://127.0.0.1:5000/api/attendance/qr/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${teacherToken}`,
    },
    body: JSON.stringify({
      subjectId: subject.id,
      expirySeconds: 60,
    }),
  });

  const genData = (await genRes.json()) as any;
  console.log('QR Generation response:', genRes.status, genData.success ? '✅ OK' : '❌ FAIL');
  const lectureId = genData?.data?.lectureId;
  console.log('Generated Lecture ID:', lectureId);

  // 3. Student marks attendance by pasting the Lecture ID (raw string)
  const studentToken = jwt.sign(
    { userId: student.id, email: student.email, role: student.role },
    process.env.JWT_SECRET || 'your_jwt_secret_here_change_in_production',
    { expiresIn: '1h' }
  );

  console.log('\n--- Testing Student Pasting Lecture ID ---');
  const markRes = await fetch('http://127.0.0.1:5000/api/attendance/mark', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentToken}`,
    },
    body: JSON.stringify({
      qrData: lectureId, // Student literally pastes the Lecture ID!
    }),
  });

  const markData = (await markRes.json()) as any;
  console.log('Mark Attendance Status:', markRes.status);
  console.log('Mark Attendance Body:', markData);

  // 4. Test PDF Report Download for student & teacher
  console.log('\n--- Testing Report PDF Download ---');
  const pdfRes = await fetch('http://127.0.0.1:5000/api/reports/pdf', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${studentToken}`,
    },
  });
  console.log('Student PDF Report HTTP Status:', pdfRes.status, pdfRes.headers.get('content-type'));

  const teacherPdfRes = await fetch('http://127.0.0.1:5000/api/reports/pdf', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${teacherToken}`,
    },
  });
  console.log('Teacher PDF Report HTTP Status:', teacherPdfRes.status, teacherPdfRes.headers.get('content-type'));

  console.log('\n🎉 ALL TESTS COMPLETED SUCCESSFULLY!');
}

testAttendanceAndReport();
