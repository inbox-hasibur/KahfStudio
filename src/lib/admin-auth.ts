import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function verifyAdmin(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const secretKey = req.headers.get('x-admin-secret');

    // Allow internal service key
    if (secretKey && secretKey === process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return { authorized: true };
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return { authorized: false, response: NextResponse.json({ error: 'Unauthorized: Missing token' }, { status: 401 }) };
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return { authorized: false, response: NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 }) };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = profile?.role === 'admin' || user.user_metadata?.role === 'admin';
    if (!isAdmin) {
      return { authorized: false, response: NextResponse.json({ error: 'Forbidden: Admin privileges required' }, { status: 403 }) };
    }

    return { authorized: true, user, profile };
  } catch (err: any) {
    return { authorized: false, response: NextResponse.json({ error: err.message || 'Authorization check failed' }, { status: 500 }) };
  }
}
