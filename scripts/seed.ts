import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("Seeding data...");
  
  // Seed sources (Bangladesh & Global)
  const sources = [
    // Bangladesh Defaults (12 Verified Outlets)
    { name: "Prothomalo", url: "https://www.prothomalo.com/feed", category: "General", country: "BD", is_active: true },
    { name: "The Daily Star", url: "https://www.thedailystar.net/frontpage/rss.xml", category: "General", country: "BD", is_active: true },
    { name: "JagoNews", url: "https://www.jagonews24.com/rss/rss.xml", category: "General", country: "BD", is_active: true },
    { name: "Banglanews24", url: "https://www.banglanews24.com/rss/rss.xml", category: "General", country: "BD", is_active: true },
    { name: "NTV News", url: "https://www.ntvbd.com/feed", category: "General", country: "BD", is_active: true },
    { name: "RTV News", url: "https://www.rtvonline.com/feed", category: "General", country: "BD", is_active: true },
    { name: "Channel i News", url: "https://www.channelionline.com/feed/", category: "General", country: "BD", is_active: true },
    { name: "BBC Bangla", url: "https://feeds.bbci.co.uk/bengali/rss.xml", category: "General", country: "BD", is_active: true },
    { name: "Barta24", url: "https://barta24.com/feed", category: "General", country: "BD", is_active: true },
    { name: "Risingbd", url: "https://www.risingbd.com/rss/rss.xml", category: "General", country: "BD", is_active: true },
    { name: "BD24Live", url: "https://www.bd24live.com/bangla/feed", category: "General", country: "BD", is_active: true },
    { name: "Bangladesh Journal", url: "https://www.bd-journal.com/feed/", category: "General", country: "BD", is_active: true },

    // Global Defaults
    { name: "BBC News (World)", url: "https://feeds.bbci.co.uk/news/world/rss.xml", category: "General", country: "GLOBAL", is_active: true },
    { name: "Al Jazeera English", url: "https://www.aljazeera.com/xml/rss/all.xml", category: "General", country: "GLOBAL", is_active: true },
    { name: "The Guardian (World)", url: "https://www.theguardian.com/world/rss", category: "General", country: "GLOBAL", is_active: true },
    { name: "CNN (World)", url: "http://rss.cnn.com/rss/edition_world.rss", category: "General", country: "GLOBAL", is_active: true },
    { name: "The New York Times (World)", url: "https://rss.nytimes.com/services/xml/rss/nyt/World.xml", category: "General", country: "GLOBAL", is_active: true },
    { name: "Deutsche Welle (DW World)", url: "https://rss.dw.com/xml/rss-en-world", category: "General", country: "GLOBAL", is_active: true },
    { name: "France 24 (World)", url: "https://www.france24.com/en/rss", category: "General", country: "GLOBAL", is_active: true },
    { name: "NPR News (World)", url: "https://feeds.npr.org/1004/rss.xml", category: "General", country: "GLOBAL", is_active: true },
    { name: "Reuters (World News - Web)", url: "https://www.reuters.com/world/", category: "General", country: "GLOBAL", is_active: true },
    { name: "Associated Press (AP News - Web)", url: "https://apnews.com/world-news", category: "General", country: "GLOBAL", is_active: true },
    { name: "Google News (World)", url: "https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGx1YlY4U0FtVnVHZ0pWVXlnQVAB?hl=en-US&gl=US&ceid=US:en", category: "General", country: "GLOBAL", is_active: true }
  ];

  for (const src of sources) {
    const { error: err1 } = await supabase.from('scraping_sources').insert(src);
    if (err1) {
      if (err1.code === '23505') console.log(`Source already exists: ${src.name}`);
      else console.error(`Error inserting ${src.name}:`, err1.message);
    } else {
      console.log(`Source seeded: ${src.name}`);
    }
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
