import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function inspectFullAudios() {
  const { data, error } = await supabaseAdmin
    .from('news_articles')
    .select('id, headline, audio_bn_full, audio_en_full, audio_bn_summary, audio_en_summary');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Inspecting ${data?.length} articles:`);
  data?.forEach((a, i) => {
    console.log(`\n[${i + 1}] ID: ${a.id.slice(0, 8)}... | Headline: "${a.headline.slice(0, 35)}"`);
    console.log(`     BN Summary: ${a.audio_bn_summary || 'NULL'}`);
    console.log(`     BN Full:    ${a.audio_bn_full || 'NULL'}`);
    console.log(`     EN Summary: ${a.audio_en_summary || 'NULL'}`);
    console.log(`     EN Full:    ${a.audio_en_full || 'NULL'}`);
  });
}

inspectFullAudios();
