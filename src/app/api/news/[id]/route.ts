import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { id } = await params;

    // 1. Special Handling: Daily AI Podcast / Summary story lookup
    if (id === 'daily-summary' || id === 'daily-podcast') {
      const { searchParams } = new URL(req.url);
      const country = (searchParams.get('country') || 'BD').toUpperCase();
      const archiveType = `daily_bulletin_${country.toLowerCase()}`;

      // Try finding country-specific podcast first
      let { data: podcast } = await supabase
        .from('podcast_archives')
        .select('*')
        .eq('archive_type', archiveType)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Fallback: newest podcast archive
      if (!podcast) {
        const { data: latestPodcast } = await supabase
          .from('podcast_archives')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        podcast = latestPodcast;
      }

      if (podcast) {
        const headline = podcast.title || (country === 'SA' ? "موجز الذكاء الاصطناعي اليومي" : country === 'BD' ? "আজকের এআই দৈনিক সংবাদ বুলেটিন" : "Today's AI Daily News Briefing");
        const content = podcast.script || podcast.summary || "";

        return NextResponse.json({
          success: true,
          data: {
            id: 'daily-summary',
            headline,
            title: headline,
            ai_summary: content,
            summary: content,
            raw_content: content,
            category: 'AI Daily Briefing',
            source: 'KahfNews AI Radio',
            published_at: podcast.created_at,
            created_at: podcast.created_at,
            image_url: '/podcast-cover.jpg',
            audio_bn_summary: podcast.audio_url,
            audio_en_summary: podcast.audio_url,
            audioUrls: {
              bn_summary: podcast.audio_url,
              bn_full: podcast.audio_url,
              en_summary: podcast.audio_url,
              en_full: podcast.audio_url,
              ar_summary: podcast.audio_url,
              ar_full: podcast.audio_url,
            },
          },
        });
      }
    }

    // 2. Regular UUID / Article ID lookup
    const { data, error } = await supabase
      .from('news_articles')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return NextResponse.json(
        { success: false, error: 'Article not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch news details' },
      { status: 500 }
    );
  }
}
