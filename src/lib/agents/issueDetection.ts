// lib/agents/issueDetection.ts
import { imageModel } from '../gemini';

export async function analyseIssue(
  base64Image: string,
  userText: string | undefined
) {
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

  const res = await imageModel.generateContent({
    contents: [{ role: 'user', parts }]
  });
  
  return res.response.text();
}
