// lib/agents/tenancyFAQ.ts
import { textModel } from '../gemini';
import { Content, GenerateContentResponse } from '@google/generative-ai';

// System instruction for tenancy-law expertise
const systemInstruction: Content = {
  role: 'system',
  parts: [
    {
      text: `You are a tenancy-law assistant.
Give location-specific guidance when the user provides a city/country,
otherwise give general best-practice advice.
Answer briefly, link to authoritative sources when possible.`,
    },
  ],
};

export async function answerFAQ(question: string): Promise<AsyncGenerator<GenerateContentResponse>> {
  // Create user message
  const userMessage: Content = {
    role: 'user',
    parts: [{ text: question }]
  };
  
  // Use generateContentStream
  const result = await textModel.generateContentStream({
    contents: [systemInstruction, userMessage], 
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 800,
    }
  });
  
  // Return the stream directly
  return result.stream;
}
