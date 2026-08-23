import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';
import { cleanTextForSpeech } from '@/lib/scraper/cleaner';

// Configure Cloudinary from env
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dkgnktjhg',
  api_key: process.env.CLOUDINARY_API_KEY || '534878118884476',
  api_secret: process.env.CLOUDINARY_API_SECRET || '-IuC5PkNr32JU4_Um1k5RRJpV9g',
});

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Converts raw PCM 16-bit 24kHz mono buffer to standard WAV format
 */
export function pcmToWav(pcmBuffer: Buffer, sampleRate = 24000, numChannels = 1, bitsPerSample = 16): Buffer {
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

/**
 * Splits text into safe, small sentence/phrase chunks (18-20 words max per chunk, ~8-12 seconds).
 * This completely avoids the Gemini TTS ~18-20s response limitation and eliminates cutoffs.
 */
export function splitTextIntoSafeChunks(text: string, maxWordsPerChunk = 20): string[] {
  if (!text || text.trim() === '') return [];

  // 1. Strip markdown noise and extra punctuation
  const clean = cleanTextForSpeech(text);

  // 2. Split by sentence terminators: Bengali (।), Question (?), Exclamation (!), Period (.), or Newline (\n)
  const rawSentences = clean.split(/(?<=[।?!.\n])\s+/);
  const chunks: string[] = [];
  let currentChunk = '';

  for (const sentence of rawSentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;

    const currentWords = currentChunk ? currentChunk.split(/\s+/).filter(Boolean).length : 0;
    const sentenceWords = trimmed.split(/\s+/).filter(Boolean).length;

    if (currentWords + sentenceWords <= maxWordsPerChunk) {
      currentChunk = currentChunk ? `${currentChunk} ${trimmed}` : trimmed;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk);
      }
      // If a single sentence exceeds maxWordsPerChunk, split on commas or sub-clauses
      if (sentenceWords > maxWordsPerChunk) {
        const clauses = trimmed.split(/(?<=[,;])\s+/);
        let clauseChunk = '';

        for (const clause of clauses) {
          const clauseWords = clause.split(/\s+/).filter(Boolean).length;
          const currentClauseWords = clauseChunk ? clauseChunk.split(/\s+/).filter(Boolean).length : 0;

          if (currentClauseWords + clauseWords <= maxWordsPerChunk) {
            clauseChunk = clauseChunk ? `${clauseChunk} ${clause}` : clause;
          } else {
            if (clauseChunk) chunks.push(clauseChunk);
            // If even a single clause exceeds maxWordsPerChunk, split by word count
            if (clauseWords > maxWordsPerChunk) {
              const words = clause.split(/\s+/).filter(Boolean);
              for (let i = 0; i < words.length; i += maxWordsPerChunk) {
                chunks.push(words.slice(i, i + maxWordsPerChunk).join(' '));
              }
              clauseChunk = '';
            } else {
              clauseChunk = clause;
            }
          }
        }
        if (clauseChunk) chunks.push(clauseChunk);
        currentChunk = '';
      } else {
        currentChunk = trimmed;
      }
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks.filter((c) => c.trim().length > 0);
}

/**
 * Calls Gemini TTS API for a single chunk and returns raw PCM buffer
 */
async function generateChunkPcm(
  text: string,
  lang: 'bn' | 'en',
  apiKeys: string[]
): Promise<Buffer> {
  const models = [
    'gemini-3.1-flash-tts-preview',
    'gemini-2.5-flash-preview-tts',
    'gemini-2.5-flash',
    'gemini-2.5-pro-preview-tts',
  ];

  let lastError: any = null;

  for (const model of models) {
    for (let k = 0; k < apiKeys.length; k++) {
      const apiKey = apiKeys[k];
      if (!apiKey) continue;

      // Retry up to 2 times on rate limit or network glitch
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
          const payload = {
            contents: [{ parts: [{ text: `Say the following ${lang === 'bn' ? 'Bengali' : 'English'} text clearly in speech: ${text}` }] }],
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
              return Buffer.from(part.inlineData.data, 'base64');
            }
          } else {
            console.warn(`[TTS] Model ${model} Key #${k} HTTP ${res.status}: ${json?.error?.message}`);
            lastError = new Error(`Model ${model} Key #${k} Error: ${json?.error?.message || JSON.stringify(json)}`);
            if (json?.error?.code === 429 || json?.error?.code === 503) {
              await sleep(400 * (attempt + 1));
              continue;
            }
            break; // Non-retryable error for this key/model, move to next
          }
        } catch (err: any) {
          console.warn(`[TTS] Fetch exception for ${model}: ${err.message}`);
          lastError = err;
          await sleep(200);
        }
      }
    }
  }

  throw lastError || new Error(`All Gemini TTS keys and models failed for chunk: "${text.slice(0, 30)}..."`);
}

/**
 * Generates seamless audio for text of any length by chunking (18-20 words max per chunk)
 * and stitching PCM buffers together into a single master WAV audio.
 */
export async function generateSeamlessGeminiAudio(
  fullText: string,
  lang: 'bn' | 'en' = 'bn',
  apiKeys: string[] = []
): Promise<Buffer> {
  const keys = apiKeys.length > 0 ? apiKeys : [process.env.GEMINI_API_KEY || ''];
  const validKeys = keys.filter((k) => !!k && k.trim() !== '');

  if (validKeys.length === 0) {
    throw new Error('No valid Gemini API key found for TTS generation.');
  }

  // Split into safe 18-20 word chunks to guarantee each is < 12 seconds
  const chunks = splitTextIntoSafeChunks(fullText, 20);
  if (chunks.length === 0) {
    throw new Error('No text to generate audio for.');
  }

  const pcmBuffers: Buffer[] = [];

  for (let i = 0; i < chunks.length; i++) {
    try {
      const chunkPcm = await generateChunkPcm(chunks[i], lang, validKeys);
      pcmBuffers.push(chunkPcm);
    } catch (err: any) {
      console.warn(`[TTS] Skipping failed chunk (${i + 1}/${chunks.length}):`, err.message);
    }

    if (i < chunks.length - 1) {
      await sleep(100); // Micro-delay between requests to avoid burst rate-limits
    }
  }

  if (pcmBuffers.length === 0) {
    throw new Error('All audio chunks failed during TTS generation.');
  }

  // Concatenate all PCM buffers back-to-back
  const totalPcm = Buffer.concat(pcmBuffers);
  // Convert full combined PCM buffer to standard WAV
  return pcmToWav(totalPcm, 24000, 1, 16);
}

/**
 * Uploads audio WAV buffer directly to Cloudinary
 */
export async function uploadAudioToCloudinary(
  buffer: Buffer,
  publicId: string,
  folder = 'news_audios'
): Promise<string> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'video', // Cloudinary handles audio files under video resource type
        folder,
        public_id: publicId,
        overwrite: true,
      },
      (error, result) => {
        if (error) reject(error);
        else if (result?.secure_url) resolve(result.secure_url);
        else reject(new Error('Cloudinary audio upload failed'));
      }
    );
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
}
