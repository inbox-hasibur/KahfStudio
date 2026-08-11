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

    // Since it's x-www-form-urlencoded typically sent by aamarPay callback
    const formData = await req.formData();
    const pay_status = formData.get('pay_status') as string;
    const status_code = formData.get('status_code') as string;
    const opt_a = formData.get('opt_a') as string; // userId
    const opt_b = formData.get('opt_b') as string; // plan (monthly/yearly)

    if (status_code === '2' && pay_status === 'Successful') {
      if (opt_a) {
        const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
        
        // Update user tier in profiles
        await supabase.from('profiles').update({ tier: 'premium' }).eq('id', opt_a);
        
        // Update auth metadata
        await supabase.auth.admin.updateUserById(opt_a, {
          user_metadata: { tier: 'premium' }
        });
        
        // Insert subscription record
        const plan_type = opt_b === 'yearly' ? 'premium_yearly' : 'premium_monthly';
        const valid_until = new Date();
        valid_until.setFullYear(valid_until.getFullYear() + (opt_b === 'yearly' ? 1 : 0));
        if (opt_b !== 'yearly') valid_until.setMonth(valid_until.getMonth() + 1);

        await supabase.from('subscriptions').insert({
          user_id: opt_a,
          plan_type: plan_type,
          status: 'active',
          valid_until: valid_until.toISOString()
        });
      }
      
      // Redirect to success page
      return NextResponse.redirect(`${origin}/pricing/success?gateway=aamarpay`);
    }

    // Default to cancel if anything else
    return NextResponse.redirect(`${origin}/pricing/cancel?error=invalid_status`);
  } catch (err) {
    console.error("aamarPay callback error:", err);
    const origin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return NextResponse.redirect(`${origin}/pricing/cancel?error=server_error`);
  }
}
