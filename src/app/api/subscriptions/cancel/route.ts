import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const userId = body.userId;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get active subscription for user
    const { data: subs, error: fetchErr } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (fetchErr) {
      return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    }

    if (!subs || subs.length === 0) {
      return NextResponse.json({ error: 'No active subscription found for this user.' }, { status: 404 });
    }

    const activeSub = subs[0];

    // Mark subscription auto_renew = false and status = cancelled
    const { error: updateErr } = await supabase
      .from('subscriptions')
      .update({
        status: 'cancelled',
        auto_renew: false,
      })
      .eq('id', activeSub.id);

    if (updateErr) {
      // Fallback update without auto_renew column if schema lacks it
      await supabase
        .from('subscriptions')
        .update({ status: 'cancelled' })
        .eq('id', activeSub.id);
    }

    return NextResponse.json({
      success: true,
      message: 'Subscription recurring auto-renew cancelled successfully. Your premium features remain active until the end of your billing cycle.',
      valid_until: activeSub.valid_until,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
