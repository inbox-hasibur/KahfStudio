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

    // 0. Parse country from body or query (BD, GLOBAL, UK, SA)
    let country = 'BD';
    try {
      const body = await req.json();
      if (body?.country) country = String(body.country).toUpperCase();
    } catch (e) {
      const { searchParams } = new URL(req.url);
      const qCountry = searchParams.get('country');
      if (qCountry) country = qCountry.toUpperCase();
    }

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
    const now = new Date();
    const BANGLA_DAYS = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];
    const BANGLA_MONTHS = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
    const ARABIC_DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const ARABIC_MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    const ENGLISH_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const ENGLISH_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    let weatherCity = 'Dhaka,BD';
    let weatherLang = 'bn';
    if (country === 'UK' || country === 'GLOBAL') {
      weatherCity = 'London,GB';
      weatherLang = 'en';
    } else if (country === 'SA') {
      weatherCity = 'Riyadh,SA';
      weatherLang = 'ar';
    }

    let temp = 28;
    let desc = 'Clear sky';
    if (country === 'BD') desc = 'পরিষ্কার আকাশ';
    if (country === 'SA') desc = 'سماء صافية';

    if (process.env.OPENWEATHER_API_KEY) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        const weatherRes = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?q=${weatherCity}&appid=${process.env.OPENWEATHER_API_KEY}&units=metric&lang=${weatherLang}`,
          { cache: 'no-store', signal: controller.signal }
        );
        clearTimeout(timeoutId);
        if (weatherRes.ok) {
          const wJson = await weatherRes.json();
          temp = Math.round(wJson.main?.temp ?? temp);
          desc = wJson.weather?.[0]?.description ?? desc;
        }
      } catch (e) {
        console.warn('Weather fetch bypassed:', e);
      }
    }

    // 3. Fetch Top Published news articles for requested Country
    let articlesQuery = supabase
      .from('news_articles')
      .select('id, headline, ai_summary, category, country')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(10);

    if (country === 'GLOBAL') {
      articlesQuery = articlesQuery.or('country.eq.GLOBAL,country.neq.BD');
    } else if (country === 'BD') {
      articlesQuery = articlesQuery.or('country.eq.BD,country.is.null');
    } else if (country === 'UK') {
      articlesQuery = articlesQuery.or('country.eq.UK,country.eq.GLOBAL');
    } else if (country === 'SA') {
      articlesQuery = articlesQuery.or('country.eq.SA,country.eq.GLOBAL');
    } else {
      articlesQuery = articlesQuery.eq('country', country);
    }

    const { data: articles, error: articlesError } = await articlesQuery;
    if (articlesError) throw articlesError;

    const topArticles = (articles || []).slice(0, 4);

    // 4. Assemble Full Podcast Script & TTS Language based on Country
    let podcastScript = '';
    let podcastTitle = '';
    let ttsLang: 'bn' | 'en' | 'ar' = 'bn';

    if (country === 'SA') {
      // Saudi Arabia — Arabic Narration
      ttsLang = 'ar';
      const arDate = `${now.getDate()} ${ARABIC_MONTHS[now.getMonth()]} ${now.getFullYear()}`;
      const arDay = ARABIC_DAYS[now.getDay()];
      podcastTitle = `النشرة الإخبارية اليومية (السعودية) - ${arDate}`;

      podcastScript = `السلام عليكم ورحمة الله وبركاته! مرحباً بكم في النشرة الإخبارية اليومية من KahfStudio للمملكة العربية السعودية. اليوم هو ${arDay}، ${arDate}. درجة الحرارة الحالية في الرياض تبلغ حوالي ${temp} درجة مئوية، والطقس ${desc}. إليكم أهم وأبرز الأخبار اليوم:\n\n`;

      const arOrdinals = ['الخبر الأول', 'الخبر الثاني', 'الخبر الثالث', 'الخبر الرابع'];
      topArticles.forEach((art, index) => {
        const ord = arOrdinals[index] || `الخبر ${index + 1}`;
        const summaryFirst = art.ai_summary ? art.ai_summary.split(/[.؟!\n]/)[0] : '';
        podcastScript += `${ord}: ${art.headline}۔ ${summaryFirst}\n\n`;
      });

      podcastScript += `هذه كانت أبرز عناوين الأخبار اليوم. شكراً لحسن استماعكم إلى KahfStudio، ودمتم في أمان الله ورعايته.`;

    } else if (country === 'UK' || country === 'GLOBAL') {
      // UK / Global — English Narration
      ttsLang = 'en';
      const enDate = `${ENGLISH_DAYS[now.getDay()]}, ${ENGLISH_MONTHS[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
      podcastTitle = `Daily News Bulletin (${country === 'UK' ? 'UK' : 'Global'}) - ${enDate}`;

      const regionName = country === 'UK' ? 'the United Kingdom' : 'Global News';
      podcastScript = `Hello and welcome to the KahfStudio Daily News Podcast for ${regionName}. Today is ${enDate}. Current temperature in London is ${temp} degrees Celsius, with ${desc}. Here are today's top stories:\n\n`;

      const enOrdinals = ['First story', 'Second story', 'Third story', 'Fourth story'];
      topArticles.forEach((art, index) => {
        const ord = enOrdinals[index] || `Story ${index + 1}`;
        const summaryFirst = art.ai_summary ? art.ai_summary.split(/[.!?\n]/)[0] : '';
        podcastScript += `${ord}: ${art.headline}. ${summaryFirst}.\n\n`;
      });

      podcastScript += `That concludes our daily audio bulletin. Stay tuned to KahfStudio for the latest breaking news and analysis. Have a wonderful day ahead!`;

    } else {
      // Bangladesh — Bengali Narration
      ttsLang = 'bn';
      const bnDate = `${now.getDate()} ${BANGLA_MONTHS[now.getMonth()]} ${now.getFullYear()}`;
      const bnDay = BANGLA_DAYS[now.getDay()];
      podcastTitle = `দৈনিক সংবাদ বুলেটিন (বাংলাদেশ) - ${bnDate}`;

      podcastScript = `আসসালামু আলাইকুম! আজ ${bnDay}, ${bnDate}। KahfStudio দৈনিক সংবাদ বুলেটিনে আপনাদের স্বাগত। ঢাকায় বর্তমান তাপমাত্রা প্রায় ${temp} ডিগ্রি সেলসিয়াস, আবহাওয়া ${desc}। এখন শুনুন আজকের গুরুত্বপূর্ণ সংবাদ:\n\n`;

      const bnOrdinals = ['প্রথম সংবাদ', 'দ্বিতীয় সংবাদ', 'তৃতীয় সংবাদ', 'চতুর্থ সংবাদ'];
      topArticles.forEach((art, index) => {
        const ord = bnOrdinals[index] || `সংবাদ ${index + 1}`;
        let digest = art.headline;
        if (art.ai_summary) {
          const sentences = art.ai_summary.replace(/[*_#`[\]()]/g, ' ').split(/[।?!]\s*/).filter(Boolean);
          if (sentences.length > 0 && sentences[0].length > 10) {
            digest = `${art.headline}। ${sentences[0]}।`;
          }
        }
        podcastScript += `${ord}: ${digest}\n\n`;
      });

      podcastScript += `এই ছিল আজকের গুরুত্বপূর্ণ সব সংবাদ। নিয়মিত তাজা সংবাদ পেতে KahfStudio-র সাথেই থাকুন। ধন্যবাদ ও শুভ দিন।`;
    }

    console.log(`[AI Podcast - ${country}] Synthesizing ${ttsLang} audio with Gemini 3.1 Flash...`);

    // 5. Generate Seamless Gemini Audio with fast 15s chunking
    const wavBuffer = await generateSeamlessGeminiAudio(podcastScript, ttsLang, keys);
    const publicId = `podcast_${country.toLowerCase()}_${Date.now()}`;
    const audioUrl = await uploadAudioToCloudinary(wavBuffer, publicId, 'podcasts');

    const durationSeconds = Math.round(wavBuffer.length / 48000);

    // 6. Save in podcast_archives
    const archiveType = `daily_bulletin_${country.toLowerCase()}`;
    const insertPayload: any = {
      archive_type: archiveType,
      title: podcastTitle,
      audio_url: audioUrl,
      duration: durationSeconds,
    };

    let savedPodcast: any = null;
    try {
      const { data, error } = await supabase
        .from('podcast_archives')
        .insert({ ...insertPayload, country })
        .select()
        .single();
      if (!error && data) savedPodcast = data;
    } catch (e) {
      const { data } = await supabase
        .from('podcast_archives')
        .insert(insertPayload)
        .select()
        .single();
      if (data) savedPodcast = data;
    }

    return NextResponse.json({
      success: true,
      data: {
        id: savedPodcast?.id,
        country,
        title: podcastTitle,
        audio_url: audioUrl,
        duration: durationSeconds,
        script: podcastScript,
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

// GET latest generated podcast (accepts ?country=BD|GLOBAL|UK|SA)
export async function GET(req: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { searchParams } = new URL(req.url);
    const country = (searchParams.get('country') || 'BD').toUpperCase();
    const archiveType = `daily_bulletin_${country.toLowerCase()}`;

    // Try finding country-specific podcast archive first
    let { data } = await supabase
      .from('podcast_archives')
      .select('*')
      .eq('archive_type', archiveType)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Fallback: If not found, check legacy 'daily_bulletin' or newest available podcast
    if (!data) {
      const fb = await supabase
        .from('podcast_archives')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      data = fb?.data;
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
