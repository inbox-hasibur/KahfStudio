import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import { generateSeamlessGeminiAudio, splitTextIntoSafeChunks } from '../src/lib/audio/gemini-tts';
import fs from 'fs';
import path from 'path';

async function testTts() {
  console.log("=== Testing Gemini 3.1 Flash TTS & Chunking Engine ===");

  const sampleBanglaNews = `আজকের প্রধান খবর: সারাদেশে তাপমাত্রা কমার সম্ভাবনা রয়েছে। আবহাওয়া অধিদপ্তর জানিয়েছে যে উত্তর-পূর্বাঞ্চলে হালকা থেকে মাঝারি ধরনের বৃষ্টিপাত হতে পারে। চট্টগ্রাম ও সিলেট বিভাগের অনেক জায়গায় অস্থায়ীভাবে দমকা হাওয়াসহ বৃষ্টি বা বজ্রসহ বৃষ্টি হতে পারে। এদিকে ঢাকাসহ পার্শ্ববর্তী এলাকায় আকাশ আংশিক মেঘলা থাকতে পারে। যাত্রীদের ছাতা সঙ্গে রাখার পরামর্শ দেওয়া হচ্ছে।`;

  console.log("\n1. Testing Text Chunking (splitTextIntoSafeChunks):");
  const chunks = splitTextIntoSafeChunks(sampleBanglaNews, 25);
  console.log(`Total Chunks Generated: ${chunks.length}`);
  chunks.forEach((chunk, index) => {
    console.log(`  [Chunk ${index + 1}] (${chunk.split(' ').length} words): "${chunk}"`);
  });

  console.log("\n2. Testing Seamless Audio Synthesis (gemini-3.1-flash-tts-preview):");
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("❌ ERROR: GEMINI_API_KEY environment variable is not set!");
    return;
  }

  console.log(`Using API Key starting with: ${apiKey.slice(0, 8)}...`);

  try {
    const start = Date.now();
    const wavBuffer = await generateSeamlessGeminiAudio(sampleBanglaNews, 'bn', [apiKey]);
    const duration = ((Date.now() - start) / 1000).toFixed(2);

    console.log(`\n✅ Audio Generation Successful!`);
    console.log(`   - Time Taken: ${duration}s`);
    console.log(`   - Output WAV Buffer Size: ${(wavBuffer.length / 1024).toFixed(2)} KB`);

    const scratchDir = path.join(__dirname, '../scratch');
    if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });
    
    const outputPath = path.join(scratchDir, 'test_output.wav');
    fs.writeFileSync(outputPath, wavBuffer);
    console.log(`   - Saved local test audio to: ${outputPath}`);

  } catch (err: any) {
    console.error("\n❌ Audio Generation Failed:", err.message);
  }
}

testTts();
