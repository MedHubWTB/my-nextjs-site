import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SENDER_EMAIL = Deno.env.get("SENDER_EMAIL") || "charlene@whatthebleep.co.uk";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY")!;

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: `MedHub <${SENDER_EMAIL}>`,
      to: [to],
      subject,
      html,
    }),
  });
  return res.json();
}

serve(async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const today = new Date();
  const in30Days = new Date(today);
  in30Days.setDate(today.getDate() + 30);
  const in7Days = new Date(today);
  in7Days.setDate(today.getDate() + 7);

  const in30Str = in30Days.toISOString().split("T")[0];
  const in7Str = in7Days.toISOString().split("T")[0];

  const { data: expiries } = await supabase
    .from("document_expiry")
    .select("id, expiry_date, reminder_30_sent, reminder_7_sent, documents(file_name, user_id), doctors!document_expiry_doctor_id_fkey(email, full_name, tier)");

  if (!expiries) {
    return new Response(JSON.stringify({ success: true, emailsSent: 0 }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  let emailsSent = 0;

  for (const expiry of expiries) {
    const e = expiry as Record<string, unknown>;
    const doctor = (Array.isArray(e.doctors) ? e.doctors[0] : e.doctors) as Record<string, string> | null;
    const document = (Array.isArray(e.documents) ? e.documents[0] : e.documents) as Record<string, string> | null;

    if (!doctor || doctor.tier !== "pro") continue;
    if (!document) continue;

    const expiryDate = e.expiry_date as string;
    const expiryFormatted = new Date(expiryDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

    if (expiryDate === in30Str && !e.reminder_30_sent) {
      await sendEmail(
        doctor.email,
        `⚠️ Document Expiring in 30 Days — ${document.file_name}`,
        `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;">
          <p style="font-weight:700;font-size:1.1rem;color:#1d4ed8;margin-bottom:24px;">MedHub</p>
          <h1 style="font-size:1.5rem;color:#0f172a;margin-bottom:8px;">Document Expiring Soon ⚠️</h1>
          <p style="color:#64748b;margin-bottom:24px;">Hi ${doctor.full_name}, one of your documents is expiring in <strong>30 days</strong>.</p>
          <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:14px;padding:20px 24px;margin-bottom:24px;">
            <p style="font-weight:700;color:#92400e;margin-bottom:4px;">${document.file_name}</p>
            <p style="color:#92400e;font-size:0.9rem;">Expires on ${expiryFormatted}</p>
          </div>
          <a href="https://eqkloogtlmyxidauetam.supabase.co/dashboard" style="display:inline-block;background:#1d4ed8;color:#fff;padding:12px 28px;border-radius:10px;font-weight:600;text-decoration:none;">View Document Vault →</a>
          <p style="color:#94a3b8;font-size:0.78rem;margin-top:28px;">You're receiving this because you have a MedHub Pro account.</p>
        </div>`
      );
      await supabase.from("document_expiry").update({ reminder_30_sent: true }).eq("id", e.id);
      emailsSent++;
    }

    if (expiryDate === in7Str && !e.reminder_7_sent) {
      await sendEmail(
        doctor.email,
        `🚨 URGENT: Document Expiring in 7 Days — ${document.file_name}`,
        `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;">
          <p style="font-weight:700;font-size:1.1rem;color:#1d4ed8;margin-bottom:24px;">MedHub</p>
          <h1 style="font-size:1.5rem;color:#dc2626;margin-bottom:8px;">URGENT: Document Expiring in 7 Days 🚨</h1>
          <p style="color:#64748b;margin-bottom:24px;">Hi ${doctor.full_name}, one of your documents expires in <strong>7 days</strong>. Please renew it as soon as possible.</p>
          <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:14px;padding:20px 24px;margin-bottom:24px;">
            <p style="font-weight:700;color:#dc2626;margin-bottom:4px;">${document.file_name}</p>
            <p style="color:#dc2626;font-size:0.9rem;">Expires on ${expiryFormatted}</p>
          </div>
          <a href="https://eqkloogtlmyxidauetam.supabase.co/dashboard" style="display:inline-block;background:#dc2626;color:#fff;padding:12px 28px;border-radius:10px;font-weight:600;text-decoration:none;">Renew Now →</a>
          <p style="color:#94a3b8;font-size:0.78rem;margin-top:28px;">You're receiving this because you have a MedHub Pro account.</p>
        </div>`
      );
      await supabase.from("document_expiry").update({ reminder_7_sent: true }).eq("id", e.id);
      emailsSent++;
    }
  }

  return new Response(
    JSON.stringify({ success: true, emailsSent }),
    { headers: { "Content-Type": "application/json" } }
  );
});
