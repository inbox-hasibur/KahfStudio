import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("Seeding data...");
  
  // Seed sources (Bangladesh, Global, UK, and Saudi Arabia / Middle East)
  const sources = [
    // Bangladesh Defaults (7 Tested & Active Outlets)
    { name: "Prothom Alo", url: "https://www.prothomalo.com/feed", category: "General", country: "BD", is_active: true },
    { name: "Daily Ittefaq", url: "https://www.ittefaq.com.bd/feed/", category: "General", country: "BD", is_active: true },
    { name: "BBC Bangla", url: "https://feeds.bbci.co.uk/bengali/rss.xml", category: "General", country: "BD", is_active: true },
    { name: "Channel i News", url: "https://www.channelionline.com/feed/", category: "General", country: "BD", is_active: true },
    { name: "BD24Live", url: "https://www.bd24live.com/bangla/feed", category: "General", country: "BD", is_active: true },
    { name: "Google News (Bangladesh)", url: "https://news.google.com/rss?hl=bn&gl=BD&ceid=BD:bn", category: "General", country: "BD", is_active: true },
    { name: "The Daily Star", url: "https://www.thedailystar.net/frontpage/rss.xml", category: "General", country: "BD", is_active: true },

    // Global Defaults (9 Tested & Active Outlets)
    { name: "BBC News (World)", url: "https://feeds.bbci.co.uk/news/world/rss.xml", category: "General", country: "GLOBAL", is_active: true },
    { name: "Al Jazeera English", url: "https://www.aljazeera.com/xml/rss/all.xml", category: "General", country: "GLOBAL", is_active: true },
    { name: "The Guardian (World)", url: "https://www.theguardian.com/world/rss", category: "General", country: "GLOBAL", is_active: true },
    { name: "CNN (World)", url: "http://rss.cnn.com/rss/edition_world.rss", category: "General", country: "GLOBAL", is_active: true },
    { name: "The New York Times (World)", url: "https://rss.nytimes.com/services/xml/rss/nyt/World.xml", category: "General", country: "GLOBAL", is_active: true },
    { name: "Deutsche Welle (DW World)", url: "https://rss.dw.com/xml/rss-en-world", category: "General", country: "GLOBAL", is_active: true },
    { name: "France 24 (World)", url: "https://www.france24.com/en/rss", category: "General", country: "GLOBAL", is_active: true },
    { name: "NPR News (World)", url: "https://feeds.npr.org/1004/rss.xml", category: "General", country: "GLOBAL", is_active: true },
    { name: "Google News (World)", url: "https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGx1YlY4U0FtVnVHZ0pWVXlnQVAB?hl=en-US&gl=US&ceid=US:en", category: "General", country: "GLOBAL", is_active: true },

    // UK Defaults (6 Tested & Active Outlets)
    { name: "BBC News (UK)", url: "https://feeds.bbci.co.uk/news/uk/rss.xml", category: "General", country: "UK", is_active: true },
    { name: "The Guardian (UK)", url: "https://www.theguardian.com/uk/rss", category: "General", country: "UK", is_active: true },
    { name: "Sky News (UK)", url: "https://feeds.skynews.com/feeds/rss/uk.xml", category: "General", country: "UK", is_active: true },
    { name: "Google News (UK)", url: "https://news.google.com/rss?hl=en-GB&gl=GB&ceid=GB:en", category: "General", country: "UK", is_active: true },
    { name: "Evening Standard (UK)", url: "https://www.standard.co.uk/news/uk/rss", category: "General", country: "UK", is_active: true },
    { name: "Metro UK", url: "https://metro.co.uk/news/feed/", category: "General", country: "UK", is_active: true },

    // Saudi Arabia / Middle East Defaults (6 Tested & Active Outlets)
    { name: "Arab News (SA)", url: "https://www.arabnews.com/rss.xml", category: "General", country: "SA", is_active: true },
    { name: "Google News Saudi Arabia (Arabic)", url: "https://news.google.com/rss?hl=ar&gl=SA&ceid=SA:ar", category: "General", country: "SA", is_active: true },
    { name: "Sky News Arabia", url: "https://www.skynewsarabia.com/web/rss", category: "General", country: "SA", is_active: true },
    { name: "BBC Arabic", url: "https://feeds.bbci.co.uk/arabic/rss.xml", category: "General", country: "SA", is_active: true },
    { name: "France 24 (Arabic)", url: "https://www.france24.com/ar/rss", category: "General", country: "SA", is_active: true },
    { name: "DW Arabic (Deutsche Welle)", url: "https://rss.dw.com/xml/rss-ar-all", category: "General", country: "SA", is_active: true }
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
