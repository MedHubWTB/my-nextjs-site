import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SENDER_EMAIL = Deno.env.get("SENDER_EMAIL") || "charlene@whatthebleep.co.uk";

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

serve(async (req) => {
  const { type, data } = await req.json();

  try {
    if (type === "connection_request") {
      // Agency gets notified when a doctor wants to connect
      const { agency_email, agency_name, doctor_name, doctor_specialty, doctor_grade } = data;
      await sendEmail(
        agency_email,
        `New Connection Request — ${doctor_name}`,
        `
          <div style="font-family: 'DM Sans', sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 28px;">
              <div style="width: 32px; height: 32px; background: #1d4ed8; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                <span style="color: #fff; font-weight: 700; font-size: 16px;">+</span>
              </div>
              <span style="font-weight: 700; font-size: 1.1rem; color: #1d4ed8;">MedHub</span>
            </div>
            <h1 style="font-size: 1.5rem; color: #0f172a; margin-bottom: 8px;">New Connection Request 🏥</h1>
            <p style="color: #64748b; margin-bottom: 24px;">Hi ${agency_name}, a doctor wants to connect with your agency on MedHub.</p>
            <div style="background: #f8faff; border: 1px solid #e8f0fe; border-radius: 14px; padding: 20px 24px; margin-bottom: 24px;">
              <p style="font-weight: 700; font-size: 1rem; color: #0f172a; margin-bottom: 8px;">${doctor_name}</p>
              <p style="color: #64748b; font-size: 0.9rem;">${doctor_specialty || "No specialty set"} · ${doctor_grade || "No grade set"}</p>
            </div>
            <a href="https://medhub.app/agency-dashboard" style="display: inline-block; background: #1d4ed8; color: #fff; padding: 12px 28px; border-radius: 10px; font-weight: 600; text-decoration: none; font-size: 0.95rem;">
              Review Request →
            </a>
            <p style="color: #94a3b8; font-size: 0.78rem; margin-top: 28px;">You're receiving this because you have a MedHub agency account.</p>
          </div>
        `
      );
    }

    if (type === "document_share") {
      // Agency gets notified when a doctor shares a document
      const { agency_email, agency_name, doctor_name, file_name } = data;
      await sendEmail(
        agency_email,
        `New Document Shared — ${doctor_name}`,
        `
          <div style="font-family: 'DM Sans', sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 28px;">
              <div style="width: 32px; height: 32px; background: #1d4ed8; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                <span style="color: #fff; font-weight: 700; font-size: 16px;">+</span>
              </div>
              <span style="font-weight: 700; font-size: 1.1rem; color: #1d4ed8;">MedHub</span>
            </div>
            <h1 style="font-size: 1.5rem; color: #0f172a; margin-bottom: 8px;">Document Shared 📄</h1>
            <p style="color: #64748b; margin-bottom: 24px;">Hi ${agency_name}, a doctor has shared a document with your agency.</p>
            <div style="background: #f8faff; border: 1px solid #e8f0fe; border-radius: 14px; padding: 20px 24px; margin-bottom: 24px;">
              <p style="font-weight: 700; font-size: 1rem; color: #0f172a; margin-bottom: 4px;">${file_name}</p>
              <p style="color: #64748b; font-size: 0.9rem;">Shared by ${doctor_name}</p>
            </div>
            <a href="https://medhub.app/agency-dashboard" style="display: inline-block; background: #1d4ed8; color: #fff; padding: 12px 28px; border-radius: 10px; font-weight: 600; text-decoration: none; font-size: 0.95rem;">
              View Document →
            </a>
            <p style="color: #94a3b8; font-size: 0.78rem; margin-top: 28px;">You're receiving this because you have a MedHub agency account.</p>
          </div>
        `
      );
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});