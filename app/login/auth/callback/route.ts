import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Check if admin
      const { data: adminData } = await supabase
        .from("admins")
        .select("id")
        .eq("user_id", data.user.id)
        .single();
      if (adminData) return NextResponse.redirect(`${origin}/admin`);

      // Check if agency
      const { data: agencyUser } = await supabase
        .from("agency_users")
        .select("id")
        .eq("user_id", data.user.id)
        .single();
      if (agencyUser) return NextResponse.redirect(`${origin}/agency-dashboard`);

      return NextResponse.redirect(`${origin}/dashboard`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}