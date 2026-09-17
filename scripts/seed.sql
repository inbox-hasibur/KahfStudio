-- Seed popular news sources
INSERT INTO public.scraping_sources (name, url, category, is_active, country)
VALUES
  ('Prothomalo', 'https://www.prothomalo.com/feed', 'General', true, 'BD'),
  ('The Daily Star', 'https://www.thedailystar.net/frontpage/rss.xml', 'General', true, 'BD'),
  ('JagoNews', 'https://www.jagonews24.com/rss/rss.xml', 'General', true, 'BD'),
  ('Banglanews24', 'https://www.banglanews24.com/rss/rss.xml', 'General', true, 'BD'),
  ('NTV News', 'https://www.ntvbd.com/feed', 'General', true, 'BD'),
  ('RTV News', 'https://www.rtvonline.com/feed', 'General', true, 'BD'),
  ('Channel i News', 'https://www.channelionline.com/feed/', 'General', true, 'BD'),
  ('BBC Bangla', 'https://feeds.bbci.co.uk/bengali/rss.xml', 'General', true, 'BD'),
  ('Barta24', 'https://barta24.com/feed', 'General', true, 'BD'),
  ('Risingbd', 'https://www.risingbd.com/rss/rss.xml', 'General', true, 'BD'),
  ('BD24Live', 'https://www.bd24live.com/bangla/feed', 'General', true, 'BD'),
  ('Bangladesh Journal', 'https://www.bd-journal.com/feed/', 'General', true, 'BD')
ON CONFLICT (url) DO NOTHING;

-- Seed default system settings
INSERT INTO public.system_settings (setting_key, setting_value, description)
VALUES
  ('auto_approve_news', 'true', 'Automatically publish scraped news without admin review.'),
  ('evaluator_prompt', 'Respond YES if this is a valid news article. Respond NO if it is garbage, navigation links, or an error page.', 'Prompt for the Gemini Gatekeeper filter.'),
  ('synthesizer_prompt', 'Write a concise, engaging summary of this news article in Bangla, suitable for an audio podcast script.', 'Prompt for the Gemini Synthesis script generation.'),
  ('global_gemini_api_keys', '[]', 'JSON array of global Gemini API keys for the background scraper.')
ON CONFLICT (setting_key) DO NOTHING;
