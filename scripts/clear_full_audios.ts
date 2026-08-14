import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function clearOldRoboticFullAudios() {
  console.log('Clearing old robotic google-tts full audio URLs from Supabase...');

  const { data, error } = await supabaseAdmin
    .from('news_articles')
    .update({
      audio_bn_full: null,
      audio_en_full: null,
    })
    .neq('id', '00000000-0000-0000-0000-000000000000'); // update all

  if (error) {
    console.error('Error clearing full audios:', error);
  } else {
    console.log('✓ Successfully set audio_bn_full and audio_en_full to NULL for all articles in Supabase.');
  }
}

clearOldRoboticFullAudios();
