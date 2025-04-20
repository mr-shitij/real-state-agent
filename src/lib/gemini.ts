// lib/gemini.ts
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Use correct model names from https://ai.google.dev/models/gemini
export const textModel = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
export const imageModel = textModel;  // 1.5-pro supports multimodal input
