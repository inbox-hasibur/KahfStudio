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

    // Get latest subscription for user
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
    const validUntil = new Date();
    validUntil.setMonth(validUntil.getMonth() + 1);

    if (activeSub) {
      const { error: updateErr } = await supabase
        .from('subscriptions')
        .update({
          status: 'active',
          auto_renew: true,
        })
        .eq('id', activeSub.id);

      if (updateErr) {
        await supabase
          .from('subscriptions')
          .update({ status: 'active' })
          .eq('id', activeSub.id);
      }
    } else {
      const { data: newSub } = await supabase
        .from('subscriptions')
        .insert({
          user_id: userId,
          plan_type: 'premium_monthly',
          status: 'active',
          auto_renew: true,
          valid_until: validUntil.toISOString()
        })
        .select('*')
        .single();
      activeSub = newSub;
    }

    // Update user profile tier to premium
    await supabase
      .from('profiles')
      .update({ tier: 'premium' })
      .eq('id', userId);

    try {
      await supabase.auth.admin.updateUserById(userId, {
        user_metadata: { tier: 'premium' }
      });
    } catch (e) {}

    return NextResponse.json({
      success: true,
      message: 'Subscription recurring auto-renew reactivated successfully.',
      valid_until: activeSub?.valid_until || validUntil.toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
