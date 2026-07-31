import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const [usersRes, premiumRes, scrapersRes, newsRes, settingsRes] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('tier', 'premium'),
      supabase.from('scraping_sources').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('news_articles').select('*', { count: 'exact', head: true }),
      supabase.from('system_settings').select('setting_value').eq('setting_key', 'global_gemini_api_keys').single(),
    ]);

    const logsRes = await supabase.from('news_articles')
      .select('headline, published_at, source')
      .order('published_at', { ascending: false })
      .limit(5);

    let apiCount = 0;
    if (settingsRes.data) {
      try {
        const keys = JSON.parse(settingsRes.data.setting_value);
        if (Array.isArray(keys)) apiCount = keys.length;
      } catch(e) {}
    }

    return NextResponse.json({
      success: true,
      stats: {
        totalUsers: usersRes.count || 0,
        premiumUsers: premiumRes.count || 0,
        activeScrapers: scrapersRes.count || 0,
        newsLibrary: newsRes.count || 0,
        activeApis: apiCount,
        onlineUsers: Math.floor((usersRes.count || 0) * 0.2)
      },
      recentLogs: logsRes.data || []
    });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
