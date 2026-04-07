import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { agency_name, contact_person_name, email, phone, message } = body;

  await supabase.from("agency_enquiries").insert({
    agency_name,
    contact_person_name,
    email,
    phone,
    message,
  });

  // EMAIL SENDING DISABLED — wire up Resend here later

  return NextResponse.json({ success: true });
}