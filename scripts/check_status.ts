import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function checkArticleStatus() {
  const { data, error } = await supabaseAdmin
    .from('news_articles')
    .select('id, headline, status, audio_bn_summary, audio_en_summary');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Found ${data?.length} articles total.`);
  data?.forEach((a) => {
    console.log(`ID: ${a.id.slice(0, 8)} | Status: "${a.status}" | Has BN Audio: ${!!a.audio_bn_summary} | Headline: ${a.headline.slice(0, 35)}`);
  });
}

checkArticleStatus();
