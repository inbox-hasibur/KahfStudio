import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

cloudinary.config({
  cloud_name: 'dkgnktjhg',
  api_key: '534878118884476',
  api_secret: '-IuC5PkNr32JU4_Um1k5RRJpV9g',
});

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function pcmToWav(pcmBuffer: Buffer, sampleRate = 24000, numChannels = 1, bitsPerSample = 16): Buffer {
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcmBuffer.length;
  const header = Buffer.alloc(44);

  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmBuffer]);
}

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

async function generateGeminiAudioWithFallback(
  text: string,
  lang: 'bn' | 'en',
  keys: string[]
): Promise<Buffer> {
  const models = [
    'gemini-3.1-flash-tts-preview',
    'gemini-2.5-flash-preview-tts',
    'gemini-2.5-flash-native-audio-latest',
  ];

  let lastError: any = null;

  for (const model of models) {
    for (let k = 0; k < keys.length; k++) {
      const apiKey = keys[k];
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const payload = {
          contents: [{ parts: [{ text }] }],
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: lang === 'bn' ? 'Puck' : 'Aoede',
                },
              },
            },
          },
        };

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const json = await res.json();
        if (res.ok) {
          const candidate = json.candidates?.[0];
          const part = candidate?.content?.parts?.[0];
          if (part?.inlineData?.data) {
            const rawPcm = Buffer.from(part.inlineData.data, 'base64');
            return pcmToWav(rawPcm, 24000, 1, 16);
          }
        } else {
          lastError = new Error(`Model ${model} Key #${k} Error: ${json?.error?.message || JSON.stringify(json)}`);
          if (json?.error?.code === 503) {
            await sleep(300);
            continue;
          }
        }
      } catch (err) {
        lastError = err;
      }
    }
  }

  throw lastError || new Error('All models and keys failed');
}

async function uploadToCloudinary(buffer: Buffer, publicId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'video',
        folder: 'news_audios',
        public_id: publicId,
        overwrite: true,
      },
      (error, result) => {
        if (error) reject(error);
        else if (result) resolve(result.secure_url);
        else reject(new Error('Upload failed'));
      }
    );
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
}

async function runGeminiAudioBatch() {
  console.log('=====================================================');
  console.log('KahfNews - Gemini 3.1 Flash TTS Audio Summary Generator');
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
      .trim()
      .slice(0, 260); // Snappy concise radio news summary

    console.log(`\n[${idx + 1}/${articles.length}] "${article.headline.slice(0, 40)}..."`);

    try {
      // 1. Synthesize Bangla Summary with Gemini 3.1 Flash
      console.log('  -> Generating Gemini 3.1 Flash Bangla Audio...');
      const bnWav = await generateGeminiAudioWithFallback(cleanSummary, 'bn', keys);
      const bnUrl = await uploadToCloudinary(bnWav, `${article.id}_gemini_bn_summary`);
      console.log(`     ✓ BN Audio Cloudinary: ${bnUrl}`);

      // 2. Synthesize English Summary with Gemini 3.1 Flash
      console.log('  -> Translating & Generating Gemini 3.1 Flash English Audio...');
      const enSummary = await translateToEnglish(cleanSummary);
      const enWav = await generateGeminiAudioWithFallback(enSummary, 'en', keys);
      const enUrl = await uploadToCloudinary(enWav, `${article.id}_gemini_en_summary`);
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
