-- Migration SQL to add country and importance_score columns
-- Run this in your Supabase SQL Editor:

ALTER TABLE public.news_articles 
ADD COLUMN IF NOT EXISTS importance_score integer DEFAULT 50,
ADD COLUMN IF NOT EXISTS country text DEFAULT 'BD';

ALTER TABLE public.scraping_sources 
ADD COLUMN IF NOT EXISTS country text DEFAULT 'BD';
