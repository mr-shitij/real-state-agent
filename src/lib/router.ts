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

// ------------- Utility: very light-weight text classification
function decideByRegex(text: string): 'tenancy' | 'unknown' {
  const tenancyPattern =
    /\b(rent|lease|deposit|tenant|landlord|evict|notice|agreement|vacate|contract|property\s+manager)\b/i;

  return tenancyPattern.test(text) ? 'tenancy' : 'unknown';
}

/**
 * Main router.
 * @param text        User-supplied text (may be undefined)
 * @param base64Image Image as Base-64 string (may be undefined)
 * @returns           A ready-to-display reply string
 */
export async function route({
  text,
  base64Image,
}: {
  text?: string;
  base64Image?: string;
}): Promise<string> {
  // 1. Image present → Issue-Detection agent (multimodal)
  if (base64Image) {
    return analyseIssue(base64Image, text);
  }

  // 2. No image, have text → try FAQ agent
  if (text) {
    const classification = decideByRegex(text);

    if (classification === 'tenancy') {
      return answerFAQ(text);
    }
  }

  // 3. Fallback: we're not sure — ask a clarifying question
  return `Could you provide more details?\n• For property issues, \
please upload a photo.\n• For tenancy questions, mention rent, lease, \
or landlord context so I can help.`;
}
