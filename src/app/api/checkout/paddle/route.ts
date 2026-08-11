import { NextResponse } from 'next/server';
import { Environment, Paddle } from '@paddle/paddle-node-sdk';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const userId = body.userId;
    const isAnnual = body.isAnnual === true;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const apiKey = process.env.PADDLE_API_KEY as string;
    const clientToken = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN as string;

    if (!apiKey) {
      return NextResponse.json({ error: 'Paddle API key not configured' }, { status: 500 });
    }

    const paddle = new Paddle(apiKey, {
      environment: clientToken?.startsWith('test_') ? Environment.sandbox : Environment.production,
    });

    const priceId = isAnnual 
      ? process.env.PADDLE_YEARLY_PRICE_ID 
      : process.env.PADDLE_MONTHLY_PRICE_ID;

    if (!priceId) {
      return NextResponse.json({ error: 'Paddle Price IDs not configured' }, { status: 500 });
    }

    // Create a transaction
    const transaction = await paddle.transactions.create({
      items: [
        {
          priceId: priceId,
          quantity: 1,
        }
      ],
      customData: {
        userId: userId,
      }
    });

    return NextResponse.json({ transactionId: transaction.id });
  } catch (err: any) {
    console.error("Paddle checkout error:", err);
    return NextResponse.json({ error: err.message || "Failed to create Paddle checkout" }, { status: 500 });
  }
}
