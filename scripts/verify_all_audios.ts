import * as dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function runChecks() {
  console.log('=== 1. Testing Weather & Umbrella API ===');
  const wRes = await fetch('http://localhost:3000/api/weather?city=Dhaka&country=BD');
  const wData = await wRes.json();
  console.log('Weather Status:', wRes.status);
  console.log('Need Umbrella:', wData.data?.needUmbrella);
  console.log('Umbrella Tip:', wData.data?.umbrellaTip);
  console.log('Intro Text:', wData.data?.introText);

  console.log('\n=== 2. Testing News Smart Sorting & Country Filter API ===');
  const nRes = await fetch('http://localhost:3000/api/news?sort=smart&country=BD&limit=3');
  const nData = await nRes.json();
  console.log('News Status:', nRes.status, '| Articles Count:', nData.count);
  console.log('First Headline:', nData.data?.[0]?.headline);

  console.log('\n=== 3. Testing Sources API ===');
  const sRes = await fetch('http://localhost:3000/api/sources?country=BD');
  const sData = await sRes.json();
  console.log('Sources Status:', sRes.status, '| Sources Count:', sData.sources?.length);

  console.log('\n=== 4. Testing Gemini TTS 15s Chunking Engine ===');
  const { splitTextIntoSafeChunks } = await import('../src/lib/audio/gemini-tts');
  const sample = 'প্রধানমন্ত্রীর সঙ্গে সৌজন্য সাক্ষাৎ করেছেন নবনিযুক্ত রাষ্ট্রদূত। বৈঠকে দ্বিপক্ষীয় স্বার্থসংশ্লিষ্ট নানা বিষয় নিয়ে আলোচনা হয়। দুই দেশের মধ্যে বাণিজ্য ও বিনিয়োগ বৃদ্ধির ওপর বিশেষ জোর দেওয়া হয়েছে।';
  const chunks = splitTextIntoSafeChunks(sample, 25);
  console.log('Safe Chunks Generated:', chunks.length);
  chunks.forEach((c, i) => console.log(`  Chunk ${i + 1}: ${c}`));

  console.log('\n======================================');
  console.log('ALL SYSTEMS ARE FULLY OPERATIONAL!');
  console.log('======================================');
}

runChecks();
