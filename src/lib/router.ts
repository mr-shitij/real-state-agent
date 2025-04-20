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
import { GenerateContentResponse } from '@google/generative-ai'; // Import type

// ------------- Utility: very light-weight text classification
function decideByRegex(text: string): 'tenancy' | 'unknown' {
  const tenancyPattern =
    /\b(rent|lease|deposit|tenant|landlord|evict|notice|agreement|vacate|contract|property\s+manager)\b/i;

  return tenancyPattern.test(text) ? 'tenancy' : 'unknown';
}

// Helper to create a stream for the fallback message
async function* fallbackStream(): AsyncGenerator<GenerateContentResponse> {
  const fallbackText = `Could you provide more details?\n• For property issues, \nplease upload a photo.\n• For tenancy questions, mention rent, lease, \nor landlord context so I can help.`;
  // Yield a single response chunk containing the fallback text
  yield { 
    response: Promise.resolve({ 
      text: () => fallbackText, 
      // Mock other properties if needed, though text() is the main one used later
      promptFeedback: undefined, 
      candidates: undefined 
    }) 
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
}: {
  text?: string;
  base64Image?: string;
}): Promise<AsyncGenerator<GenerateContentResponse>> { // Return type is now stream generator
  // 1. Image present → Issue-Detection agent stream
  if (base64Image) {
    return analyseIssue(base64Image, text);
  }

  // 2. No image, have text → try FAQ agent stream
  if (text) {
    const classification = decideByRegex(text);

    if (classification === 'tenancy') {
      return answerFAQ(text);
    }
  }

  // 3. Fallback: Return the fallback stream
  return fallbackStream();
}
