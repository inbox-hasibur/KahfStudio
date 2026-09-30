-- Seed verified news sources (BD, GLOBAL, UK, SA)
INSERT INTO public.scraping_sources (name, url, category, is_active, country)
VALUES
  ('Prothom Alo', 'https://www.prothomalo.com/feed', 'General', true, 'BD'),
  ('Daily Ittefaq', 'https://www.ittefaq.com.bd/feed/', 'General', true, 'BD'),
  ('BBC Bangla', 'https://feeds.bbci.co.uk/bengali/rss.xml', 'General', true, 'BD'),
  ('Channel i News', 'https://www.channelionline.com/feed/', 'General', true, 'BD'),
  ('BD24Live', 'https://www.bd24live.com/bangla/feed', 'General', true, 'BD'),
  ('Google News (Bangladesh)', 'https://news.google.com/rss?hl=bn&gl=BD&ceid=BD:bn', 'General', true, 'BD'),
  ('The Daily Star', 'https://www.thedailystar.net/frontpage/rss.xml', 'General', true, 'BD'),
  ('BBC News (World)', 'https://feeds.bbci.co.uk/news/world/rss.xml', 'General', true, 'GLOBAL'),
  ('Al Jazeera English', 'https://www.aljazeera.com/xml/rss/all.xml', 'General', true, 'GLOBAL'),
  ('The Guardian (World)', 'https://www.theguardian.com/world/rss', 'General', true, 'GLOBAL'),
  ('CNN (World)', 'http://rss.cnn.com/rss/edition_world.rss', 'General', true, 'GLOBAL'),
  ('The New York Times (World)', 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml', 'General', true, 'GLOBAL'),
  ('Deutsche Welle (DW World)', 'https://rss.dw.com/xml/rss-en-world', 'General', true, 'GLOBAL'),
  ('France 24 (World)', 'https://www.france24.com/en/rss', 'General', true, 'GLOBAL'),
  ('NPR News (World)', 'https://feeds.npr.org/1004/rss.xml', 'General', true, 'GLOBAL'),
  ('Google News (World)', 'https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGx1YlY4U0FtVnVHZ0pWVXlnQVAB?hl=en-US&gl=US&ceid=US:en', 'General', true, 'GLOBAL'),
  ('BBC News (UK)', 'https://feeds.bbci.co.uk/news/uk/rss.xml', 'General', true, 'UK'),
  ('The Guardian (UK)', 'https://www.theguardian.com/uk/rss', 'General', true, 'UK'),
  ('Sky News (UK)', 'https://feeds.skynews.com/feeds/rss/uk.xml', 'General', true, 'UK'),
  ('Google News (UK)', 'https://news.google.com/rss?hl=en-GB&gl=GB&ceid=GB:en', 'General', true, 'UK'),
  ('Evening Standard (UK)', 'https://www.standard.co.uk/news/uk/rss', 'General', true, 'UK'),
  ('Metro UK', 'https://metro.co.uk/news/feed/', 'General', true, 'UK'),
  ('Arab News (SA)', 'https://www.arabnews.com/rss.xml', 'General', true, 'SA'),
  ('Google News Saudi Arabia (Arabic)', 'https://news.google.com/rss?hl=ar&gl=SA&ceid=SA:ar', 'General', true, 'SA'),
  ('Sky News Arabia', 'https://www.skynewsarabia.com/web/rss', 'General', true, 'SA'),
  ('BBC Arabic', 'https://feeds.bbci.co.uk/arabic/rss.xml', 'General', true, 'SA'),
  ('France 24 (Arabic)', 'https://www.france24.com/ar/rss', 'General', true, 'SA'),
  ('DW Arabic (Deutsche Welle)', 'https://rss.dw.com/xml/rss-ar-all', 'General', true, 'SA')
ON CONFLICT (url) DO NOTHING;

-- Seed default system settings
INSERT INTO public.system_settings (setting_key, setting_value, description)
VALUES
  ('auto_approve_news', 'true', 'Automatically publish scraped news without admin review.'),
  ('evaluator_prompt', 'Respond YES if this is a valid news article. Respond NO if it is garbage, navigation links, or an error page.', 'Prompt for the Gemini Gatekeeper filter.'),
  ('synthesizer_prompt', 'Write a concise, engaging summary of this news article in Bangla, suitable for an audio podcast script.', 'Prompt for the Gemini Synthesis script generation.'),
  ('global_gemini_api_keys', '[]', 'JSON array of global Gemini API keys for the background scraper.')
ON CONFLICT (setting_key) DO NOTHING;
