import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("Seeding data...");
  
  // Seed sources
  const sources = [
    { name: 'Prothom Alo', url: 'https://www.prothomalo.com/feed', category: 'General', is_active: true },
    { name: 'Jugantor', url: 'https://www.jugantor.com/feed', category: 'General', is_active: true },
    { name: 'Jamuna TV', url: 'https://www.jamuna.tv/feed', category: 'General', is_active: true },
  ];

  const { error: err1 } = await supabase.from('scraping_sources').insert(sources);
  if (err1) {
    if (err1.code === '23505') console.log("Sources already exist.");
    else console.error("Error inserting sources:", err1.message);
  } else {
    console.log("Sources seeded.");
  }

  // Seed settings
  const settings = [
    { setting_key: 'auto_approve_news', setting_value: 'true', description: 'Automatically publish scraped news without admin review.' },
    { setting_key: 'evaluator_prompt', setting_value: 'Respond YES if this is a valid news article. Respond NO if it is garbage, navigation links, or an error page.', description: 'Prompt for the Gemini Gatekeeper filter.' },
    { setting_key: 'synthesizer_prompt', setting_value: 'Write a concise, engaging summary of this news article in Bangla, suitable for an audio podcast script.', description: 'Prompt for the Gemini Synthesis script generation.' },
    { setting_key: 'global_gemini_api_keys', setting_value: '[]', description: 'JSON array of global Gemini API keys for the background scraper.' }
  ];

  const { error: err2 } = await supabase.from('system_settings').insert(settings);
  if (err2) {
    if (err2.code === '23505') console.log("Settings already exist.");
    else console.error("Error inserting settings:", err2.message);
  } else {
    console.log("Settings seeded.");
  }
}

main().catch(console.error);
