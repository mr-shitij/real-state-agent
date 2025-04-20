// app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { route } from '@/lib/router';
import { GenerateContentResponse } from '@google/generative-ai';
// ReadableStream and TextEncoder are available globally in Node.js runtime on Vercel
  
export const runtime = 'nodejs'; // Keep Node.js runtime due to Buffer usage

// Helper function to convert Gemini stream to a ReadableStream
async function geminiStreamToReadableStream(
  geminiStream: AsyncGenerator<GenerateContentResponse>
): Promise<ReadableStream<Uint8Array>> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    async pull(controller) {
      try {
        const { value, done } = await geminiStream.next();
        if (done) {
          controller.close();
        } else {
          // Access text directly from value.candidates...
          const chunk = value?.candidates?.[0]?.content?.parts?.[0];
          const text = chunk?.text;
          
          if (text) { 
             controller.enqueue(encoder.encode(text));
          }
          // Handle potential finishReason (accessing directly from value)
          if (value?.promptFeedback?.blockReason) {
             console.warn("Stream blocked due to:", value.promptFeedback.blockReason);
             // Optionally enqueue an error message or close the stream
             // controller.enqueue(encoder.encode("[STREAM BLOCKED DUE TO SAFETY SETTINGS]"));
          } 
        }
      } catch (error) {
        console.error("Error reading from Gemini stream:", error);
        controller.error(error instanceof Error ? error : new Error('Failed to read from AI stream'));
      } 
    },
    cancel() {
      console.log("Stream cancelled by client.");
      // TODO: Implement logic to cancel the underlying Gemini stream if possible
    }
  });
}

export async function POST(req: NextRequest) {
  const contentType = req.headers.get('content-type') || '';
  let text: string | undefined;
  let base64Image: string | undefined;

  try {
    if (contentType.startsWith('multipart/form-data')) {
      // Use the FormData API to parse the multipart request
      const formData = await req.formData();
      
      // Get text from form data
      text = formData.get('text') as string | undefined;
      
      // Get image from form data
      const imageFile = formData.get('image') as File | undefined;
      
      if (imageFile) {
        // Convert the image file to base64
        const bytes = await imageFile.arrayBuffer();
        base64Image = Buffer.from(bytes).toString('base64');
      }
    } else if (contentType.startsWith('application/json')) {
      // Handle JSON payload
      const body = (await req.json()) as { text?: string; image?: string };
      text = body.text;
      base64Image = body.image;
    } else {
      // Handle unsupported content type
      console.warn(`Unsupported content type: ${contentType}`);
      return NextResponse.json({ error: `Unsupported content type: ${contentType}` }, { status: 415 });
    }

    // Ensure at least text or image is present
    if (!text && !base64Image) {
      console.warn('API call with no content');
      return NextResponse.json({ error: 'No content provided (text or image required)' }, { status: 400 });
    }

    // Call the router to get the response stream generator
    const geminiStreamGenerator = await route({ text, base64Image });

    // Convert the Gemini stream generator to a ReadableStream
    const readableStream = await geminiStreamToReadableStream(geminiStreamGenerator);

    // Return the stream in the response
    return new Response(readableStream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }, // Send as plain text stream
    });

  } catch (error: unknown) {
    console.error('API Route Error:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    const statusCode = 500;

    // Return JSON error for non-streaming errors
    return NextResponse.json(
      { error: { message, details: error instanceof Error ? error.toString() : String(error) } }, 
      { status: statusCode }
    );
  }
}
