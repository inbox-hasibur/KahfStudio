import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Check if user already exists
    const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) throw listError;

    const existingUser = usersData.users.find(u => u.email?.toLowerCase() === email.toLowerCase());

    let userId: string;

    if (existingUser) {
      userId = existingUser.id;
      // Update password & metadata
      await supabase.auth.admin.updateUserById(userId, {
        password: password,
        email_confirm: true,
        user_metadata: {
          ...existingUser.user_metadata,
          role: 'admin',
          full_name: existingUser.user_metadata?.full_name || 'Administrator'
        }
      });
    } else {
      // Create new user
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: {
          role: 'admin',
          full_name: 'Administrator'
        }
      });

      if (createError) throw createError;
      userId = newUser.user.id;
    }

    // 2. Ensure profile exists and has role='admin'
    const { error: upsertError } = await supabase.from('profiles').upsert({
      id: userId,
      role: 'admin',
      tier: 'premium',
      full_name: 'Administrator'
    }, { onConflict: 'id' });

    if (upsertError) {
      console.warn("Profile upsert warning:", upsertError);
    }

    return NextResponse.json({
      success: true,
      message: `Admin account '${email}' configured successfully with role 'admin'.`,
      userId: userId
    });

  } catch (error: any) {
    console.error("Setup admin error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// GET to automatically ensure admin@gmail.com / admin@kahfnews.com exists
export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const defaultAdminEmail = "admin@gmail.com";
    const defaultAdminPass = "admin123456";

    const { data: usersData } = await supabase.auth.admin.listUsers();
    const existing = usersData?.users?.find(u => u.email?.toLowerCase() === defaultAdminEmail.toLowerCase());

    let userId = existing?.id;

    if (!existing) {
      const { data: created, error: createErr } = await supabase.auth.admin.createUser({
        email: defaultAdminEmail,
        password: defaultAdminPass,
        email_confirm: true,
        user_metadata: { role: 'admin', full_name: 'System Admin' }
      });
      if (createErr) throw createErr;
      userId = created.user.id;
    } else {
      await supabase.auth.admin.updateUserById(userId!, {
        password: defaultAdminPass,
        email_confirm: true,
        user_metadata: { ...existing.user_metadata, role: 'admin' }
      });
    }

    if (userId) {
      await supabase.from('profiles').upsert({
        id: userId,
        role: 'admin',
        tier: 'premium',
        full_name: 'System Admin'
      }, { onConflict: 'id' });
    }

    return NextResponse.json({
      success: true,
      email: defaultAdminEmail,
      password: defaultAdminPass,
      message: "Default admin account ready: admin@gmail.com / admin123456"
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
