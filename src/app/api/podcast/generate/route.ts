import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateSeamlessGeminiAudio, uploadAudioToCloudinary } from '@/lib/audio/gemini-tts';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Read API keys from system_settings or env
    const { data: settingsData } = await supabase
      .from('system_settings')
      .select('setting_key, setting_value');

    const keysSetting = settingsData?.find((s) => s.setting_key === 'global_gemini_api_keys');
    let keys: string[] = [];
    if (keysSetting?.setting_value) {
      try {
        keys = JSON.parse(keysSetting.setting_value);
      } catch (e) {}
    }
    if (keys.length === 0 && process.env.GEMINI_API_KEY) {
      keys = [process.env.GEMINI_API_KEY];
    }

    // 2. Fetch Weather, Umbrella advice & Traffic
    const weatherRes = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/weather?city=Dhaka&country=BD`,
      { cache: 'no-store' }
    );
    let weatherData: any = {};
    if (weatherRes.ok) {
      const json = await weatherRes.json();
      weatherData = json.data || {};
    }

    // 3. Fetch Top 5 Important published news articles
    let articlesQuery = supabase
      .from('news_articles')
      .select('id, headline, ai_summary, category')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(10);

    const { data: articles, error: articlesError } = await articlesQuery;
    if (articlesError) throw articlesError;

    const topArticles = (articles || []).slice(0, 5);

    // 4. Assemble Full Podcast Script
    const intro = weatherData.introText || `আসসালামু আলাইকুম! KahfStudio দৈনিক সংবাদ বুলেটিনে আপনাদের স্বাগত।`;
    let podcastScript = `${intro}\n\n`;

    const ordinalWords = ['প্রথম সংবাদ', 'দ্বিতীয় সংবাদ', 'তৃতীয় সংবাদ', 'চতুর্থ সংবাদ', 'পঞ্চম সংবাদ'];

    topArticles.forEach((art, index) => {
      const ordinal = ordinalWords[index] || `সংবাদ ${index + 1}`;
      const summaryText = art.ai_summary || art.headline;
      podcastScript += `${ordinal}: ${art.headline}। ${summaryText}\n\n`;
    });

    podcastScript += `এই ছিল আজকের গুরুত্বপূর্ণ সব সংবাদ। নিয়মিত তাজা সংবাদ পেতে KahfStudio-র সাথেই থাকুন। ধন্যবাদ ও শুভ দিন।`;

    console.log('Generating AI Daily Podcast Audio...');

    // 5. Generate Seamless Gemini 3.1 Flash Audio (Unlimited length, safe 15s chunking)
    const wavBuffer = await generateSeamlessGeminiAudio(podcastScript, 'bn', keys);
    const publicId = `podcast_daily_${Date.now()}`;
    const audioUrl = await uploadAudioToCloudinary(wavBuffer, publicId, 'podcasts');

    // Calculate approximate duration in seconds (24kHz 16-bit mono = 48000 bytes/sec)
    const durationSeconds = Math.round(wavBuffer.length / 48000);

    // 6. Save in podcast_archives
    const { data: savedPodcast, error: saveError } = await supabase
      .from('podcast_archives')
      .insert({
        archive_type: 'daily_bulletin',
        title: `দৈনিক সংবাদ বুলেটিন - ${weatherData.date || new Date().toLocaleDateString('bn-BD')}`,
        audio_url: audioUrl,
        duration: durationSeconds,
      })
      .select()
      .single();

    if (saveError) {
      console.warn('Could not save to podcast_archives table:', saveError.message);
    }

    return NextResponse.json({
      success: true,
      data: {
        id: savedPodcast?.id,
        title: `দৈনিক সংবাদ বুলেটিন - ${weatherData.date || new Date().toLocaleDateString('bn-BD')}`,
        audio_url: audioUrl,
        duration: durationSeconds,
        script: podcastScript,
        weather: weatherData,
        topNewsCount: topArticles.length,
      }
    });

  } catch (error: any) {
    console.error('Podcast Generation Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate podcast' },
      { status: 500 }
    );
  }
}

// GET latest generated podcast
export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase
      .from('podcast_archives')
      .select('*')
      .eq('archive_type', 'daily_bulletin')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return NextResponse.json({
      success: true,
      podcast: data || null,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
