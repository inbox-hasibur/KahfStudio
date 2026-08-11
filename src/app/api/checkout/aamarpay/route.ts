import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
    const protocol = req.headers.get('x-forwarded-proto') || 'http';
    const origin = req.headers.get('origin') || 
                   (host ? `${protocol}://${host}` : process.env.NEXT_PUBLIC_APP_URL) || 
                   'http://localhost:3000';
                   
    const body = await req.json().catch(() => ({}));
    const userId = body.userId;
    const isAnnual = body.isAnnual === true;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const amount = isAnnual ? '1000.00' : '100.00';
    const tran_id = `KAHF_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const payload = {
      store_id: "aamarpaytest",
      signature_key: "dbb74894e82415a2f7ff0ec3a97e4183",
      tran_id: tran_id,
      success_url: `${origin}/api/checkout/aamarpay/callback?status=success`,
      fail_url: `${origin}/api/checkout/aamarpay/callback?status=fail`,
      cancel_url: `${origin}/api/checkout/aamarpay/callback?status=cancel`,
      amount: amount,
      currency: "BDT",
      desc: isAnnual ? "KahfStudio Premium (Yearly)" : "KahfStudio Premium (Monthly)",
      cus_name: "KahfStudio User",
      cus_email: "payer@merchantcusomter.com",
      cus_add1: "Dhaka",
      cus_add2: "Dhaka",
      cus_city: "Dhaka",
      cus_state: "Dhaka",
      cus_postcode: "1200",
      cus_country: "Bangladesh",
      cus_phone: "01700000000",
      type: "json",
      opt_a: userId,
      opt_b: isAnnual ? "yearly" : "monthly"
    };

    const response = await fetch("https://sandbox.aamarpay.com/jsonpost.php", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (data.result === "true" && data.payment_url) {
      return NextResponse.json({ url: data.payment_url });
    } else {
      console.error("aamarPay Error:", data);
      return NextResponse.json({ error: "Failed to generate payment url" }, { status: 500 });
    }

  } catch (err: any) {
    console.error("aamarPay checkout error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
