// app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { route } from '@/lib/router';
  
export const runtime = 'nodejs';

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

    // Call the router logic
    const reply = await route({ text, base64Image });
    return NextResponse.json({ reply });

  } catch (error: unknown) {
    console.error('API Route Error:', error);
    let errorMessage = 'An unexpected error occurred processing your request.';
    let statusCode = 500;

    if (error instanceof Error) {
      errorMessage = error.message;
    }

    // Return a structured error response
    return NextResponse.json(
      { 
        error: { 
          message: errorMessage, 
          details: error instanceof Error ? error.toString() : String(error) 
        } 
      }, 
      { status: statusCode }
    );
  }
}
