import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { GoogleGenerativeAI } from '@google/generative-ai';

async function listModels() {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  
  try {
    const res = await fetch(url);
    const data = (await res.json()) as any;
    console.log('Available models for this API key:');
    if (data.models) {
      const generateModels = data.models
        .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
        .map((m: any) => m.name);
      console.log(generateModels);
    } else {
      console.log('Response:', data);
    }
  } catch (err: any) {
    console.error('Fetch error:', err.message || err);
  }
}

listModels();
