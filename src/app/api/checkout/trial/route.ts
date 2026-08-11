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

    // Check if user already had a trial
    const { data: existingTrials } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('plan_type', 'trial');

    if (existingTrials && existingTrials.length > 0) {
      return NextResponse.json({ error: 'You have already claimed a free trial.' }, { status: 400 });
    }

    // Insert new trial subscription
    const valid_until = new Date();
    valid_until.setDate(valid_until.getDate() + 7);

    const { error: insertError } = await supabase.from('subscriptions').insert({
      user_id: userId,
      plan_type: 'trial',
      status: 'trialing',
      valid_until: valid_until.toISOString(),
    });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Update user profile tier to premium
    await supabase.from('profiles').update({ tier: 'premium' }).eq('id', userId);

    // Update auth metadata
    await supabase.auth.admin.updateUserById(userId, {
      user_metadata: { tier: 'premium' }
    });

    return NextResponse.json({ success: true, valid_until: valid_until.toISOString() });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
