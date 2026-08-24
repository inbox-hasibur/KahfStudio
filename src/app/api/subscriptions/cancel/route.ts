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
      console.error("Subscription fetch error:", fetchErr);
    }

    let activeSub = subs && subs.length > 0 ? subs[0] : null;

    if (activeSub) {
      // Mark subscription auto_renew = false and status = cancelled
      const { error: updateErr } = await supabase
        .from('subscriptions')
        .update({
          status: 'cancelled',
          auto_renew: false,
        })
        .eq('id', activeSub.id);

      if (updateErr) {
        await supabase
          .from('subscriptions')
          .update({ status: 'cancelled' })
          .eq('id', activeSub.id);
      }
    } else {
      // If no sub record exists, insert a cancelled sub record so history is consistent
      const { data: newSub } = await supabase
        .from('subscriptions')
        .insert({
          user_id: userId,
          plan_type: 'premium_monthly',
          status: 'cancelled',
          auto_renew: false,
          valid_until: new Date().toISOString()
        })
        .select('*')
        .single();
      activeSub = newSub;
    }

    // Also update profiles tier to 'free'
    await supabase
      .from('profiles')
      .update({ tier: 'free' })
      .eq('id', userId);

    try {
      await supabase.auth.admin.updateUserById(userId, {
        user_metadata: { tier: 'free' }
      });
    } catch (e) {}

    return NextResponse.json({
      success: true,
      message: 'Subscription recurring auto-renew cancelled successfully.',
      valid_until: activeSub?.valid_until || new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
