import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { generateSeamlessGeminiAudio, uploadAudioToCloudinary } from '../src/lib/audio/gemini-tts';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function translateToEnglish(text: string): Promise<string> {
  if (!text || text.trim() === '') return '';
  try {
    const res = await fetch(
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=bn&tl=en&dt=t&q=${encodeURIComponent(text)}`
    );
    if (!res.ok) return text;
    const data = await res.json();
    if (Array.isArray(data) && Array.isArray(data[0])) {
      return data[0].map((item: any) => item[0]).join('');
    }
    return text;
  } catch (error) {
    return text;
  }
}

async function runGeminiAudioBatch() {
  console.log('=====================================================');
  console.log('KahfNews - Gemini 3.1 Flash Seamless TTS Audio Summary Generator');
  console.log('=====================================================');

  const { data: settingsData } = await supabaseAdmin
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

  console.log(`Loaded ${keys.length} Gemini API keys.`);

  const { data: articles, error } = await supabaseAdmin
    .from('news_articles')
    .select('id, headline, ai_summary')
    .order('created_at', { ascending: false });

  if (error || !articles || articles.length === 0) {
    console.error('No articles found:', error);
    process.exit(1);
  }

  console.log(`Processing ${articles.length} news articles for Gemini 3.1 Flash Summary Audio...\n`);

  let completedCount = 0;

  for (let idx = 0; idx < articles.length; idx++) {
    const article = articles[idx];
    const cleanSummary = (article.ai_summary || article.headline)
      .replace(/[*_#`[\]()]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    console.log(`\n[${idx + 1}/${articles.length}] "${article.headline.slice(0, 40)}..."`);

    try {
      // 1. Synthesize Bangla Summary with Gemini 3.1 Flash (No length limit, safe 15s chunking)
      console.log('  -> Generating Gemini 3.1 Flash Bangla Audio...');
      const bnWav = await generateSeamlessGeminiAudio(cleanSummary, 'bn', keys);
      const bnUrl = await uploadAudioToCloudinary(bnWav, `${article.id}_gemini_bn_summary`);
      console.log(`     ✓ BN Audio Cloudinary: ${bnUrl}`);

      // 2. Synthesize English Summary with Gemini 3.1 Flash
      console.log('  -> Translating & Generating Gemini 3.1 Flash English Audio...');
      const enSummary = await translateToEnglish(cleanSummary);
      const enWav = await generateSeamlessGeminiAudio(enSummary, 'en', keys);
      const enUrl = await uploadAudioToCloudinary(enWav, `${article.id}_gemini_en_summary`);
      console.log(`     ✓ EN Audio Cloudinary: ${enUrl}`);

      // 3. Update Supabase
      await supabaseAdmin
        .from('news_articles')
        .update({
          audio_bn_summary: bnUrl,
          audio_en_summary: enUrl,
        })
        .eq('id', article.id);

      completedCount++;
      console.log(`  ✓ Database updated with Gemini 3.1 Flash audio.`);
      await sleep(500); // polite pause between articles
    } catch (err: any) {
      console.error(`  ✗ Error on article ${article.id}:`, err?.message || err);
    }
  }

  console.log(`\n=====================================================`);
  console.log(`Batch complete! Successfully generated Gemini 3.1 Flash audio for ${completedCount}/${articles.length} articles.`);
  console.log(`=====================================================`);
}

runGeminiAudioBatch();
