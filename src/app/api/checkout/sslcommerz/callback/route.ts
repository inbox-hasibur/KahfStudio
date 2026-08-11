import { NextResponse } from 'next/server';

import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const statusParam = url.searchParams.get('status');
    const origin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    if (statusParam === 'cancel') {
      return NextResponse.redirect(`${origin}/pricing/cancel`);
    }

    if (statusParam === 'fail') {
      return NextResponse.redirect(`${origin}/pricing/cancel?error=payment_failed`);
    }

    const formData = await req.formData().catch(() => new FormData());
    const status = formData.get('status') as string;
    const value_a = formData.get('value_a') as string; // userId
    const value_b = formData.get('value_b') as string; // plan

    if (statusParam === 'success' || status === 'VALID' || status === 'VALIDATED' || status === 'SUCCESS') {
      if (value_a) {
        const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
        
        // Update user tier in profiles
        await supabase.from('profiles').update({ tier: 'premium' }).eq('id', value_a);
        
        // Update auth metadata
        await supabase.auth.admin.updateUserById(value_a, {
          user_metadata: { tier: 'premium' }
        });
        
        // Insert subscription record
        const plan_type = value_b === 'yearly' ? 'premium_yearly' : 'premium_monthly';
        const valid_until = new Date();
        valid_until.setFullYear(valid_until.getFullYear() + (value_b === 'yearly' ? 1 : 0));
        if (value_b !== 'yearly') valid_until.setMonth(valid_until.getMonth() + 1);

        await supabase.from('subscriptions').insert({
          user_id: value_a,
          plan_type: plan_type,
          status: 'active',
          valid_until: valid_until.toISOString()
        });
      }

      return NextResponse.redirect(`${origin}/pricing/success?gateway=sslcommerz`);
    }

    // Default to cancel if anything else
    return NextResponse.redirect(`${origin}/pricing/cancel?error=invalid_status`);
  } catch (err) {
    console.error("SSLCommerz callback error:", err);
    const origin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return NextResponse.redirect(`${origin}/pricing/cancel?error=server_error`);
  }
}
