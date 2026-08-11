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

    // Update user profile tier to free
    await supabase.from('profiles').update({ tier: 'free' }).eq('id', userId);
    
    // Mark subscription as expired
    await supabase.from('subscriptions')
      .update({ status: 'expired' })
      .eq('user_id', userId)
      .eq('plan_type', 'trial');

    // Update auth metadata
    await supabase.auth.admin.updateUserById(userId, {
      user_metadata: { tier: 'free' }
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
