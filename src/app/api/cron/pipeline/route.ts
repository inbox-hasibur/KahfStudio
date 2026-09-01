import { NextRequest, NextResponse } from 'next/server';

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

    // Trigger primary RSS ingestion pipeline
    const triggerRes = await fetch(`${appUrl}/api/ingest/trigger-rss?limit=5`, {
      headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
    });

    return NextResponse.json({
      success: true,
      triggered: triggerRes.ok,
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
