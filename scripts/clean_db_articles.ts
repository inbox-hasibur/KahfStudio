import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { cleanJinaMarkdown } from '../src/lib/scraper/cleaner';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function cleanDatabaseArticles() {
  console.log("=== Scanning Database for Noisy Raw Content Articles ===");

  const { data: articles, error } = await supabaseAdmin
    .from('news_articles')
    .select('id, headline, raw_content');

  if (error) {
    console.error("Error fetching articles:", error.message);
    return;
  }

  console.log(`Loaded ${articles?.length || 0} total articles from database.`);

  let cleanedCount = 0;

  for (const article of articles || []) {
    const raw = article.raw_content || '';
    
    // Check if raw_content starts with website navigation menus or headers
    const hasNavJunk =
      raw.includes('অর্থনীতিশেয়ার বাজার') ||
      raw.includes('সারা বাংলাবরিশাল') ||
      raw.includes('সাতসতেরোঅন্য দুনিয়া') ||
      raw.includes('ক্যাম্পাসঢাকা বিশ্ববিদ্যালয়') ||
      raw.includes('বাংলা কনভার্টার') ||
      raw.includes('রাইজিংবিডি স্পেশাল') ||
      raw.includes('রবিউস সানি') ||
      raw.includes('Download Risingbd App') ||
      /^(জাতীয়|আন্তর্জাতিক|অর্থনীতি|রাজনীতি|খেলাধুলা)\s*$/m.test(raw.slice(0, 300));

    if (hasNavJunk) {
      const cleaned = cleanJinaMarkdown(raw, article.headline);
      if (cleaned && cleaned.length > 50 && cleaned !== raw) {
        const { error: updateErr } = await supabaseAdmin
          .from('news_articles')
          .update({ raw_content: cleaned })
          .eq('id', article.id);

        if (!updateErr) {
          cleanedCount++;
          console.log(`[Cleaned ${cleanedCount}] ${article.headline.slice(0, 50)}...`);
          console.log(`  Before: ${raw.length} chars -> After: ${cleaned.length} chars`);
        } else {
          console.warn(`Failed to update ${article.id}:`, updateErr.message);
        }
      }
    }
  }

  console.log(`\n✅ Finished! Successfully cleaned ${cleanedCount} articles in database.`);
}

cleanDatabaseArticles();
