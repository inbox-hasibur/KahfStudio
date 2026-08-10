import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request, context: { params: any }) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { id } = await context.params;

  try {
    const { data: profile, error: profileError } = await supabase.from('profiles').select('*').eq('id', id).single();
    if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 });

    const { data: subscriptions, error: subError } = await supabase.from('subscriptions').select('*').eq('user_id', id).order('created_at', { ascending: false });
    if (subError && subError.code !== '42P01') {
      console.error(subError);
    }

    return NextResponse.json({ profile, subscriptions: subscriptions || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
