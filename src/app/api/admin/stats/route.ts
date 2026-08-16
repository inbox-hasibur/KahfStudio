import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkAdminAuth } from '@/lib/admin-auth';

export async function GET(req: Request) {
  const auth = await checkAdminAuth(req);
  if (!auth.isAdmin && auth.response) return auth.response;
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let userQuery = supabase.from('profiles').select('*', { count: 'exact', head: true });
    let premiumQuery = supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('tier', 'premium');
    let newsQuery = supabase.from('news_articles').select('*', { count: 'exact', head: true });

    if (startDate) {
      const startIso = `${startDate}T00:00:00.000Z`;
      userQuery = userQuery.gte('created_at', startIso);
      premiumQuery = premiumQuery.gte('created_at', startIso);
      newsQuery = newsQuery.gte('published_at', startIso);
    }

    if (endDate) {
      const endIso = `${endDate}T23:59:59.999Z`;
      userQuery = userQuery.lte('created_at', endIso);
      premiumQuery = premiumQuery.lte('created_at', endIso);
      newsQuery = newsQuery.lte('published_at', endIso);
    }

    const [usersRes, premiumRes, scrapersRes, newsRes, settingsRes] = await Promise.all([
      userQuery,
      premiumQuery,
      supabase.from('scraping_sources').select('*', { count: 'exact', head: true }).eq('is_active', true),
      newsQuery,
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
