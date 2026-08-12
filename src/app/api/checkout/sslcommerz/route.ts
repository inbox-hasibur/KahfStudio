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

    const storeId = (process.env.SSLCOMMERZ_STORE_ID || '').trim();
    const storePass = (process.env.SSLCOMMERZ_STORE_PASSWORD || '').trim();

    if (!storeId || !storePass) {
      return NextResponse.json({ error: 'SSLCommerz credentials missing' }, { status: 500 });
    }

    const amount = isAnnual ? '1000.00' : '100.00';
    const tran_id = `KAHF_SSL_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const formData = new URLSearchParams();
    formData.append('store_id', storeId);
    formData.append('store_passwd', storePass);
    formData.append('total_amount', amount);
    formData.append('currency', 'BDT');
    formData.append('tran_id', tran_id);
    formData.append('success_url', `${origin}/api/checkout/sslcommerz/callback?status=success`);
    formData.append('fail_url', `${origin}/api/checkout/sslcommerz/callback?status=fail`);
    formData.append('cancel_url', `${origin}/api/checkout/sslcommerz/callback?status=cancel`);
    formData.append('ipn_url', `${origin}/api/checkout/sslcommerz/callback`);
    
    // Customer Info
    formData.append('cus_name', 'KahfStudio User');
    formData.append('cus_email', 'user@example.com');
    formData.append('cus_add1', 'Dhaka');
    formData.append('cus_city', 'Dhaka');
    formData.append('cus_state', 'Dhaka');
    formData.append('cus_postcode', '1000');
    formData.append('cus_country', 'Bangladesh');
    formData.append('cus_phone', '01711111111');

    // Product Info
    formData.append('shipping_method', 'NO');
    formData.append('product_name', isAnnual ? 'KahfStudio Premium (Yearly)' : 'KahfStudio Premium (Monthly)');
    formData.append('product_category', 'Subscription');
    formData.append('product_profile', 'non-physical-goods');

    // Custom data to verify after payment
    formData.append('value_a', userId);
    formData.append('value_b', isAnnual ? 'yearly' : 'monthly');

    const isLive = process.env.SSLCOMMERZ_IS_LIVE === 'true';
    const gatewayUrl = isLive 
      ? "https://securepay.sslcommerz.com/gwprocess/v4/api.php" 
      : "https://sandbox-gw.sslcommerz.com/gwprocess/v4/api.php";

    const response = await fetch(gatewayUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData.toString()
    });

    const data = await response.json();

    if (data.status === 'SUCCESS' && data.GatewayPageURL) {
      return NextResponse.json({ url: data.GatewayPageURL });
    } else {
      console.error("SSLCommerz Error:", data);
      return NextResponse.json({ error: data.failedreason || "Failed to generate SSLCommerz payment url" }, { status: 500 });
    }

  } catch (err: any) {
    console.error("SSLCommerz checkout error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
