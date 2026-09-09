import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // 🔐 Security check
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    let limit = "10";
    let category = "All";
    let country = "All";
    let isScrapeEnabled = true;
    let isPodcastEnabled = true;

    // Read stored automation defaults and schedules from system_settings
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data: sysData } = await supabase.from('system_settings').select('setting_key, setting_value');
      if (sysData) {
        const lim = sysData.find((s) => s.setting_key === 'automation_default_limit');
        const cat = sysData.find((s) => s.setting_key === 'automation_default_category');
        const cnt = sysData.find((s) => s.setting_key === 'automation_default_country');
        const scrEn = sysData.find((s) => s.setting_key === 'scraping_schedule_enabled');
        const podEn = sysData.find((s) => s.setting_key === 'podcast_schedule_enabled');

        if (lim?.setting_value) limit = lim.setting_value;
        if (cat?.setting_value) category = cat.setting_value;
        if (cnt?.setting_value) country = cnt.setting_value;
        if (scrEn) isScrapeEnabled = scrEn.setting_value !== 'false';
        if (podEn) isPodcastEnabled = podEn.setting_value !== 'false';
      }
    } catch (e) {}

    let scrapeTriggered = false;
    let podcastTriggered = false;

    // 1. Trigger primary RSS ingestion pipeline if scraping schedule is enabled
    if (isScrapeEnabled) {
      try {
        if (country === "All") {
          // Automatic dual-country run: 10 BD articles + 10 Global articles (total 20 per scheduled run)
          const scrapeLimit = limit || "10";
          const bdPromise = fetch(
            `${appUrl}/api/ingest/trigger-rss?limit=${encodeURIComponent(scrapeLimit)}&category=${encodeURIComponent(category)}&country=BD`,
            { headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` } }
          );
          const globalPromise = fetch(
            `${appUrl}/api/ingest/trigger-rss?limit=${encodeURIComponent(scrapeLimit)}&category=${encodeURIComponent(category)}&country=GLOBAL`,
            { headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` } }
          );
          const [resBd, resGlobal] = await Promise.all([bdPromise, globalPromise]);
          scrapeTriggered = resBd.ok || resGlobal.ok;
        } else {
          const triggerRes = await fetch(
            `${appUrl}/api/ingest/trigger-rss?limit=${encodeURIComponent(limit)}&category=${encodeURIComponent(category)}&country=${encodeURIComponent(country)}`,
            { headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` } }
          );
          scrapeTriggered = triggerRes.ok;
        }
      } catch (err: any) {
        console.error('Scrape cron trigger failed:', err);
      }
    }

    // 2. Trigger AI Podcast generation if podcast schedule is enabled
    if (isPodcastEnabled) {
      try {
        const podRes = await fetch(`${appUrl}/api/podcast/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        podcastTriggered = podRes.ok;
      } catch (err: any) {
        console.error('Podcast cron trigger failed:', err);
      }
    }

    return NextResponse.json({
      success: true,
      scraping: { enabled: isScrapeEnabled, triggered: scrapeTriggered, config: { limit, category, country } },
      podcast: { enabled: isPodcastEnabled, triggered: podcastTriggered },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('❌ Cron pipeline failed:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
