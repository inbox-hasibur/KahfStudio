-- Seed popular news sources
INSERT INTO public.scraping_sources (name, url, category, is_active)
VALUES
  ('Prothom Alo (RSS)', 'https://www.prothomalo.com/feed', 'General', true),
  ('BBC Bangla', 'https://feeds.bbci.co.uk/bengali/rss.xml', 'General', true),
  ('VOA Bangla', 'https://www.voabangla.com/api/z--r-rymqv', 'General', true)
ON CONFLICT (url) DO NOTHING;

-- Seed default system settings
INSERT INTO public.system_settings (setting_key, setting_value, description)
VALUES
  ('auto_approve_news', 'true', 'Automatically publish scraped news without admin review.'),
  ('evaluator_prompt', 'Respond YES if this is a valid news article. Respond NO if it is garbage, navigation links, or an error page.', 'Prompt for the Gemini Gatekeeper filter.'),
  ('synthesizer_prompt', 'Write a concise, engaging summary of this news article in Bangla, suitable for an audio podcast script.', 'Prompt for the Gemini Synthesis script generation.'),
  ('global_gemini_api_keys', '[]', 'JSON array of global Gemini API keys for the background scraper.')
ON CONFLICT (setting_key) DO NOTHING;
