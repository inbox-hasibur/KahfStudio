import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateSeamlessGeminiAudio, uploadAudioToCloudinary } from '@/lib/audio/gemini-tts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

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

    // 2. Date, Weather & Intro
    const BANGLA_DAYS = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];
    const BANGLA_MONTHS = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
    const now = new Date();
    const day = BANGLA_DAYS[now.getDay()];
    const date = now.getDate();
    const month = BANGLA_MONTHS[now.getMonth()];
    const year = now.getFullYear();
    let intro = `আসসালামু আলাইকুম! আজ ${day}, ${date} ${month} ${year}। KahfStudio দৈনিক সংবাদ বুলেটিনে আপনাদের স্বাগত। আজকের আবহাওয়া অনুকূল। এখন শুনুন আজকের গুরুত্বপূর্ণ সংবাদ।`;
    let weatherData: any = { introText: intro, date: `${date} ${month} ${year}` };

    if (process.env.OPENWEATHER_API_KEY) {
      try {
        const weatherRes = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?q=Dhaka,BD&appid=${process.env.OPENWEATHER_API_KEY}&units=metric&lang=bn`,
          { cache: 'no-store' }
        );
        if (weatherRes.ok) {
          const wJson = await weatherRes.json();
          const temp = Math.round(wJson.main?.temp ?? 0);
          const desc = wJson.weather?.[0]?.description ?? '';
          intro = `আসসালামু আলাইকুম! আজ ${day}, ${date} ${month} ${year}। ঢাকায় বর্তমান তাপমাত্রা ${temp} ডিগ্রি সেলসিয়াস, ${desc}। এখন শুনুন আজকের গুরুত্বপূর্ণ সংবাদ।`;
          weatherData = { ...weatherData, temp, desc, introText: intro };
        }
      } catch (e) {
        console.warn('Direct weather fetch bypassed:', e);
      }
    }

    // 3. Fetch Top Important published news articles
    let articlesQuery = supabase
      .from('news_articles')
      .select('id, headline, ai_summary, category')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(10);

    const { data: articles, error: articlesError } = await articlesQuery;
    if (articlesError) throw articlesError;

    const topArticles = (articles || []).slice(0, 3);

    // 4. Assemble Full Podcast Script
    let podcastScript = `${intro}\n\n`;

    const ordinalWords = [
      'প্রথম সংবাদ', 'দ্বিতীয় সংবাদ', 'তৃতীয় সংবাদ'
    ];

    topArticles.forEach((art, index) => {
      const ordinal = ordinalWords[index] || `সংবাদ ${index + 1}`;
      let digest = art.headline;
      if (art.ai_summary) {
        const sentences = art.ai_summary.replace(/[*_#`[\]()]/g, ' ').split(/[।?!]\s*/).filter(Boolean);
        if (sentences.length > 0 && sentences[0].length > 10) {
          digest = `${art.headline}। ${sentences[0]}।`;
        }
      }
      podcastScript += `${ordinal}: ${digest}\n\n`;
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
