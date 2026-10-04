export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { fetchBrowserNewsFeed } from '@/kahf-browser-news';

/**
 * OPTIONS handler for CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

/**
 * GET /api/kahfnews
 * Dedicated feed endpoint tailored for Kahf Browser Startpage & Ingest Pipeline.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const result = await fetchBrowserNewsFeed({
      location: searchParams.get('location') || searchParams.get('country'),
      language: searchParams.get('language'),
      category: searchParams.get('category'),
      source: searchParams.get('source'),
      sort: searchParams.get('sort'),
      limit: parseInt(searchParams.get('limit') || '50', 10),
      page: parseInt(searchParams.get('page') || '1', 10),
      since: searchParams.get('since'),
    });

    return NextResponse.json(result, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    });
  } catch (error: any) {
    console.error("API /api/kahfnews GET Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch KahfNews feed',
      },
      {
        status: 500,
        headers: { 'Access-Control-Allow-Origin': '*' },
      }
    );
  }
}
