import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SENDER_EMAIL = Deno.env.get("SENDER_EMAIL") || "charlene@whatthebleep.co.uk";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY")!;

serve(async (req) => {
  const { type, data } = await req.json();

  if (type === "broadcast") {
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: doctors } = await supabase.from("doctors").select("email, full_name").not("email", "is", null);

    if (!doctors || doctors.length === 0) {
      return new Response(JSON.stringify({ success: false, error: "No doctors found" }), { status: 400 });
    }

    let sent = 0;
    for (const doctor of doctors) {
      if (!doctor.email) continue;
      const firstName = doctor.full_name?.split(" ").find((w: string) => !["dr", "dr."].includes(w.toLowerCase())) || doctor.full_name || "Doctor";
      const personalizedBody = data.body.replace(/\[Name\]/g, firstName).replace(/\[name\]/g, firstName);

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: SENDER_EMAIL,
          to: doctor.email,
          subject: data.subject,
          html: `
            <div style="font-family: 'DM Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 24px; background: #f8faff;">
              <div style="background: #fff; border-radius: 16px; padding: 40px; border: 1px solid #e8f0fe;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 32px;">
                  <div style="width: 32px; height: 32px; background: #1d4ed8; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                    <span style="color: white; font-size: 18px; font-weight: bold;">+</span>
                  </div>
                  <span style="font-weight: 700; font-size: 1.1rem; color: #1d4ed8;">MedHub</span>
                </div>
                <div style="font-size: 0.95rem; color: #374151; line-height: 1.8; white-space: pre-line;">${personalizedBody}</div>
                <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e8f0fe; font-size: 0.78rem; color: #94a3b8; text-align: center;">
                  MedHub · Your Compliance Passport · <a href="mailto:charlene@whatthebleep.co.uk" style="color: #1d4ed8;">Contact Support</a>
                </div>
              </div>
            </div>
          `,
        }),
      });
      sent++;
    }

    return new Response(JSON.stringify({ success: true, sent }), { headers: { "Content-Type": "application/json" } });
  }

  // Original single email logic
  let to = "";
  let subject = "";
  let html = "";

  if (type === "connection_request") {
    to = data.agency_email;
    subject = `New connection request from Dr. ${data.doctor_name}`;
    html = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 24px;">
      <h2 style="color: #1d4ed8;">New Connection Request</h2>
      <p>Dr. <strong>${data.doctor_name}</strong> wants to connect with <strong>${data.agency_name}</strong> on MedHub.</p>
      <p><strong>Specialty:</strong> ${data.doctor_specialty}</p>
      <p><strong>Grade:</strong> ${data.doctor_grade}</p>
      <p style="margin-top: 24px;"><a href="https://medhub.vercel.app/agency-dashboard" style="background: #1d4ed8; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">View on MedHub</a></p>
    </div>`;
  }

  if (type === "document_share") {
    to = data.agency_email;
    subject = `Dr. ${data.doctor_name} shared a document with you`;
    html = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 24px;">
      <h2 style="color: #1d4ed8;">Document Shared</h2>
      <p>Dr. <strong>${data.doctor_name}</strong> has shared <strong>${data.file_name}</strong> with <strong>${data.agency_name}</strong>.</p>
      <p style="margin-top: 24px;"><a href="https://medhub.vercel.app/agency-dashboard" style="background: #1d4ed8; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">View Document</a></p>
    </div>`;
  }

  if (!to) {
    return new Response(JSON.stringify({ success: false, error: "Unknown email type" }), { status: 400 });
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: SENDER_EMAIL, to, subject, html }),
  });

  const result = await res.json();
  return new Response(JSON.stringify({ success: true, result }), { headers: { "Content-Type": "application/json" } });
});