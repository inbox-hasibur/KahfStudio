import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("Seeding data...");
  
  // Seed sources (Bangladesh & Global)
  const sources = [
    // Bangladesh Defaults
    { name: "Prothom Alo (RSS)", url: "https://www.prothomalo.com/feed", category: "General", country: "BD", is_active: true },
    { name: "BBC Bangla", url: "https://feeds.bbci.co.uk/bengali/rss.xml", category: "General", country: "BD", is_active: true },
    { name: "VOA Bangla", url: "https://www.voabangla.com/api/z--r-rymqv", category: "General", country: "BD", is_active: true },
    { name: "Daily Star", url: "https://www.thedailystar.net/frontpage/rss.xml", category: "General", country: "BD", is_active: true },
    { name: "Dhaka Tribune", url: "https://www.dhakatribune.com/feed", category: "General", country: "BD", is_active: true },
    { name: "Bdnews24 Bangla", url: "https://bangla.bdnews24.com/?widgetName=rssfeed&widgetId=1150&getXmlFeed=true", category: "General", country: "BD", is_active: true },
    { name: "Kaler Kantho", url: "https://www.kalerkantho.com/rss.xml", category: "General", country: "BD", is_active: true },

    // Global Defaults
    { name: "BBC News (World)", url: "http://bbci.co.uk", category: "World", country: "GLOBAL", is_active: true },
    { name: "Al Jazeera English", url: "https://aljazeera.com", category: "World", country: "GLOBAL", is_active: true },
    { name: "Reuters (World News)", url: "https://reutersagency.com", category: "World", country: "GLOBAL", is_active: true },
    { name: "CNN (Top Stories)", url: "http://cnn.com", category: "World", country: "GLOBAL", is_active: true },
    { name: "The New York Times (World)", url: "https://nytimes.com", category: "World", country: "GLOBAL", is_active: true },
    { name: "Associated Press (AP News)", url: "https://apnews.com", category: "World", country: "GLOBAL", is_active: true },
    { name: "Deutsche Welle (DW World)", url: "https://dw.com", category: "World", country: "GLOBAL", is_active: true }
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
