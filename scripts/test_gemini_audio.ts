import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function testKeys() {
  const { data, error } = await supabaseAdmin
    .from('system_settings')
    .select('setting_key, setting_value');

  if (error) {
    console.error('Error fetching settings:', error);
    return;
  }

  const keysSetting = data?.find((s) => s.setting_key === 'global_gemini_api_keys');
  let keys: string[] = [];
  if (keysSetting?.setting_value) {
    try {
      keys = JSON.parse(keysSetting.setting_value);
    } catch (e) {
      console.error('JSON parse error:', e);
    }
  }

  console.log(`Found ${keys.length} Gemini API keys in Supabase system_settings.`);

  if (keys.length === 0 && process.env.GEMINI_API_KEY) {
    keys = [process.env.GEMINI_API_KEY];
  }

  if (keys.length === 0) {
    console.log('No Gemini keys found.');
    return;
  }

  // Test first key with Gemini 2.0 / 2.5
  const key = keys[0];
  console.log(`Testing first key (${key.slice(0, 8)}...)...`);

  // Let's test standard generateContent with audio configuration or REST
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
    const modelsData = await res.json();
    console.log('Available models count:', modelsData?.models?.length || 0);
    const audioOrTtsModels = modelsData?.models?.filter((m: any) => 
      m.name.includes('tts') || m.name.includes('audio') || m.name.includes('flash') || m.name.includes('2.0') || m.name.includes('2.5')
    ).map((m: any) => m.name);
    console.log('Relevant Models:', audioOrTtsModels);
  } catch (e) {
    console.error('Model fetch error:', e);
  }
}

testKeys();
