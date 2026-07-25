import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const { newsId, text } = await req.json();

    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    const ttsUrl = process.env.TTS_SERVICE_URL || 'http://localhost:8000';

    // TTS Service কে call করো
    const ttsRes = await fetch(
      `${ttsUrl}/generate`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text,
          voice: 'female',
          rate: '-5%'
        })
      }
    );

    if (!ttsRes.ok) {
      throw new Error('TTS service failed');
    }

    // Audio buffer নাও
    const audioBuffer = await ttsRes.arrayBuffer();
    const audioBase64 = Buffer.from(audioBuffer).toString('base64');

    // DB তে audioUrl update করো (newsId থাকলে)
    if (newsId) {
      const supabase = await createClient();
      await supabase
        .from('news_articles')
        .update({
          audio_url: `data:audio/mp3;base64,${audioBase64}`,
          audio_generated_at: new Date().toISOString()
        })
        .eq('id', newsId);
    }

    // Audio সরাসরি পাঠাও
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
      }
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
