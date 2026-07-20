import { GoogleGenerativeAI } from '@google/generative-ai';
import 'server-only'; // Ensure this runs only on the server

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is not configured. Please add GEMINI_API_KEY to your .env.local file.');
}

// Explicitly set apiVersion to 'v1'
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// For text-only input, use the gemini-pro model
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });

export async function getGeminiResponse(prompt: string): Promise<string | null> {
  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    return text;
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    return null;
  }
}
