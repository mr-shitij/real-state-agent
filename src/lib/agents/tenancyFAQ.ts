// lib/agents/tenancyFAQ.ts
import { textModel } from '../gemini';

// System instruction for tenancy-law expertise
const systemInstruction = {
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

export async function answerFAQ(question: string) {
  // Create user message
  const userMessage = {
    role: 'user',
    parts: [{ text: question }]
  };
  
  // Generate content with proper format
  const res = await textModel.generateContent({
    contents: [userMessage],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 800,
    }
  });
  
  return res.response.text();
}
