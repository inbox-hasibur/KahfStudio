import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60s max execution limit compliant with Vercel Hobby & Pro plans

async function handlePipeline(req: NextRequest) {
  // 🔐 Security check
  const authHeader = req.headers.get('authorization');
  const userAgent = req.headers.get('user-agent') || '';
  const isVercelCron = req.headers.get('x-vercel-cron') === '1' || userAgent.includes('vercel-cron');
  const cronSecret = process.env.CRON_SECRET;

  const isAuthorized =
    isVercelCron ||
    (cronSecret && authHeader === `Bearer ${cronSecret}`) ||
    !cronSecret; // If CRON_SECRET not defined, allow execution so automation doesn't silently break

  if (!isAuthorized) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || process.env.VERCEL_URL;
    const protocol = req.headers.get('x-forwarded-proto') || (host?.includes('localhost') ? 'http' : 'https');
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || (host ? `${protocol}://${host}` : 'http://localhost:3000');

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

    // 1. Trigger primary RSS ingestion pipeline if scraping schedule is enabled (Multi-region: BD, GLOBAL, UK, SA)
    if (isScrapeEnabled) {
      try {
        const scrapeLimit = limit || "10";
        const authHeaders: Record<string, string> = {};
        if (process.env.CRON_SECRET) {
          authHeaders['Authorization'] = `Bearer ${process.env.CRON_SECRET}`;
        }

        const targetCountries = country === "All" ? ["BD", "GLOBAL", "UK", "SA"] : [country];
        const scrapePromises = targetCountries.map(async (c) => {
          try {
            const res = await fetch(
              `${appUrl}/api/ingest/trigger-rss?limit=${encodeURIComponent(scrapeLimit)}&category=${encodeURIComponent(category)}&country=${encodeURIComponent(c)}`,
              { headers: authHeaders }
            );
            return res.ok;
          } catch (e) {
            console.error(`Scrape cron trigger failed for ${c}:`, e);
            return false;
          }
        });

        const results = await Promise.allSettled(scrapePromises);
        scrapeTriggered = results.some((r) => r.status === 'fulfilled' && r.value === true);
      } catch (err: any) {
        console.error('Scrape cron trigger failed:', err);
      }
    }

    // 2. Trigger AI Podcast generation if podcast schedule is enabled (Multi-country: BD, SA, GLOBAL, UK)
    if (isPodcastEnabled) {
      try {
        const podcastCountries = country === "All" ? ["BD", "SA", "GLOBAL", "UK"] : [country];
        const podPromises = podcastCountries.map((c) =>
          fetch(`${appUrl}/api/podcast/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ country: c }),
          })
        );
        const podResults = await Promise.allSettled(podPromises);
        podcastTriggered = podResults.some(
          (r) => r.status === 'fulfilled' && r.value.ok
        );
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

export async function GET(req: NextRequest) {
  return handlePipeline(req);
}

export async function POST(req: NextRequest) {
  return handlePipeline(req);
}
