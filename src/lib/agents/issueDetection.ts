// lib/agents/issueDetection.ts
import { imageModel } from '../gemini';
import { GenerateContentResponse } from '@google/generative-ai'; // Import response type

export async function analyseIssue(
  base64Image: string,
  userText: string | undefined
): Promise<AsyncGenerator<GenerateContentResponse>> { // Return stream generator
  const prompt = `
    You are a property-maintenance expert.  
    1. List the most likely visible issues in the image.  
    2. Suggest practical troubleshooting steps.
    ${userText ? `\nUser note: "${userText}"` : ''}
    Format:
    **Issues:** • …  
    **Suggestions:** • …`;

  // Structure the parts array for multimodal input
  const parts = [
    { text: prompt },
    {
      inlineData: { 
        mimeType: 'image/jpeg', 
        data: base64Image 
      }
    }
  ];

  // Use generateContentStream
  const result = await imageModel.generateContentStream({
    contents: [{ role: 'user', parts }]
    // Add generationConfig if needed (e.g., temperature)
  });
  
  // Return the stream directly
  return result.stream;
}
