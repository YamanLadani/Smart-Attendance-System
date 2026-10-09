import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { GoogleGenerativeAI } from '@google/generative-ai';

async function testGemini() {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  console.log('─── Gemini API Key Check ───');
  console.log('API Key length:', apiKey ? apiKey.length : 0);
  console.log('API Key preview:', apiKey ? `${apiKey.slice(0, 8)}...${apiKey.slice(-4)}` : '(empty)');
  console.log('────────────────────────────');

  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    console.error('❌ Error: GEMINI_API_KEY is not set or still set to placeholder in backend/.env.');
    console.error('Please save your real Gemini API key in backend/.env.');
    return;
  }

  const ai = new GoogleGenerativeAI(apiKey);
  const models = ['gemini-3.6-flash', 'gemini-3.7-flash', 'gemini-3.5-flash', 'gemini-3.1-flash-lite'];

  for (const modelName of models) {
    try {
      console.log(`Testing model [${modelName}]...`);
      const model = ai.getGenerativeModel({ model: modelName });
      const result = await model.generateContent('Say "Gemini AI is connected and ready for Smart Attendance System!" in one sentence.');
      console.log(`✅ Success with [${modelName}]!`);
      console.log('Response:', result.response.text().trim());
      return;
    } catch (error: any) {
      console.warn(`⚠️ Model [${modelName}] failed:`, error?.message || error);
    }
  }
}

testGemini();
