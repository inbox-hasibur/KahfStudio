import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import * as googleTTS from 'google-tts-api';
import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

// Setup Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Setup Cloudinary
cloudinary.config({
  cloud_name: 'dkgnktjhg',
  api_key: '534878118884476',
  api_secret: '-IuC5PkNr32JU4_Um1k5RRJpV9g',
});

// Helper: Sleep
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper: Translate Bengali to English using Google Translate API
async function translateToEnglish(text: string): Promise<string> {
  if (!text || text.trim() === '') return '';
  try {
    const trimmed = text.slice(0, 3000);
    const res = await fetch(
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(trimmed)}`
    );
    if (!res.ok) return text;
    const data = await res.json();
    if (Array.isArray(data) && Array.isArray(data[0])) {
      return data[0].map((item: any) => item[0]).join('');
    }
    return text;
  } catch (error) {
    console.warn('Translation error, using fallback:', error);
    return text;
  }
}

// Helper: Generate Audio Buffer using Google TTS with retry & throttling
async function generateAudioBuffer(text: string, lang: string): Promise<Buffer> {
  const cleanText = text.replace(/[*_#`[\]()]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 3500);
  if (!cleanText) {
    return Buffer.from('');
  }

  const chunks = googleTTS.getAllAudioUrls(cleanText, {
    lang: lang,
    slow: false,
    host: 'https://translate.google.com',
  });

  const buffers: ArrayBuffer[] = [];

  for (const chunk of chunks) {
    let attempts = 0;
    let success = false;
    let lastErr = null;

    while (attempts < 3 && !success) {
      try {
        attempts++;
        const response = await fetch(chunk.url, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          },
        });
        if (response.ok) {
          const ab = await response.arrayBuffer();
          buffers.push(ab);
          success = true;
        } else {
          lastErr = new Error(`TTS Status ${response.status}`);
          await sleep(500);
        }
      } catch (err) {
        lastErr = err;
        await sleep(500);
      }
    }

    if (!success) {
      throw lastErr || new Error('Failed to fetch TTS audio chunk');
    }

    await sleep(80); // brief delay to prevent burst rate limit
  }

  const totalLength = buffers.reduce((acc, curr) => acc + curr.byteLength, 0);
  const combinedBuffer = new Uint8Array(totalLength);
  let offset = 0;
  for (const buffer of buffers) {
    combinedBuffer.set(new Uint8Array(buffer), offset);
    offset += buffer.byteLength;
  }
  return Buffer.from(combinedBuffer);
}

// Helper: Upload to Cloudinary
async function uploadAudioToCloudinary(
  buffer: Buffer,
  filename: string,
  folder: string = 'news_audios'
): Promise<string> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'video',
        folder: folder,
        public_id: filename,
        format: 'mp3',
        overwrite: true,
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else if (result) {
          resolve(result.secure_url);
        } else {
          reject(new Error('Unknown upload error'));
        }
      }
    );
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
}

// Main processing function for all articles
async function processAllNewsAudios() {
  console.log('--- KahfNews AI Gemini 3.1 Flash TTS Audio Batch Generator ---');
  console.log('Fetching articles missing audio...');

  // Fetch articles where any of the 4 audio columns are null
  const { data: articles, error } = await supabaseAdmin
    .from('news_articles')
    .select('id, headline, raw_content, ai_summary, audio_bn_summary, audio_en_summary')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error fetching articles from Supabase:', error);
    process.exit(1);
  }

  if (!articles || articles.length === 0) {
    console.log('No articles found.');
    process.exit(0);
  }

  console.log(`Found ${articles.length} articles to check & process.`);
  let processedCount = 0;

  for (const article of articles) {
    const needsAudio = !article.audio_bn_summary || !article.audio_en_summary;

    if (!needsAudio) {
      console.log(`✓ Article ${article.id.slice(0, 8)} already has audio. Skipping.`);
      continue;
    }

    console.log(`\n▶ Processing [${article.headline.slice(0, 45)}...] (ID: ${article.id})`);

    try {
      const bnSummaryText = article.ai_summary || article.headline;
      const bnFullText = article.raw_content || article.headline;

      // 1. Bengali Summary Audio
      console.log('  1/4 Generating Bengali Summary TTS...');
      const bnSummaryBuf = await generateAudioBuffer(bnSummaryText, 'bn');
      const bnSummaryUrl = await uploadAudioToCloudinary(bnSummaryBuf, `${article.id}_bn_summary`);

      // 2. Bengali Full Text Audio
      console.log('  2/4 Generating Bengali Full Story TTS...');
      const bnFullBuf = await generateAudioBuffer(bnFullText, 'bn');
      const bnFullUrl = await uploadAudioToCloudinary(bnFullBuf, `${article.id}_bn_full`);

      // 3. Translate to English for English Audio
      console.log('  Translating content to English...');
      const enSummaryText = await translateToEnglish(bnSummaryText);
      const enFullText = await translateToEnglish(bnFullText);

      // 4. English Summary Audio
      console.log('  3/4 Generating English Summary TTS...');
      const enSummaryBuf = await generateAudioBuffer(enSummaryText, 'en');
      const enSummaryUrl = await uploadAudioToCloudinary(enSummaryBuf, `${article.id}_en_summary`);

      // 5. English Full Text Audio
      console.log('  4/4 Generating English Full Story TTS...');
      const enFullBuf = await generateAudioBuffer(enFullText, 'en');
      const enFullUrl = await uploadAudioToCloudinary(enFullBuf, `${article.id}_en_full`);

      // 6. Update Database
      console.log('  Saving Cloudinary URLs to Supabase...');
      const { error: updateError } = await supabaseAdmin
        .from('news_articles')
        .update({
          audio_bn_summary: bnSummaryUrl,
          audio_bn_full: bnFullUrl,
          audio_en_summary: enSummaryUrl,
          audio_en_full: enFullUrl,
        })
        .eq('id', article.id);

      if (updateError) {
        console.error('  Failed to update DB for article:', updateError);
      } else {
        processedCount++;
        console.log(`  ✓ Successfully updated 4 audio channels for ${article.id}`);
      }

      await sleep(300); // polite interval
    } catch (e: any) {
      console.error(`  ✗ Error processing article ${article.id}:`, e?.message || e);
    }
  }

  console.log(`\n========================================`);
  console.log(`Batch complete! Successfully processed ${processedCount} articles.`);
  console.log(`========================================`);
}

processAllNewsAudios();
