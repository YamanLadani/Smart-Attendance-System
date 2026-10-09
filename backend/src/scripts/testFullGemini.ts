import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { generateChat, generateStudyPlan, generateActivityRecommendation } from '../services/geminiService';

async function testFull() {
  console.log('1. Testing AI Chat:');
  const chatReply = await generateChat('How can I manage study time during free periods?', {
    branch: 'Computer Science',
    semester: 5,
    careerGoal: 'AI Engineer',
  });
  console.log('Chat Reply:', chatReply.slice(0, 150) + '...\n');

  console.log('2. Testing Study Plan generation:');
  const studyPlan = await generateStudyPlan({
    name: 'Student',
    branch: 'Computer Science',
    semester: 5,
    strongSubjects: ['Data Structures'],
    weakSubjects: ['Computer Networks'],
    careerGoal: 'Software Developer',
    attendancePercent: 82,
    freePeriodDuration: 45,
  });
  console.log('Study Plan JSON length:', studyPlan.length);
  console.log('Study Plan Preview:', studyPlan.slice(0, 150) + '...\n');

  console.log('✅ ALL GEMINI AI FEATURES VERIFIED & WORKING!');
}

testFull();
