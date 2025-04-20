// lib/agents/issueDetection.ts
import { imageModel } from '../gemini';
import { GenerateContentResponse, Content, Part } from '@google/generative-ai'; // Import response type and Content type

export async function analyseIssue(
  base64Image: string,
  userText: string | undefined,
  history: Content[] // Add history parameter
): Promise<AsyncGenerator<GenerateContentResponse>> { // Return stream generator
  // --- Refined Prompt Engineering --- 
  const persona = "You are an AI assistant specializing in identifying potential residential property maintenance issues from images.";
  const task = "Your task is to analyze the provided image, along with any user notes and conversation history, to identify visible problems and suggest general troubleshooting steps.";
  const instructions = `
Key Instructions:
1.  **Identify Issues:** Based *only* on what is clearly visible in the image, list potential maintenance issues (e.g., mold, water stains, cracks, damaged fixtures, pests). Be specific but concise.
2.  **Suggest Steps:** For each identified issue, provide 1-2 practical, general troubleshooting suggestions or recommend the type of professional to contact (e.g., plumber, electrician, pest control). 
3.  **Context:** Consider the user\'s note (if provided) and the conversation history for relevant context.
4.  **Disclaimer:** Always include a brief disclaimer stating that this is a preliminary assessment and a professional inspection is recommended for accurate diagnosis and repairs.
5.  **Tone:** Maintain a helpful, informative, and cautious tone. Avoid definitive diagnoses.
`;
  const formatting = `
Output Format:
Follow this structure precisely:
**Issues:**
• [Issue 1 description]
• [Issue 2 description]
...

**Suggestions:**
• [Suggestion for Issue 1]
• [Suggestion for Issue 2]
...

**Disclaimer:** [Your brief disclaimer text here]
`;

  // Construct the final prompt text for the current message
  let finalPrompt = `${persona}\n${task}\n${instructions}\n`;
  if (userText) {
    finalPrompt += `User Note: \"${userText}\"\n`;
  }
  finalPrompt += formatting;
  
  // --- API Call Preparation --- 
  const currentUserParts: Part[] = [
    { text: finalPrompt }, // Use the constructed finalPrompt
    {
      inlineData: { 
        mimeType: 'image/jpeg', 
        data: base64Image 
      }
    }
  ];
  const currentUserMessage: Content = { role: 'user', parts: currentUserParts };
  const contents = [...history, currentUserMessage];

  // --- Generate Content Stream --- 
  const result = await imageModel.generateContentStream({ contents });
  
  return result.stream;
}