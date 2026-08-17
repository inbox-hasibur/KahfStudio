import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';

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
 * Splits text into ~15s sentence/phrase chunks (~25 to 35 words each)
 */
export function splitTextIntoSafeChunks(text: string, maxWordsPerChunk = 30): string[] {
  if (!text || text.trim() === '') return [];

  // Clean markdown noise & extra spaces
  const clean = text
    .replace(/[*_#`[\]()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Split by Bengali or English sentence terminators: ।, ?, !, ., or \n
  const rawSentences = clean.split(/(?<=[।?!.\n])\s+/);
  const chunks: string[] = [];
  let currentChunk = '';

  for (const sentence of rawSentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;

    const currentWords = currentChunk ? currentChunk.split(' ').length : 0;
    const sentenceWords = trimmed.split(' ').length;

    if (currentWords + sentenceWords <= maxWordsPerChunk) {
      currentChunk = currentChunk ? `${currentChunk} ${trimmed}` : trimmed;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk);
      }
      // If a single sentence is itself longer than maxWordsPerChunk, split by comma or word count
      if (sentenceWords > maxWordsPerChunk) {
        const words = trimmed.split(' ');
        for (let i = 0; i < words.length; i += maxWordsPerChunk) {
          chunks.push(words.slice(i, i + maxWordsPerChunk).join(' '));
        }
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
    'gemini-2.5-flash-native-audio-latest',
  ];

  let lastError: any = null;

  for (const model of models) {
    for (let k = 0; k < apiKeys.length; k++) {
      const apiKey = apiKeys[k];
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
            return Buffer.from(part.inlineData.data, 'base64');
          }
        } else {
          lastError = new Error(
            `Model ${model} Key #${k} Error: ${json?.error?.message || JSON.stringify(json)}`
          );
          if (json?.error?.code === 429 || json?.error?.code === 503) {
            await sleep(300);
            continue;
          }
        }
      } catch (err) {
        lastError = err;
      }
    }
  }

  throw lastError || new Error(`All Gemini TTS keys and models failed for chunk: "${text.slice(0, 30)}..."`);
}

/**
 * Generates seamless audio for text of any length by chunking and stitching PCM buffers
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

  const chunks = splitTextIntoSafeChunks(fullText, 30);
  if (chunks.length === 0) {
    throw new Error('No text to generate audio for.');
  }

  const pcmBuffers: Buffer[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunkPcm = await generateChunkPcm(chunks[i], lang, validKeys);
    pcmBuffers.push(chunkPcm);
    if (i < chunks.length - 1) {
      await sleep(150); // Safe micro-delay between chunks
    }
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
