import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2025-01-27.acacia' as any,
});

export async function POST(req: Request) {
  try {
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
    const protocol = req.headers.get('x-forwarded-proto') || 'http';
    const origin = req.headers.get('origin') || 
                   (host ? `${protocol}://${host}` : process.env.NEXT_PUBLIC_APP_URL) || 
                   'http://localhost:3000';
    
    // Parse the request body for user id and isAnnual
    const body = await req.json().catch(() => ({}));
    const userId = body.userId;
    const isAnnual = body.isAnnual === true;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Global Pricing is $1 / $10
    const unitAmount = isAnnual ? 1000 : 100; // 1000 cents = $10, 100 cents = $1
    const planName = isAnnual ? 'KahfStudio Premium (Yearly)' : 'KahfStudio Premium (Monthly)';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: planName,
              description: 'Full access to personalized AI news and premium features.',
            },
            unit_amount: unitAmount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      invoice_creation: {
        enabled: true,
      },
      client_reference_id: userId,
      success_url: `${origin}/pricing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pricing/cancel`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
