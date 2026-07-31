import { NextRequest, NextResponse } from 'next/server';
import * as googleTTS from 'google-tts-api';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const text = searchParams.get('text');

    if (!text) {
      return new NextResponse('Text is required', { status: 400 });
    }

    // Split large text into chunks of 200 chars using googleTTS
    const chunks = googleTTS.getAllAudioUrls(text, {
      lang: 'bn',
      slow: false,
      host: 'https://translate.google.com',
    });

    const buffers = await Promise.all(
      chunks.map(async (chunk) => {
        const response = await fetch(chunk.url, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        });
        if (!response.ok) {
          throw new Error(`Google TTS failed with status ${response.status}`);
        }
        return response.arrayBuffer();
      })
    );

    // Concatenate all ArrayBuffers
    const totalLength = buffers.reduce((acc, curr) => acc + curr.byteLength, 0);
    const combinedBuffer = new Uint8Array(totalLength);
    let offset = 0;
    for (const buffer of buffers) {
      combinedBuffer.set(new Uint8Array(buffer), offset);
      offset += buffer.byteLength;
    }

    return new NextResponse(combinedBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error: any) {
    console.error('TTS Error:', error);
    return new NextResponse(error.message || 'TTS generation failed', { status: 500 });
  }
}
