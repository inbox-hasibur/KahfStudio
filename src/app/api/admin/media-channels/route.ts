export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Helper to extract YouTube Video ID
function extractYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|live\/))([\w-]{11})/);
  if (match && match[1]) return match[1];
  if (/^[\w-]{11}$/.test(url.trim())) return url.trim();
  return null;
}

// GET /api/admin/media-channels?type=iptv|video|all
export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(req.url);
    const typeFilter = searchParams.get('type');

    let query = supabase.from('media_channels').select('*').order('created_at', { ascending: false });
    if (typeFilter && typeFilter !== 'all') {
      query = query.eq('type', typeFilter);
    }

    const { data, error } = await query;
    if (error) {
      // If columns don't exist yet, return empty list gracefully
      console.warn('media_channels query warning:', error.message);
      return NextResponse.json({ success: true, channels: [], videos: [], all: [] });
    }

    const rows = data || [];
    const channels = rows.filter((r: any) => r.type === 'iptv' || !r.type);
    const videos = rows.filter((r: any) => r.type === 'video');

    return NextResponse.json({
      success: true,
      channels,
      videos,
      all: rows,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// POST /api/admin/media-channels — Add new channel or video
export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabase();
    const body = await req.json();

    const { title, url, type = 'iptv', stream_type, category = 'General', country = 'BD', duration, description } = body;

    if (!url) {
      return NextResponse.json({ success: false, error: 'URL is required' }, { status: 400 });
    }

    const ytId = extractYouTubeVideoId(url);
    const resolvedStreamType = stream_type || (url.includes('.m3u8') ? 'iptv' : 'youtube');
    const resolvedTitle = title?.trim() || (type === 'video' ? `News Video (${ytId || 'Report'})` : 'Live Channel');
    const thumbnail = ytId
      ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`
      : body.thumbnail || 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=600&auto=format&fit=crop&q=80';

    const insertPayload: any = {
      title: resolvedTitle,
      url: url.trim(),
      thumbnail,
      category: category || 'General',
      duration: duration || (type === 'iptv' ? '24/7' : '03:30'),
      description: description || (type === 'iptv' ? '24/7 লাইভ সম্প্রচার' : 'ভিডিও সংবাদ প্রতিবেদন'),
      type,
      stream_type: resolvedStreamType,
      country,
      is_active: true,
    };

    // First attempt with all columns
    let { data, error } = await supabase.from('media_channels').insert(insertPayload).select('*').single();

    // Fallback if schema doesn't have type/stream_type/country/is_active yet
    if (error && error.message?.includes('column')) {
      const basicPayload = {
        title: resolvedTitle,
        url: url.trim(),
        thumbnail,
        category: `[${type.toUpperCase()}] ${category}`,
        duration: duration || '03:30',
        description: description || '',
      };
      const fb = await supabase.from('media_channels').insert(basicPayload).select('*').single();
      data = fb.data;
      error = fb.error;
    }

    if (error) throw error;

    return NextResponse.json({ success: true, item: data });
  } catch (err: any) {
    console.error('POST media_channels error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// PATCH /api/admin/media-channels — Edit title, url, category, country, stream_type, or active status
export async function PATCH(req: NextRequest) {
  try {
    const supabase = getSupabase();
    const { id, title, url, category, country, stream_type, is_active } = await req.json();

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });
    }

    const updates: any = {};
    if (title !== undefined) updates.title = title.trim();
    if (category !== undefined) updates.category = category.trim();
    if (country !== undefined) updates.country = country;
    if (is_active !== undefined) updates.is_active = is_active;
    if (stream_type !== undefined) updates.stream_type = stream_type;

    if (url !== undefined) {
      updates.url = url.trim();
      const ytId = extractYouTubeVideoId(url);
      if (ytId) {
        updates.thumbnail = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
      }
      if (!stream_type) {
        updates.stream_type = url.includes('.m3u8') ? 'iptv' : 'youtube';
      }
    }

    const { data, error } = await supabase.from('media_channels').update(updates).eq('id', id).select('*').single();
    if (error) throw error;

    return NextResponse.json({ success: true, item: data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// DELETE /api/admin/media-channels — Remove channel or video
export async function DELETE(req: NextRequest) {
  try {
    const supabase = getSupabase();
    let id: string | null = null;
    try {
      const body = await req.json();
      id = body.id;
    } catch (e) {
      const { searchParams } = new URL(req.url);
      id = searchParams.get('id');
    }

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });
    }

    const { error } = await supabase.from('media_channels').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true, deletedId: id });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
