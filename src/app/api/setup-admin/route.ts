import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");
  const secret = searchParams.get("secret");

  if (secret !== "KahfAdmin123") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: "Missing Supabase URL or Service Key in Environment Variables" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  
  if (listError) {
    return NextResponse.json({ error: listError.message }, { status: 500 });
  }

  const existingAdmin = users.find(u => u.email === email);

  if (!existingAdmin) {
    return NextResponse.json({ error: `User with email ${email} not found. Please register this email first.` }, { status: 404 });
  }

  const { error: updateError } = await supabase.auth.admin.updateUserById(
    existingAdmin.id,
    { 
      user_metadata: { role: 'admin', full_name: 'Super Admin' } 
    }
  );

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: `User ${email} has been successfully updated to Admin role!` });
}
