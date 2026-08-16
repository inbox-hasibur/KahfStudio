import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function verifyArticles() {
  const { data: articles, error } = await supabaseAdmin
    .from('news_articles')
    .select('id, headline, audio_bn_summary, audio_en_summary')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Total Articles in Supabase: ${articles?.length || 0}`);
  let countBN = 0;
  let countEN = 0;

  articles?.forEach((a, idx) => {
    const hasBN = !!a.audio_bn_summary;
    const hasEN = !!a.audio_en_summary;
    if (hasBN) countBN++;
    if (hasEN) countEN++;
    console.log(`[${idx + 1}] ID: ${a.id.slice(0, 8)}... | BN: ${hasBN ? '✓ YES' : '✗ NO'} | EN: ${hasEN ? '✓ YES' : '✗ NO'} | Headline: "${a.headline.slice(0, 40)}"`);
    if (hasBN) console.log(`     BN URL: ${a.audio_bn_summary}`);
    if (hasEN) console.log(`     EN URL: ${a.audio_en_summary}`);
  });

  console.log(`\nSummary: ${countBN} BN Summaries & ${countEN} EN Summaries ready.`);
}

verifyArticles();
