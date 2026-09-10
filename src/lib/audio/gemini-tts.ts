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

let currentWorkingKeyIndex = 0;

/**
 * Calls Gemini TTS API for a single chunk and returns raw PCM buffer
 */
async function generateChunkPcm(
  text: string,
  lang: 'bn' | 'en',
  apiKeys: string[],
  onLog?: (msg: string) => Promise<void> | void
): Promise<Buffer> {
  const models = [
    'gemini-3.1-flash-tts-preview', // Main Gemini TTS Voice Model
    'gemini-2.5-flash-preview-tts', // Robust Fallback Model
  ];

  let lastError: any = null;

  for (const model of models) {
    const keysToTry = apiKeys.filter((k) => !!k && k.trim().length > 0);
    const totalKeys = keysToTry.length;

    for (let attempt = 0; attempt < totalKeys; attempt++) {
      const k = (currentWorkingKeyIndex + attempt) % totalKeys;
      const apiKey = keysToTry[k];
      if (!apiKey) continue;

      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const payload = {
          contents: [{ parts: [{ text: `Read aloud the following text transcript exactly as written without any commentary:\n\n${text}` }] }],
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

        // 14-second fast per-key timeout: if this key hangs or rate limits, rotate immediately to next key
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 14000);

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        }).finally(() => clearTimeout(timeoutId));

        const json = await res.json();
        if (res.ok) {
          const candidate = json.candidates?.[0];
          const part = candidate?.content?.parts?.[0];
          if (part?.inlineData?.data) {
            currentWorkingKeyIndex = k; // Remember active key for fast subsequent calls
            return Buffer.from(part.inlineData.data, 'base64');
          }
          currentWorkingKeyIndex = (k + 1) % totalKeys;
          continue;
        } else {
          const errMsg = json?.error?.message || `HTTP ${res.status}`;
          console.warn(`[TTS] Model ${model} Key #${k + 1}/${totalKeys} HTTP ${res.status}: ${errMsg}`);
          if (onLog) {
            await onLog(`⚠️ Key #${k + 1} (${model}) ${res.status === 429 ? 'Rate Limited (429)' : 'Error'}. Rotating key...`);
          }
          lastError = new Error(`Model ${model} Key #${k + 1} Error: ${errMsg}`);
          currentWorkingKeyIndex = (k + 1) % totalKeys;
          continue;
        }
      } catch (err: any) {
        console.warn(`[TTS] Key #${k + 1}/${totalKeys} fetch exception: ${err.message}`);
        if (onLog) {
          await onLog(`⚠️ Key #${k + 1} timed out / exception (${err.message}). Rotating key...`);
        }
        lastError = err;
        currentWorkingKeyIndex = (k + 1) % totalKeys;
      }
    }
  }

  throw lastError || new Error(`All Gemini TTS keys and models failed for chunk: "${text.slice(0, 30)}..."`);
}

/**
 * Generates seamless audio for text of any length by chunking into ~15s segments
 * and stitching PCM buffers together into a single master WAV audio.
 */
export async function generateSeamlessGeminiAudio(
  fullText: string,
  lang: 'bn' | 'en' = 'bn',
  apiKeys: string[] = [],
  onLog?: (msg: string) => Promise<void> | void
): Promise<Buffer> {
  const keys = apiKeys.length > 0 ? apiKeys : [process.env.GEMINI_API_KEY || ''];
  const validKeys = keys.filter((k) => !!k && k.trim() !== '');

  if (validKeys.length === 0) {
    throw new Error('No valid Gemini API key found for TTS generation.');
  }

  const wordCount = fullText.split(/\s+/).filter(Boolean).length;
  
  // Optimization: If text is short (under 40 words / ~15s), synthesize in a single ultra-fast call
  if (wordCount <= 40) {
    const singlePcm = await generateChunkPcm(fullText, lang, validKeys, onLog);
    return pcmToWav(singlePcm, 24000, 1, 16);
  }

  // Split into safe ~15s chunks (~35-40 words per chunk)
  const chunks = splitTextIntoSafeChunks(fullText, 40);
  if (chunks.length === 0) {
    throw new Error('No text to generate audio for.');
  }

  const pcmBuffers: Buffer[] = [];
  for (let i = 0; i < chunks.length; i++) {
    try {
      const chunkPcm = await generateChunkPcm(chunks[i], lang, validKeys, onLog);
      pcmBuffers.push(chunkPcm);
    } catch (err: any) {
      console.warn(`[TTS] Skipping failed chunk (${i + 1}/${chunks.length}):`, err.message);
    }
  }

  if (pcmBuffers.length === 0) {
    throw new Error('All audio chunks failed during TTS generation.');
  }

  // Concatenate all 15s PCM chunks back-to-back seamlessly
  const totalPcm = Buffer.concat(pcmBuffers);
  // Convert full combined PCM buffer to standard 24kHz 16-bit Mono WAV
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
        resource_type: 'auto',
        folder,
        public_id: publicId,
        format: 'wav',
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
