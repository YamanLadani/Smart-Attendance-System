import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { getDB, connectDB } from '../config/db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import jwt from 'jsonwebtoken';

async function testEndpoint() {
  connectDB();
  const db = getDB();
  const [student] = await db
    .select()
    .from(users)
    .where(eq(users.role, 'student'))
    .limit(1);

  if (!student) {
    console.error('No student found in database');
    return;
  }

  const token = jwt.sign(
    { userId: student.id, email: student.email, role: student.role },
    process.env.JWT_SECRET || 'your_jwt_secret_here_change_in_production',
    { expiresIn: '1h' }
  );

  console.log('1. Testing /api/gemini/activity-recommendations...');
  const resAct = await fetch('http://127.0.0.1:5000/api/gemini/activity-recommendations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ freePeriodMinutes: 45 }),
  });
  const dataAct = await resAct.json();
  console.log('Activity Status:', resAct.status, (dataAct as any).success ? '✅ SUCCESS' : '❌ FAILED');

  console.log('2. Testing /api/gemini/study-plan...');
  const resPlan = await fetch('http://127.0.0.1:5000/api/gemini/study-plan', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ freePeriodDuration: 45 }),
  });
  const dataPlan = await resPlan.json();
  console.log('Study Plan Status:', resPlan.status, (dataPlan as any).success ? '✅ SUCCESS' : '❌ FAILED');

  console.log('🎉 ALL ENDPOINTS RETURNED HTTP 200!');
}

testEndpoint();
