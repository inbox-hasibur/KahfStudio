import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

async function handleCallback(req: Request) {
  try {
    const url = new URL(req.url);
    const statusParam = url.searchParams.get('status');

    // Dynamic origin resolution from forwarded headers
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
    const protocol = req.headers.get('x-forwarded-proto') || (host?.includes('localhost') ? 'http' : 'https');
    const origin = (host ? `${protocol}://${host}` : null) || 
                   process.env.NEXT_PUBLIC_APP_URL || 
                   url.origin || 
                   'http://localhost:3000';

    if (statusParam === 'cancel') {
      return NextResponse.redirect(`${origin}/pricing/cancel`, 303);
    }

    if (statusParam === 'fail') {
      return NextResponse.redirect(`${origin}/pricing/cancel?error=payment_failed`, 303);
    }

    let formData: FormData | null = null;
    let rawBody = '';
    try {
      if (req.method === 'POST') {
        const cloned = req.clone();
        try {
          formData = await req.formData();
        } catch (_) {
          rawBody = await cloned.text();
          const params = new URLSearchParams(rawBody);
          formData = new FormData();
          for (const [k, v] of params.entries()) {
            formData.append(k, v);
          }
        }
      }
    } catch (_) {
      formData = new FormData();
    }

    const status = (formData?.get('status') as string) || url.searchParams.get('status') || '';
    const value_a = (formData?.get('value_a') as string) || url.searchParams.get('userId') || ''; // userId
    const value_b = (formData?.get('value_b') as string) || url.searchParams.get('plan') || 'monthly'; // plan
    const tran_id = (formData?.get('tran_id') as string) || (formData?.get('bank_tran_id') as string) || url.searchParams.get('tran_id') || `SSL_${Date.now()}`;
    const amount = Number(formData?.get('amount')) || Number(formData?.get('total_amount')) || (value_b === 'yearly' ? 1000 : value_b === 'weekly' ? 30 : 100);

    if (statusParam === 'success' || status === 'VALID' || status === 'VALIDATED' || status === 'SUCCESS') {
      if (value_a) {
        const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
        
        // 1. Update user tier in profiles
        const { error: profileErr } = await supabase.from('profiles').update({ tier: 'premium' }).eq('id', value_a);
        if (profileErr) console.error("Error updating profile tier:", profileErr);
        
        // 2. Update auth metadata
        await supabase.auth.admin.updateUserById(value_a, {
          user_metadata: { tier: 'premium' }
        }).catch(err => console.error("Error updating auth user metadata:", err));
        
        // 3. Insert subscription record with recurring auto_renew status
        const plan_type = value_b === 'yearly' ? 'premium_yearly' : value_b === 'weekly' ? 'premium_weekly' : 'premium_monthly';
        const valid_until = new Date();
        if (value_b === 'yearly') valid_until.setFullYear(valid_until.getFullYear() + 1);
        else if (value_b === 'weekly') valid_until.setDate(valid_until.getDate() + 7);
        else valid_until.setMonth(valid_until.getMonth() + 1);

        const { data: subData, error: subErr } = await supabase.from('subscriptions').insert({
          user_id: value_a,
          plan_type: plan_type,
          status: 'active',
          valid_until: valid_until.toISOString()
        }).select('id').maybeSingle();
        if (subErr) console.error("Error inserting subscription:", subErr);

        // 4. Record invoice in payment_invoices
        try {
          const { error: invErr } = await supabase.from('payment_invoices').insert({
            user_id: value_a,
            subscription_id: subData?.id || null,
            transaction_id: tran_id,
            amount: amount,
            status: 'paid',
            payment_provider: 'sslcommerz',
          });
          if (invErr) console.error("Failed to insert payment invoice record:", invErr);
        } catch (invErr) {
          console.warn("Failed to insert payment invoice record exception:", invErr);
        }
      } else {
        console.warn("SSLCommerz callback received success status but no userId (value_a) was present!");
      }

      // CRITICAL: Must use HTTP 303 (See Other) so browser converts SSLCommerz POST to a GET request
      return NextResponse.redirect(`${origin}/pricing/success?gateway=sslcommerz&tran_id=${tran_id}`, 303);
    }

    // Default to cancel if anything else
    return NextResponse.redirect(`${origin}/pricing/cancel?error=invalid_status`, 303);
  } catch (err) {
    console.error("SSLCommerz callback error:", err);
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
    const protocol = req.headers.get('x-forwarded-proto') || 'https';
    const origin = (host ? `${protocol}://${host}` : null) || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return NextResponse.redirect(`${origin}/pricing/cancel?error=server_error`, 303);
  }
}

export async function POST(req: Request) {
  return handleCallback(req);
}

export async function GET(req: Request) {
  return handleCallback(req);
}
