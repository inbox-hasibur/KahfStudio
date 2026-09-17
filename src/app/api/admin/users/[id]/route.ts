import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkAdminAuth } from '@/lib/admin-auth';

export async function GET(request: Request, context: { params: any }) {
  const auth = await checkAdminAuth(request);
  if (!auth.isAdmin && auth.response) return auth.response;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { id } = await context.params;

  try {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();
      
    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 404 });
    }

    const { data: subscriptions, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', id)
      .order('created_at', { ascending: false });

    if (subError && subError.code !== '42P01') {
      console.error('Subscriptions fetch error:', subError);
    }

    const { data: invoices, error: invError } = await supabase
      .from('payment_invoices')
      .select('*')
      .eq('user_id', id)
      .order('created_at', { ascending: false });

    if (invError && invError.code !== '42P01') {
      console.error('Invoices fetch error:', invError);
    }

    return NextResponse.json({
      profile,
      subscriptions: subscriptions || [],
      invoices: invoices || []
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: { params: any }) {
  const auth = await checkAdminAuth(request);
  if (!auth.isAdmin && auth.response) return auth.response;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { id } = await context.params;

  try {
    const body = await request.json();
    const { tier, role } = body;

    const updates: Record<string, any> = {};
    if (tier !== undefined) updates.tier = String(tier).toLowerCase();
    if (role !== undefined) updates.role = String(role).toLowerCase();

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update provided' }, { status: 400 });
    }

    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // If tier was updated to premium, ensure a manual active subscription entry exists and record invoice
    if (updates.tier === 'premium') {
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + 30);
      
      try {
        const { data: subData } = await supabase.from('subscriptions').insert({
          user_id: id,
          plan_type: 'monthly',
          status: 'active',
          valid_until: validUntil.toISOString()
        }).select('id').maybeSingle();

        await supabase.from('payment_invoices').insert({
          user_id: id,
          subscription_id: subData?.id || null,
          transaction_id: `ADMIN_MANUAL_${Date.now()}`,
          amount: 100,
          status: 'paid',
          payment_provider: 'admin_manual',
        });
      } catch (err) {
        console.error('Subscription/Invoice insert error:', err);
      }
    }

    return NextResponse.json({ success: true, profile: updatedProfile });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
