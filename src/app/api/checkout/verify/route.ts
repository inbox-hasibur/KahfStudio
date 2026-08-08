import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2025-01-27.acacia' as any,
});

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const sessionId = body.session_id;

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['invoice'],
    });

    if (session.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Payment not successful' }, { status: 400 });
    }

    const userId = session.client_reference_id;
    if (!userId) {
      return NextResponse.json({ error: 'User ID not found in session' }, { status: 400 });
    }

    // Update user to premium in Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
      user_metadata: { tier: 'premium' }
    });

    if (updateError) {
      console.error('Error updating user tier:', updateError);
      // We don't fail here since payment was successful, maybe just log it
    }
    
    // Also update public profiles table if it exists (assuming it does since admin/users queries it)
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ tier: 'premium' })
      .eq('id', userId);
      
    if (profileError) {
       console.error('Error updating profile tier:', profileError);
    }

    const invoice = session.invoice as Stripe.Invoice | null;
    const invoiceUrl = invoice?.hosted_invoice_url || invoice?.invoice_pdf || null;

    return NextResponse.json({ 
      success: true, 
      invoiceUrl, 
      userId 
    });
  } catch (err: any) {
    console.error('Verify checkout error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
