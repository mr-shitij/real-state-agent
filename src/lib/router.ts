// lib/router.ts
/**
 * Central message-router for the multi-agent Real-Estate Assistant.
 *
 * -------------
 * If the payload contains an image → Issue-Detection agent.
 * Else, run a quick heuristic on the text to decide whether the
 * question is tenancy-related; otherwise ask the user to clarify.
 *
 * You can later swap the heuristic for an LLM-based classifier
 * (Gemini, OpenAI, etc.) by replacing the `decideByRegex` function.
 */

import { analyseIssue } from './agents/issueDetection';
import { answerFAQ }   from './agents/tenancyFAQ';
import { GenerateContentResponse, Content, Part } from '@google/generative-ai'; // Import necessary types from the library

// Helper to create a stream for the fallback message
async function* fallbackStream(): AsyncGenerator<GenerateContentResponse> {
  const fallbackText = `Could you provide more details?\n• For property issues, \nplease upload a photo.\n• For tenancy questions, mention rent, lease, \nor landlord context so I can help.`;
  
  // Construct a Part object
  const fallbackPart: Part = { text: fallbackText };
  // Construct a Content object (mimicking a candidate's content)
  const fallbackContent: Content = { role: 'model', parts: [fallbackPart] }; 

  // Yield a single GenerateContentResponse chunk mimicking the expected structure
  yield { 
    // Mimic the candidates array structure 
    candidates: [
      {
        content: fallbackContent,
        index: 0,
        // Add other required candidate properties if necessary (often optional)
        finishReason: 'STOP', 
        safetyRatings: [] 
      }
    ],
    // Mimic promptFeedback (optional, can be undefined)
    promptFeedback: undefined
  } as GenerateContentResponse;
  // No more chunks
}

/**
 * Main router.
 * Returns an async generator yielding response chunks.
 */
export async function route({
  text,
  base64Image,
  history
}: {
  text?: string;
  base64Image?: string;
  history: Content[];
}): Promise<AsyncGenerator<GenerateContentResponse>> { // Return type is now stream generator
  // 1. Image present → Issue-Detection agent stream
  if (base64Image) {
    return analyseIssue(base64Image, text, history);
  }

  // 2. No image, but text is present → Route to FAQ/Text Agent
  if (text) {
    // Always route text-only messages to answerFAQ
    return answerFAQ(text, history); 
  }

  // 3. No image and no text (should ideally not happen due to API checks) 
  //    OR if text-only routing needs a specific fallback 
  //    -> Return the fallback stream asking for details.
  console.warn("Router fallback: No image and no text provided, or unhandled case.");
  return fallbackStream(); 
}
