import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function testTTSGeneration() {
  const { data } = await supabaseAdmin
    .from('system_settings')
    .select('setting_key, setting_value');

  const keysSetting = data?.find((s) => s.setting_key === 'global_gemini_api_keys');
  const keys = JSON.parse(keysSetting?.setting_value || '[]');
  const key = keys[0];

  console.log(`Using Key: ${key.slice(0, 8)}...`);

  const modelsToTry = [
    'gemini-3.1-flash-tts-preview',
    'gemini-2.5-flash-preview-tts',
    'gemini-2.5-flash-native-audio-latest',
    'gemini-2.0-flash',
  ];

  for (const model of modelsToTry) {
    console.log(`\n--- Trying model: ${model} ---`);
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
      const payload = {
        contents: [
          {
            parts: [
              {
                text: 'আসসালামু আলাইকুম। আজকের খবরের প্রধান শিরোনাম শুনুন।',
              },
            ],
          },
        ],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: 'Puck', // or Aoede, Kore, Fenrir, Charon
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
      if (!res.ok) {
        console.error(`Error for ${model}:`, JSON.stringify(json));
      } else {
        console.log(`✓ SUCCESS for ${model}!`);
        const candidate = json.candidates?.[0];
        const part = candidate?.content?.parts?.[0];
        if (part?.inlineData) {
          console.log(`MimeType: ${part.inlineData.mimeType}`);
          console.log(`Audio Base64 length: ${part.inlineData.data?.length || 0}`);
        } else {
          console.log('Response part structure:', JSON.stringify(part));
        }
        return { model, success: true };
      }
    } catch (e) {
      console.error(`Exception for ${model}:`, e);
    }
  }
}

testTTSGeneration();
