/**
 * Kahf Browser News Engine
 * Single, decoupled root export for all news crawling, filtering, scheduling, and feed generation.
 */

// Sources
export * from './sources/regional-sources-registry';

// Filters & Validation (Zero-tokens, local algorithmic)
export * from './filters/news-candidate-validator';

// Crawler
export * from './crawler/rss-feed-crawler';

// Ingestion Pipeline
export * from './pipeline/news-ingestion-pipeline';

// Scheduler
export * from './scheduler/news-cron-scheduler';

// Browser Cards Feed
export * from './feed/browser-news-feed-service';
