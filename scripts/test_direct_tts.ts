import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function testDirectTTS() {
  const { data } = await supabaseAdmin
    .from('system_settings')
    .select('setting_key, setting_value');

  const keysSetting = data?.find((s) => s.setting_key === 'global_gemini_api_keys');
  const keys = JSON.parse(keysSetting?.setting_value || '[]');
  const key = keys[0];

  const summaryText = "শাবনূরের সঙ্গে সালমানের প্রেম নিয়ে ৩০ বছর পর মুখ খুললেন নির্মাতা। তিনি জানান, সালমান-শাবনূর ছিলেন শুধুই ভালো বন্ধু এবং পর্দায় তাদের রসায়ন ছিল দারুণ প্রশংসনীয়।";

  console.log(`Testing direct text with key ${key.slice(0, 8)}...`);
  const t0 = Date.now();

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-tts-preview:generateContent?key=${key}`;
  const payload = {
    contents: [
      {
        parts: [
          {
            text: summaryText,
          },
        ],
      },
    ],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: 'Puck',
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
  const elapsed = (Date.now() - t0) / 1000;
  console.log(`Response received in ${elapsed}s, status: ${res.status}`);

  if (res.ok) {
    const candidate = json.candidates?.[0];
    const part = candidate?.content?.parts?.[0];
    console.log('Audio bytes base64:', part?.inlineData?.data?.length || 0);
  } else {
    console.error('Error:', json);
  }
}

testDirectTTS();
