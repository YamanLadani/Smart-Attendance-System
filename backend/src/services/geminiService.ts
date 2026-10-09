import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../config/env';
import { logger } from '../utils/logger';



interface StudentContext {
  name: string;
  branch: string;
  semester: number;
  strongSubjects: string[];
  weakSubjects: string[];
  careerGoal?: string;
  attendancePercent: number;
  upcomingExams?: string[];
  freePeriodDuration?: number; // in minutes
}

/**
 * Generate a personalized study plan during free periods using Gemini AI.
 */
export const generateStudyPlan = async (context: StudentContext): Promise<string> => {
  const prompt = `You are an AI academic advisor for engineering students. Generate a personalized study plan.

Student Profile:
- Name: ${context.name}
- Branch: ${context.branch}
- Semester: ${context.semester}
- Strong Subjects: ${context.strongSubjects.join(', ') || 'Not specified'}
- Weak Subjects: ${context.weakSubjects.join(', ') || 'Not specified'}
- Career Goal: ${context.careerGoal || 'Not specified'}
- Current Attendance: ${context.attendancePercent}%
- Upcoming Exams: ${context.upcomingExams?.join(', ') || 'None specified'}
- Available Free Time: ${context.freePeriodDuration || 45} minutes

Generate a structured response in JSON format with these fields:
{
  "dailyPlan": [{"time": "duration", "task": "description", "subject": "subject_name"}],
  "revisionTopics": ["topic1", "topic2", "topic3"],
  "practiceQuestions": [{"question": "question_text", "subject": "subject_name", "difficulty": "easy|medium|hard"}],
  "careerAdvice": "brief career advice based on their goal",
  "miniQuiz": [{"question": "q", "options": ["a","b","c","d"], "correct": 0, "explanation": "why"}],
  "motivationalQuote": "an inspiring quote",
  "timeManagementTips": ["tip1", "tip2", "tip3"]
}

Focus on weak subjects for revision, but include practice from strong subjects too.
If attendance is below 75%, emphasize attendance improvement.
Keep the plan achievable within the free period duration.
Return ONLY valid JSON, no markdown or extra text.`;

  return await callGemini(prompt);
};

/**
 * Generate revision topics for a specific subject.
 */
export const generateRevisionTopics = async (
  subject: string,
  semester: number,
  branch: string
): Promise<string> => {
  const prompt = `Generate a list of important revision topics for the subject "${subject}" 
  for semester ${semester}, ${branch} engineering branch.
  
  Return JSON: { "topics": [{"name": "topic", "importance": "high|medium|low", "estimatedTime": "30 mins"}] }
  Return ONLY valid JSON.`;

  return await callGemini(prompt);
};

/**
 * Generate a mini quiz for a subject.
 */
export const generateQuiz = async (
  subject: string,
  numQuestions: number = 5
): Promise<string> => {
  const prompt = `Generate ${numQuestions} multiple-choice quiz questions for the subject "${subject}" 
  suitable for engineering students.
  
  Return JSON: { "questions": [{"question": "q", "options": ["a","b","c","d"], "correct": 0, "explanation": "why"}] }
  Return ONLY valid JSON.`;

  return await callGemini(prompt);
};

/**
 * Free-form chat with AI academic advisor.
 */
export const generateChat = async (
  message: string,
  context: { branch?: string; semester?: number; careerGoal?: string }
): Promise<string> => {
  const prompt = `You are a helpful AI academic advisor named "StudyBuddy" for engineering students.
  
Student Context:
- Branch: ${context.branch || 'Not specified'}
- Semester: ${context.semester || 'Not specified'}
- Career Goal: ${context.careerGoal || 'Not specified'}

Student's Message: "${message}"

Provide a helpful, friendly, and detailed response. If the student asks about:
- Academics: Give specific study tips, explain concepts clearly
- Career: Give practical career advice, suggest resources
- Time management: Give actionable tips
- Motivation: Be encouraging and supportive
- General: Answer helpfully

Keep the response concise but thorough (max 300 words). Use bullet points where appropriate.
Do NOT return JSON — respond in natural language with markdown formatting.`;

  return await callGemini(prompt);
};

/**
 * Generate personalized activity recommendations based on free periods.
 */
export const generateActivityRecommendation = async (context: {
  name: string;
  branch: string;
  semester: number;
  freePeriodMinutes: number;
  strongSubjects: string[];
  weakSubjects: string[];
  careerGoal?: string;
  currentTime: string;
  recentActivities?: string[];
}): Promise<string> => {
  const prompt = `You are an AI advisor for engineering students. Generate personalized activity recommendations for a free period.

Student Profile:
- Name: ${context.name}
- Branch: ${context.branch}
- Semester: ${context.semester}
- Strong Subjects: ${context.strongSubjects.join(', ') || 'Not specified'}
- Weak Subjects: ${context.weakSubjects.join(', ') || 'Not specified'}
- Career Goal: ${context.careerGoal || 'Not specified'}
- Current Time: ${context.currentTime}
- Free Period Duration: ${context.freePeriodMinutes} minutes
- Recent Activities: ${context.recentActivities?.join(', ') || 'None'}

Generate 5-6 personalized activity recommendations as JSON:
{
  "recommendations": [
    {
      "title": "Activity title",
      "description": "Brief description",
      "duration": "15 mins",
      "category": "study|practice|career|health|social",
      "priority": "high|medium|low",
      "icon": "book|code|brain|heart|users|trophy"
    }
  ],
  "motivationalTip": "A brief motivational message",
  "productivityScore": 85
}

Mix activities across categories. Prioritize weak subjects but include breaks.
Return ONLY valid JSON, no markdown.`;

  return await callGemini(prompt);
};

function getGenAI(): GoogleGenerativeAI {
  const apiKey = (process.env.GEMINI_API_KEY || env.GEMINI_API_KEY || '').trim();
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    throw new Error('GEMINI_API_KEY is not configured. Please add a valid key to backend/.env');
  }
  return new GoogleGenerativeAI(apiKey);
}

/**
 * Core Gemini API call wrapper with model fallback & error handling.
 */
async function callGemini(prompt: string): Promise<string> {
  const models = [
    'gemini-3.6-flash',
    'gemini-3.7-flash',
    'gemini-3.5-flash',
    'gemini-3.1-flash-lite',
    'gemini-flash-latest',
  ];
  let lastError: any = null;

  const ai = getGenAI();

  for (const modelName of models) {
    try {
      const model = ai.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();
      logger.info(`Gemini API call successful using model [${modelName}]`);
      return text;
    } catch (error: any) {
      lastError = error;
      logger.warn(`Gemini model ${modelName} failed: ${error?.message || error}. Trying next model...`);
    }
  }

  logger.error('All Gemini model calls failed:', lastError);
  throw new Error(lastError?.message || 'Failed to generate AI content. Please check your Gemini API key.');
}
