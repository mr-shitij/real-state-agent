// lib/agents/tenancyFAQ.ts
import { textModel } from '../gemini';
import { Content, GenerateContentResponse, Part } from '@google/generative-ai';

// --- Refined System Instruction --- 
const systemInstruction: Content = {
  // Use 'model' role for system-like instructions in multi-turn context
  role: 'model', 
  parts: [
    {
      text: `You are a helpful AI assistant specializing in tenancy law and procedures. Your goal is to provide clear, concise, and informative answers to user questions based on the provided conversation history and the current question.\n\n**Key Instructions:**\n1.  **Expertise:** Focus strictly on tenancy-related topics (leases, rent, deposits, eviction, landlord/tenant rights & responsibilities, etc.).\n2.  **Location:** If the user mentions a specific city, state, or country (or if it's clear from history), tailor your answer to that jurisdiction's general rules. If no location is provided, state that rules vary and give general best-practice advice or common principles.\n3.  **Clarity:** Explain potentially complex legal terms simply. Keep answers brief and to the point.\n4.  **Sources:** When possible and appropriate, suggest the *type* of authoritative source the user could consult (e.g., "local tenant rights organizations", "official government housing websites") but do not provide specific URLs unless you are highly certain of their validity and relevance.\n5.  **Disclaimer:** Always include a brief disclaimer: "This information is for general guidance only and does not constitute legal advice. Consult with a qualified legal professional or tenant advocacy group for advice specific to your situation."\n6.  **Tone:** Maintain a neutral, informative, and helpful tone.\n7.  **Limitations:** If a question is outside your expertise (not tenancy-related) or requires specific legal action/advice, state that you cannot help with that and recommend consulting a professional.`,
    },
  ],
};

export async function answerFAQ(
  question: string, 
  history: Content[] 
): Promise<AsyncGenerator<GenerateContentResponse>> { 
  const currentUserMessage: Content = { 
    role: 'user', 
    parts: [{ text: question }]
  };
  
  // Use system instruction correctly in multi-turn chat
  // For multi-turn, history often includes previous model instructions/responses
  // We might place the system instruction at the beginning of the history if not already there
  // Or rely on the model using the first message's context. Let's prepend it for clarity:
  const contents = [systemInstruction, ...history, currentUserMessage];

  const result = await textModel.generateContentStream({
    contents: contents, 
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 800,
    }
  });
  
  return result.stream;
}
