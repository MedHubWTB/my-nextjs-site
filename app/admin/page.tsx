"use client";

import { notify } from "../lib/notify";
import NotificationBell from "../components/NotificationBell";
import { useEffect, useState, useRef } from "react";
import { supabase } from "../lib/supabase";
import { useRouter } from "next/navigation";
import { useRealtimeSync } from "../hooks/useRealtimeSync";

type UserView = {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  role: string;
  display_name: string;
  tier: string;
  specialty: string | null;
  grade: string | null;
  gmc_number: string | null;
  agency_name: string | null;
  confirmed: boolean;
};

type Doctor = {
  user_id: string;
  full_name: string;
  email: string;
  specialty: string | null;
  grade: string | null;
  phone: string | null;
  gmc_number: string | null;
  preferred_location: string | null;
  tier: string;
  is_verified?: boolean;
};

type Agency = {
  id: string;
  agency_name: string;
  contact_email: string;
  contact_person_name: string | null;
  contact_phone: string | null;
  tier: string;
  required_specialties: string | null;
  required_grades: string | null;
};

type Connection = {
  doctor_name: string;
  doctor_email: string;
  agency_name: string;
  connected_at: string;
  status: string;
};
const WELCOME_EMAIL = {
  subject: "Your quiet account is ready — here's how to log in",
  body: `Hi Dr. [Name],

We've been busy building something we think you're going to love.

quiet has launched — your all-in-one compliance passport and locum management platform.

Here's what's waiting for you:

🔒 Digital Compliance Vault — store all your documents in one secure place. GMC certificate, DBS, Right to Work, indemnity — everything in one place, shareable with agencies in one click.

📋 Digital CV — your specialty, grade and GMC number verified and ready to share.

🛡️ Privacy Shield — agencies can only see your documents if you approve it. No spam, no cold calls.

How to log in:

1. Go to https://my-nextjs-site.vercel.app/otp-login
2. Enter your email address
3. You'll receive a 6-digit code — enter it and you're in
4. Complete your profile in under 2 minutes

No password needed — just your email.

Any questions? Reply to this email and we'll help you get set up.

Welcome to quiet 👋

— The quiet Team`,
};

const SUPABASE_URL_CLIENT = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY_CLIENT = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function ImportTab() {
  const [importType, setImportType] = useState<"agencies" | "doctors">("agencies");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Record<string, string>[]>([]);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<{ success: number; errors: string[] } | null>(null);
  const [defaultTier, setDefaultTier] = useState("basic");
  const [defaultPassword, setDefaultPassword] = useState("Quiet2026!");
  const fileRef = useRef<HTMLInputElement>(null);

  const parseCSV = (text: string): Record<string, string>[] => {
    const lines = text.split("\n").filter(l => l.trim());
    if (lines.length < 2) return [];
    const headers = lines[0].split(",").map(h => h.trim().replace(/"/g, "").toLowerCase());
    return lines.slice(1).map(line => {
      const values = line.split(",").map(v => v.trim().replace(/"/g, ""));
      const row: Record<string, string> = {};
      headers.forEach((h, i) => { row[h] = values[i] || ""; });
      return row;
    }).filter(row => Object.values(row).some(v => v));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setResults(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const rows = parseCSV(text);
      setPreview(rows.slice(0, 5));
    };
    reader.readAsText(f);
  };

  const getColumnValue = (row: Record<string, string>, possibleKeys: string[]): string => {
    for (const key of possibleKeys) {
      const found = Object.keys(row).find(k => k.toLowerCase().includes(key.toLowerCase()));
      if (found && row[found]) return row[found];
    }
    return "";
  };

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    setResults(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const rows = parseCSV(text);
      let success = 0;
      const errors: string[] = [];

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

      for (const row of rows) {
        try {
          if (importType === "agencies") {
            const agencyName = getColumnValue(row, ["agency name", "agency", "name"]);
            const contactEmail = getColumnValue(row, ["contact person's email", "contact email", "email"]);
            const contactPerson = getColumnValue(row, ["contact person", "contact"]);
            const phone = getColumnValue(row, ["phone", "phone number"]);
            const address = getColumnValue(row, ["address", "location"]);

            if (!agencyName) { errors.push(`Row skipped — no agency name`); continue; }
            // Skip account creation for Not Interested
            const statusVal = getColumnValue(row, ["status"]).toLowerCase();
            const isNotInterested = statusVal.includes("not interested") || statusVal.includes("not_interested");

            if (isNotInterested) {
              await supabase.from("crm_leads").insert({
                type: "agency",
                name: agencyName,
                email: getColumnValue(row, ["contact person's email", "contact email", "email"]) || null,
                phone: getColumnValue(row, ["phone", "phone number"]) || null,
                company: agencyName,
                source: "direct",
                status: "not_interested",
                notes: `Imported from CSV. Status: Not Interested`,
              });
              success++;
              continue;
            }

            // Map status to CRM
            const crmStatus = statusVal.includes("inqui") ? "new" :
                              statusVal.includes("active") ? "signed_up" :
                              statusVal.includes("prospect") ? "contacted" : "new";

            // Create auth user if email provided
            let userId = null;
            if (contactEmail) {
              const res = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${supabaseKey}`,
                  "apikey": supabaseKey,
                },
                body: JSON.stringify({
                  email: contactEmail,
                  password: defaultPassword,
                  email_confirm: true,
                }),
              });
              const userData = await res.json();
              userId = userData.id;
            }

            // Create agency record
            const { data: agData, error: agError } = await supabase
              .from("agencies")
              .insert({
                agency_name: agencyName,
                contact_person_name: contactPerson || null,
                contact_email: contactEmail || null,
                contact_phone: phone || null,
                location_tags: address || null,
                tier: defaultTier,
              })
              .select()
              .single();

            if (agError) { errors.push(`${agencyName}: ${agError.message}`); continue; }

            // Link user to agency
            if (userId && agData) {
              await supabase.from("agency_users").insert({ user_id: userId, agency_id: agData.id });
              await supabase.from("user_profiles").upsert({ id: userId, role: "agency" }, { onConflict: "id" });
            }

            success++;

            // Add to CRM
            await supabase.from("crm_leads").insert({
              type: "agency",
              name: agencyName,
              email: contactEmail || null,
              phone: phone || null,
              company: agencyName,
              source: "direct",
              status: crmStatus,
              notes: `Imported from CSV. Original status: ${getColumnValue(row, ["status"]) || "unknown"}`,
            });

          } else {
            // Doctor import
            const email = getColumnValue(row, ["email"]);
            const fullName = getColumnValue(row, ["name", "full name", "doctor name"]);
            const specialty = getColumnValue(row, ["specialty", "speciality"]);
            const grade = getColumnValue(row, ["grade"]);
            const gmc = getColumnValue(row, ["gmc", "gmc number"]);
            const phone = getColumnValue(row, ["phone", "phone number"]);

            if (!email) { errors.push(`Row skipped — no email`); continue; }

            // Create auth user
            const res = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${supabaseKey}`,
                "apikey": supabaseKey,
              },
              body: JSON.stringify({
                email,
                password: defaultPassword,
                email_confirm: true,
              }),
            });
            const userData = await res.json();

            if (!userData.id) { errors.push(`${email}: ${userData.message || "Failed to create user"}`); continue; }

            // Create doctor record
            await supabase.from("doctors").upsert({
              user_id: userData.id,
              full_name: fullName || null,
              email,
              phone: phone || null,
              specialty: specialty || null,
              grade: grade || null,
              gmc_number: gmc || null,
              tier: "basic",
              onboarding_completed: fullName && specialty && grade ? true : false,
            }, { onConflict: "user_id" });

            await supabase.from("user_profiles").upsert({ id: userData.id, role: "doctor" }, { onConflict: "id" });

            success++;
          }
        } catch (e) {
          errors.push(`Row error: ${e}`);
        }
      }

      setImporting(false);
      setResults({ success, errors });
    };
    reader.readAsText(file);
  };

  return (
    <div className="fade-up">
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: "1.3rem", fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>CSV Import</h2>
        <p style={{ fontSize: "0.85rem", color: "#94a3b8" }}>Bulk import agencies or doctors from your Microsoft list.</p>
      </div>

      {/* Type selector */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ fontWeight: 700, fontSize: "0.9rem", color: "#0f172a", marginBottom: 16 }}>What are you importing?</h3>
        <div style={{ display: "flex", gap: 12 }}>
          {[
            { key: "agencies", label: "🏥 Agencies", desc: "Import agency accounts from your list" },
            { key: "doctors", label: "👨‍⚕️ Doctors", desc: "Import doctor accounts from your list" },
          ].map(option => (
            <div
              key={option.key}
              onClick={() => { setImportType(option.key as "agencies" | "doctors"); setFile(null); setPreview([]); setResults(null); }}
              style={{ flex: 1, padding: "16px", borderRadius: 12, border: `2px solid ${importType === option.key ? "#7c3aed" : "#e2e8f0"}`, background: importType === option.key ? "#f5f3ff" : "#fff", cursor: "pointer", transition: "all 0.15s" }}
            >
              <p style={{ fontWeight: 700, fontSize: "0.9rem", color: importType === option.key ? "#7c3aed" : "#0f172a", marginBottom: 4 }}>{option.label}</p>
              <p style={{ fontSize: "0.78rem", color: "#64748b" }}>{option.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Settings */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ fontWeight: 700, fontSize: "0.9rem", color: "#0f172a", marginBottom: 16 }}>Import Settings</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Default Tier
            </label>
            <select className="input-field" value={defaultTier} onChange={e => setDefaultTier(e.target.value)}>
              <option value="basic">Base</option>
              <option value="pro">Pro</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Default Password
            </label>
            <input className="input-field" type="text" value={defaultPassword} onChange={e => setDefaultPassword(e.target.value)} placeholder="Quiet2026!" />
          </div>
        </div>
        <p style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: 10 }}>
          💡 All imported users will be created with this password. They can reset it via Forgot Password.
        </p>
      </div>

      {/* Expected format */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ fontWeight: 700, fontSize: "0.9rem", color: "#0f172a", marginBottom: 12 }}>Expected CSV Format</h3>
        {importType === "agencies" ? (
          <div>
            <p style={{ fontSize: "0.82rem", color: "#64748b", marginBottom: 8 }}>Your agency CSV should have these columns (in any order):</p>
            <div style={{ background: "#f8f9fc", borderRadius: 8, padding: "12px 14px", fontFamily: "monospace", fontSize: "0.78rem", color: "#334155", border: "1px solid #e2e8f0" }}>
              Agency name (T), Email, Contact person, Contact person&apos;s email, Phone number, Address, Status
            </div>
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
              <p style={{ fontSize: "0.78rem", fontWeight: 600, color: "#64748b", marginBottom: 4 }}>Status mapping:</p>
              {[
                { status: "Active", maps: "Creates agency account + CRM: Signed Up", color: "#16a34a" },
                { status: "Inquiry", maps: "Creates agency account + CRM: New lead", color: "#7c3aed" },
                { status: "Not Interested", maps: "CRM only — no account created", color: "#dc2626" },
                { status: "Prospect / Other", maps: "Creates agency account + CRM: Contacted", color: "#92400e" },
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, padding: "2px 8px", borderRadius: 100, background: "#f8f9fc", color: item.color, border: `1px solid ${item.color}20`, whiteSpace: "nowrap" }}>{item.status}</span>
                  <span style={{ fontSize: "0.75rem", color: "#64748b" }}>→ {item.maps}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <p style={{ fontSize: "0.82rem", color: "#64748b", marginBottom: 8 }}>Your doctor CSV should have these columns (in any order):</p>
            <div style={{ background: "#f8f9fc", borderRadius: 8, padding: "12px 14px", fontFamily: "monospace", fontSize: "0.78rem", color: "#334155", border: "1px solid #e2e8f0" }}>
              full_name, email, phone, specialty, grade, gmc_number
            </div>
          </div>
        )}
      </div>

      {/* File upload */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ fontWeight: 700, fontSize: "0.9rem", color: "#0f172a", marginBottom: 16 }}>Upload CSV File</h3>
        <div
          onClick={() => fileRef.current?.click()}
          style={{ border: `2px dashed ${file ? "#7c3aed" : "#e2e8f0"}`, borderRadius: 12, padding: "32px", textAlign: "center", cursor: "pointer", background: file ? "#f5f3ff" : "#f8f9fc", transition: "all 0.2s" }}
        >
          <input ref={fileRef} type="file" accept=".csv,.txt" style={{ display: "none" }} onChange={handleFileChange} />
          {file ? (
            <div>
              <div style={{ fontSize: "2rem", marginBottom: 8 }}>✅</div>
              <p style={{ fontWeight: 700, color: "#7c3aed", fontSize: "0.9rem" }}>{file.name}</p>
              <p style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: 4 }}>{(file.size / 1024).toFixed(0)} KB · Click to change</p>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: "2rem", marginBottom: 8 }}>📂</div>
              <p style={{ fontWeight: 600, color: "#374151", fontSize: "0.9rem" }}>Click to select your CSV file</p>
              <p style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: 4 }}>CSV or TXT format</p>
            </div>
          )}
        </div>
      </div>

      {/* Preview */}
      {preview.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ fontWeight: 700, fontSize: "0.9rem", color: "#0f172a", marginBottom: 12 }}>
            Preview (first {preview.length} rows)
          </h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
              <thead>
                <tr>
                  {Object.keys(preview[0]).map(h => (
                    <th key={h} style={{ padding: "8px 10px", textAlign: "left", borderBottom: "1px solid #e2e8f0", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((row, i) => (
                  <tr key={i}>
                    {Object.values(row).map((val, j) => (
                      <td key={j} style={{ padding: "8px 10px", borderBottom: "1px solid #f1f5f9", color: "#374151", maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{val || "—"}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="card" style={{ marginBottom: 20, background: results.errors.length === 0 ? "#f0fdf4" : "#fffbeb", border: `1px solid ${results.errors.length === 0 ? "#bbf7d0" : "#fde68a"}` }}>
          <h3 style={{ fontWeight: 700, fontSize: "0.9rem", color: "#0f172a", marginBottom: 12 }}>Import Results</h3>
          <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
            <span style={{ fontSize: "0.88rem", color: "#16a34a", fontWeight: 600 }}>✅ {results.success} imported successfully</span>
            {results.errors.length > 0 && <span style={{ fontSize: "0.88rem", color: "#dc2626", fontWeight: 600 }}>❌ {results.errors.length} failed</span>}
          </div>
          {results.errors.length > 0 && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "12px", maxHeight: 200, overflowY: "auto" }}>
              {results.errors.map((err, i) => (
                <p key={i} style={{ fontSize: "0.78rem", color: "#dc2626", marginBottom: 4 }}>• {err}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Import button */}
      {file && !results && (
        <button
          onClick={handleImport}
          disabled={importing}
          style={{ width: "100%", background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "#fff", border: "none", padding: "14px", borderRadius: 12, fontWeight: 700, fontSize: "0.95rem", cursor: importing ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: importing ? 0.7 : 1 }}
        >
          {importing ? "Importing... please wait" : `Import ${importType === "agencies" ? "Agencies" : "Doctors"} from CSV`}
        </button>
      )}
    </div>
  );
}
function BroadcastTab() {
  const [subject, setSubject] = useState(WELCOME_EMAIL.subject);
  const [body, setBody] = useState(WELCOME_EMAIL.body);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent?: number; error?: string } | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const handleSend = async () => {
    if (!confirmed) { setResult({ error: "Please confirm before sending." }); return; }
    setSending(true);
    setResult(null);
    try {
      const res = await fetch(`${SUPABASE_URL_CLIENT}/functions/v1/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SUPABASE_ANON_KEY_CLIENT}` },
        body: JSON.stringify({ type: "broadcast", data: { subject, body } }),
      });
      const data = await res.json();
      if (data.success) setResult({ sent: data.sent });
      else setResult({ error: data.error || "Something went wrong." });
    } catch {
      setResult({ error: "Failed to send. Check your edge function." });
    }
    setSending(false);
    setConfirmed(false);
  };

  return (
    <div className="fade-up">
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: "1.3rem", color: "#0f172a", marginBottom: 4 }}>Email Broadcasts</h2>
        <p style={{ fontSize: "0.85rem", color: "#94a3b8" }}>Send emails to all doctors on quiet via Resend. Personalised with their first name automatically.</p>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          <button
            onClick={() => { setSubject(WELCOME_EMAIL.subject); setBody(WELCOME_EMAIL.body); setResult(null); setConfirmed(false); }}
            style={{ background: "#f5f3ff", color: "#334155", border: "1.5px solid #ddd6fe", padding: "8px 16px", borderRadius: 10, fontSize: "0.82rem", fontWeight: 600, cursor: "pointer", fontFamily: "Inter, sans-serif" }}
          >
            📧 Load Welcome Email
          </button>
          <button
            onClick={() => { setSubject(""); setBody(""); setResult(null); setConfirmed(false); }}
            style={{ background: "#f1f5f9", color: "#64748b", border: "1.5px solid #e0eaff", padding: "8px 16px", borderRadius: 10, fontSize: "0.82rem", fontWeight: 600, cursor: "pointer", fontFamily: "Inter, sans-serif" }}
          >
            ✏️ Write Custom Email
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Subject Line</label>
            <input
              style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #e0eaff", borderRadius: 10, fontSize: "0.9rem", color: "#0f172a", background: "#fff", outline: "none", fontFamily: "Inter, sans-serif" }}
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Email subject..."
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Email Body
              <span style={{ marginLeft: 8, fontSize: "0.72rem", color: "#94a3b8", textTransform: "none", fontWeight: 400 }}>Use [Name] to personalise with doctor's first name</span>
            </label>
            <textarea
              style={{ width: "100%", padding: "12px 14px", border: "1.5px solid #e0eaff", borderRadius: 10, fontSize: "0.88rem", color: "#0f172a", background: "#fff", outline: "none", fontFamily: "Inter, sans-serif", resize: "vertical", lineHeight: 1.7 }}
              rows={16}
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Write your email here..."
            />
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ fontWeight: 700, fontSize: "0.95rem", color: "#0f172a", marginBottom: 16 }}>Send Broadcast</h3>
        <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: "12px 16px", marginBottom: 16, fontSize: "0.85rem", color: "#92400e" }}>
          ⚠️ This will send an email to <strong>every doctor</strong> registered on quiet. Make sure your email is ready before sending.
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, padding: "12px 14px", background: "#f8faff", borderRadius: 10, border: "1px solid #e2e8f0", cursor: "pointer" }} onClick={() => setConfirmed(!confirmed)}>
          <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${confirmed ? "#334155" : "#e0eaff"}`, background: confirmed ? "#334155" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.15s" }}>
            {confirmed && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          </div>
          <span style={{ fontSize: "0.85rem", color: "#374151", fontWeight: 500 }}>I confirm I want to send this email to all doctors</span>
        </div>

        {result?.sent && (
          <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "12px 16px", marginBottom: 16, fontSize: "0.85rem", color: "#16a34a", fontWeight: 600 }}>
            ✅ Successfully sent to {result.sent} doctor{result.sent !== 1 ? "s" : ""}!
          </div>
        )}
        {result?.error && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "12px 16px", marginBottom: 16, fontSize: "0.85rem", color: "#dc2626" }}>
            ❌ {result.error}
          </div>
        )}

        <button
          onClick={handleSend}
          disabled={sending || !subject || !body || !confirmed}
          style={{ background: "#334155", color: "#fff", border: "none", padding: "13px 28px", borderRadius: 10, fontWeight: 700, fontSize: "0.95rem", cursor: sending || !confirmed ? "not-allowed" : "pointer", fontFamily: "Inter, sans-serif", opacity: sending || !confirmed ? 0.6 : 1 }}
        >
          {sending ? "Sending..." : "📧 Send Broadcast"}
        </button>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview"|"doctors"|"agencies"|"connections"|"broadcasts"|"users"|"imports"|"feedback"|"support">("overview");

const changeTab = (tab: typeof activeTab) => {
  changeTab(tab);
  localStorage.setItem("admin_active_tab", tab);
};

useEffect(() => {
  const saved = localStorage.getItem("admin_active_tab");
  if (saved) changeTab(saved as typeof activeTab);
}, []);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [savingTier, setSavingTier] = useState<string | null>(null);
  useRealtimeSync({
  isAdmin: true,
  onAnyDoctorUpdate: (updated) => {
    setDoctors(prev => prev.map(d => d.user_id === updated.user_id ? { ...d, ...updated } : d));
    setUsers(prev => prev.map(u => u.id === updated.user_id ? { ...u, ...updated } : u));
  },
  onAnyAgencyUpdate: (updated) => {
    setAgencies(prev => prev.map(a => a.id === updated.id ? { ...a, ...updated } : a));
  },
  onAnyConnectionUpdate: (updated) => {
    setConnections(prev => prev.map(c => c.doctor_email === updated.doctor_email ? { ...c, ...updated } : c));
  },
  onAnySupportUpdate: (updated) => {
    setSupportMessages(prev => prev.map(m => m.id === updated.id ? { ...m, ...updated } : m));
  },
  onAnyFeatureRequestUpdate: (updated) => {
    setFeatureRequests(prev => prev.map(f => f.id === updated.id ? { ...f, ...updated } : f));
  },
});
  const [msg, setMsg] = useState("");
  const [currentUserEmail, setCurrentUserEmail] = useState("");
  const [currentUserId, setCurrentUserId] = useState("");
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<UserView[]>([]);
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [tierFilter, setTierFilter] = useState("all");
  const [showAddDoctorModal, setShowAddDoctorModal] = useState(false);
const [newDoctorEmail, setNewDoctorEmail] = useState("");
const [newDoctorName, setNewDoctorName] = useState("");
const [newDoctorPassword, setNewDoctorPassword] = useState("Quiet2026!");
const [addingDoctor, setAddingDoctor] = useState(false);
  const [supportMessages, setSupportMessages] = useState<{ id: string; user_id: string; user_type: string; subject: string; message: string; status: string; created_at: string }[]>([]);
  const [featureRequests, setFeatureRequests] = useState<{ id: string; title: string; description: string; category: string; status: string; votes: number; created_at: string; doctor_id: string }[]>([]);
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setCurrentUserEmail(user.email || "");
      setCurrentUserId(user.id);

      const { data: adminData } = await supabase
        .from("admins")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!adminData) { router.push("/"); return; }
      setAuthorized(true);

      const { data: docs } = await supabase
        .from("doctors")
        .select("*")
        .order("full_name", { ascending: true });
      if (docs) setDoctors(docs);

      const { data: ags } = await supabase
        .from("agencies")
        .select("*")
        .order("agency_name", { ascending: true });
      if (ags) setAgencies(ags);

      const { data: conns } = await supabase
        .from("doctor_agencies")
        .select("connected_at, status, doctors(full_name, email), agencies(agency_name)");
      if (conns) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mapped = conns.map((c: any) => ({
          doctor_name: Array.isArray(c.doctors) ? c.doctors[0]?.full_name || "Unknown" : c.doctors?.full_name || "Unknown",
          doctor_email: Array.isArray(c.doctors) ? c.doctors[0]?.email || "" : c.doctors?.email || "",
          agency_name: Array.isArray(c.agencies) ? c.agencies[0]?.agency_name || "Unknown" : c.agencies?.agency_name || "Unknown",
          connected_at: c.connected_at,
          status: c.status,
        }));
        setConnections(mapped);
      }

      const { data: usersData } = await supabase
        .from("admin_users_view")
        .select("*")
        .order("created_at", { ascending: false });
      if (usersData) setUsers(usersData);

      const { data: featData } = await supabase
        .from("feature_requests")
        .select("*")
        .order("votes", { ascending: false });
      if (featData) setFeatureRequests(featData);
      const { data: supportData } = await supabase
        .from("support_messages")
        .select("*")
        .order("created_at", { ascending: false });
      if (supportData) setSupportMessages(supportData);

      setLoading(false);
    };
    init();
  }, [router]);

  const handleDoctorTier = async (user_id: string, tier: string) => {
    setSavingTier(user_id);
    const { error } = await supabase.from("doctors").update({ tier }).eq("user_id", user_id);
    // Notify doctor of tier change
if (!error) {
  await notify(user_id, "Your Plan Has Been Updated! 🎉", `Your account has been upgraded to the ${tier.charAt(0).toUpperCase() + tier.slice(1)} plan.`, "success", "/dashboard");
}
    if (!error) {
      setDoctors(prev => prev.map(d => d.user_id === user_id ? { ...d, tier } : d));
      setMsg("Tier updated!");
      setTimeout(() => setMsg(""), 2500);
    }
    setSavingTier(null);
  };

  const handleAgencyTier = async (id: string, tier: string) => {
    setSavingTier(id);
    const { error } = await supabase.from("agencies").update({ tier }).eq("id", id);
    // Notify agency of tier change
if (!error) {
  const agencyToNotify = agencies.find(a => a.id === id);
  if (agencyToNotify) {
    const { data: agUser } = await supabase.from("agency_users").select("user_id").eq("agency_id", id).single();
    if (agUser) {
      await notify(agUser.user_id, "Your Plan Has Been Updated! 🎉", `Your agency has been upgraded to the ${tier.charAt(0).toUpperCase() + tier.slice(1)} plan.`, "success", "/agency-dashboard");
    }
  }
}
    if (!error) {
      setAgencies(prev => prev.map(a => a.id === id ? { ...a, tier } : a));
      setMsg("Tier updated!");
      setTimeout(() => setMsg(""), 2500);
    }
    setSavingTier(null);
  };

  const handleSignOut = async () => { await supabase.auth.signOut(); router.push("/"); };

  const filteredDoctors = doctors.filter(d =>
    d.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    d.email?.toLowerCase().includes(search.toLowerCase()) ||
    d.specialty?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredAgencies = agencies.filter(a =>
    a.agency_name?.toLowerCase().includes(search.toLowerCase()) ||
    a.contact_email?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredConnections = connections.filter(c =>
    c.doctor_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.agency_name?.toLowerCase().includes(search.toLowerCase())
  );

  const getTierBadge = (tier: string, type: "doctor" | "agency") => {
    const badges: Record<string, { label: string; bg: string; color: string }> = {
      advanced: { label: "⚡ Advanced", bg: "linear-gradient(135deg, #0f172a, #334155)", color: "#fff" },
      pro: { label: "💎 Pro", bg: "linear-gradient(135deg, #6d28d9, #4f46e5)", color: "#fff" },
      basic: { label: "Base", bg: "#f1f5f9", color: "#64748b" },
    };
    return badges[tier] || badges.basic;
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#f8faff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter, sans-serif" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 40, height: 40, border: "3px solid #e0eaff", borderTop: "3px solid #334155", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
        <p style={{ color: "#94a3b8", fontSize: "0.9rem" }}>Loading admin dashboard...</p>
      {/* ADD DOCTOR MODAL */}
      {showAddDoctorModal && (
        <div className="modal-overlay" onClick={() => setShowAddDoctorModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 20, padding: 32, width: "100%", maxWidth: 440, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: "1.2rem", fontWeight: 700, color: "#0f172a" }}>Add Doctor</h2>
              <button onClick={() => setShowAddDoctorModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: "1.2rem" }}>✕</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Full Name</label>
                <input className="input-field" placeholder="Dr. Jane Smith" value={newDoctorName} onChange={e => setNewDoctorName(e.target.value)} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Email *</label>
                <input className="input-field" type="email" placeholder="doctor@example.com" value={newDoctorEmail} onChange={e => setNewDoctorEmail(e.target.value)} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Password</label>
                <input className="input-field" type="text" value={newDoctorPassword} onChange={e => setNewDoctorPassword(e.target.value)} />
              </div>
              <button
                onClick={async () => {
                  if (!newDoctorEmail) return;
                  setAddingDoctor(true);
                  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
                  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
                  const res = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${supabaseKey}`, "apikey": supabaseKey },
                    body: JSON.stringify({ email: newDoctorEmail, password: newDoctorPassword, email_confirm: true }),
                  });
                  const userData = await res.json();
                  if (userData.id) {
                    await supabase.from("doctors").upsert({ user_id: userData.id, full_name: newDoctorName || null, email: newDoctorEmail, tier: "basic", onboarding_completed: false }, { onConflict: "user_id" });
                    await supabase.from("user_profiles").upsert({ id: userData.id, role: "doctor" }, { onConflict: "id" });
                    setDoctors(prev => [...prev, { user_id: userData.id, full_name: newDoctorName, email: newDoctorEmail, specialty: null, grade: null, phone: null, gmc_number: null, preferred_location: null, tier: "basic" }]);
                    setMsg("Doctor added successfully!");
                    setTimeout(() => setMsg(""), 3000);
                    setShowAddDoctorModal(false);
                    setNewDoctorEmail("");
                    setNewDoctorName("");
                  } else {
                    setMsg("Failed to create doctor account.");
                  }
                  setAddingDoctor(false);
                }}
                disabled={addingDoctor || !newDoctorEmail}
                style={{ background: "linear-gradient(135deg, #1e293b, #334155)", color: "#fff", border: "none", padding: "13px", borderRadius: 12, fontWeight: 700, fontSize: "0.9rem", cursor: "pointer", fontFamily: "inherit" }}
              >
                {addingDoctor ? "Adding..." : "Add Doctor"}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );

  if (!authorized) return null;

  const totalPro = doctors.filter(d => d.tier === "pro").length;
  const totalAdvanced = doctors.filter(d => d.tier === "advanced").length;
  const totalBase = doctors.filter(d => d.tier === "basic" || !d.tier).length;
  const agencyPro = agencies.filter(a => a.tier === "pro").length;
  const agencyAdvanced = agencies.filter(a => a.tier === "advanced").length;
  const agencyBase = agencies.filter(a => a.tier === "basic" || !a.tier).length;

  return (
    <div style={{ minHeight: "100vh", background: "#f8f9fc", fontFamily: "Inter, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .sidebar-link { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-radius: 10px; font-size: 0.9rem; font-weight: 500; color: #64748b; cursor: pointer; transition: all 0.15s; border: none; background: none; width: 100%; text-align: left; font-family: Inter, sans-serif; }
        .sidebar-link:hover { background: #f5f3ff; color: #334155; }
        .sidebar-link.active { background: #334155; color: #fff; }
        .card { background: #fff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 24px; }
        .input-field { width: 100%; padding: 10px 14px; border: 1.5px solid #e0eaff; border-radius: 10px; font-size: 0.9rem; color: #0f172a; background: #fff; outline: none; font-family: Inter, sans-serif; transition: border-color 0.2s; }
        .input-field:focus { border-color: #334155; }
        .tier-select { padding: 5px 10px; border: 1.5px solid #e0eaff; border-radius: 8px; font-size: 0.82rem; font-family: Inter, sans-serif; color: #0f172a; background: #fff; cursor: pointer; outline: none; }
        .tier-select:focus { border-color: #334155; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        .fade-up { animation: fadeUp 0.4s ease both; }
        table { width: 100%; border-collapse: collapse; }
        th { font-size: 0.72rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.06em; padding: 10px 12px; text-align: left; border-bottom: 1px solid #f1f5f9; }
        td { font-size: 0.85rem; color: #374151; padding: 12px 12px; border-bottom: 1px solid #f8faff; vertical-align: middle; }
        tr:last-child td { border-bottom: none; }
        tr:hover td { background: #f8faff; }
      `}</style>

      {/* SIDEBAR */}
      <div className="qm-sidebar" style={{ position: "fixed", top: 0, left: 0, width: 240, height: "100vh", background: "#fff", borderRight: "1px solid #e2e8f0", display: "flex", flexDirection: "column", padding: "24px 16px", zIndex: 40 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, padding: "0 6px" }}>
          <div style={{ width: 30, height: 30, background: "#334155", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none"><path d="M9 2v14M2 9h14" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/></svg>
          </div>
          <span style={{ fontWeight: 700, fontSize: "1rem", color: "#7c3aed", letterSpacing: "-0.02em" }}>Quiet<span style={{ color: "#334155" }}>.</span></span>
        </div>
        <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", padding: "0 6px", marginBottom: 20 }}>Admin Panel</div>

        <nav style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
  <a href="/admin/crm" style={{ textDecoration: "none", width: "100%" }}>
    <button className="sidebar-link">
      <span>📊</span> CRM Pipeline
    </button>
  </a>
  {([
    { key: "overview", label: "Overview", icon: "⊞" },
    { key: "doctors", label: "Doctors", icon: "👨‍⚕️", count: doctors.length },
    { key: "agencies", label: "Agencies", icon: "🏥", count: agencies.length },
    { key: "connections", label: "Connections", icon: "🔗", count: connections.length },
    { key: "broadcasts", label: "Email Broadcasts", icon: "📧" },
    { key: "users", label: "User Management", icon: "👥" },
    { key: "imports", label: "CSV Import", icon: "📥" },
    { key: "feedback", label: "Feature Requests", icon: "💡" },
    { key: "support", label: "Support Messages", icon: "💬" },
  ] as { key: "overview"|"doctors"|"agencies"|"connections"|"broadcasts"|"users"|"imports"; label: string; icon: string; count?: number }[]).map(item => (
            <button key={item.key} className={`sidebar-link ${activeTab === item.key ? "active" : ""}`} onClick={() => { changeTab(item.key); setSearch(""); }}>
              <span>{item.icon}</span>{item.label}
              {item.count !== undefined && (
                <span style={{ marginLeft: "auto", background: activeTab === item.key ? "rgba(255,255,255,0.25)" : "#f1f5f9", color: activeTab === item.key ? "#fff" : "#64748b", fontSize: "0.72rem", fontWeight: 700, padding: "2px 8px", borderRadius: 100 }}>{item.count}</span>
              )}
            </button>
          ))}
        </nav>

        <div style={{ padding: "12px 6px", borderTop: "1px solid #f1f5f9", marginTop: 12 }}>
          <p style={{ fontSize: "0.75rem", color: "#94a3b8", marginBottom: 4 }}>Signed in as</p>
          <p style={{ fontSize: "0.82rem", fontWeight: 600, color: "#374151", marginBottom: 12 }}>{currentUserEmail}</p>
          <button className="sidebar-link" onClick={handleSignOut} style={{ color: "#ef4444" }}>
            <span>🚪</span> Sign out
          </button>
        </div>
      </div>

      {/* MAIN */}
      <div className="qm-main-content" style={{ marginLeft: 240, padding: "32px 32px 64px" }}>

        {/* Top bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
          <div>
            <p style={{ fontSize: "0.82rem", color: "#94a3b8", marginBottom: 2 }}>quiet Admin</p>
            <h1 style={{ fontFamily: "Inter, sans-serif", fontSize: "1.6rem", color: "#0f172a" }}>
              {activeTab === "overview" ? "Dashboard Overview" :
               activeTab === "doctors" ? "All Doctors" :
               activeTab === "agencies" ? "All Agencies" : "Connections"}
            </h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {msg && <span style={{ fontSize: "0.82rem", color: "#16a34a", background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "6px 12px", borderRadius: 8 }}>✅ {msg}</span>}
            <NotificationBell userId={currentUserId} />
            <div style={{ width: 36, height: 36, background: "#1d4ed8", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: "0.78rem" }}>
  {currentUserEmail.slice(0, 2).toUpperCase()}
</div>
          </div>
        </div>

        {/* OVERVIEW */}
        {activeTab === "overview" && (
          <div className="fade-up">
            {/* Stats grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 16, marginBottom: 28 }}>
              {[
                { label: "Total Doctors", value: doctors.length, icon: "👨‍⚕️", color: "#f5f3ff" },
                { label: "Total Agencies", value: agencies.length, icon: "🏥", color: "#f0fdf4" },
                { label: "Total Connections", value: connections.length, icon: "🔗", color: "#fefce8" },
                { label: "Active Connections", value: connections.filter(c => c.status === "accepted").length, icon: "✅", color: "#f0fdf4" },
              ].map((stat, i) => (
                <div key={i} className="card" style={{ background: stat.color, border: "none", padding: "16px 20px" }}>
                  <div style={{ fontSize: "1.2rem", marginBottom: 6 }}>{stat.icon}</div>
                  <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#0f172a", lineHeight: 1 }}>{stat.value}</div>
                  <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: 3 }}>{stat.label}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              {/* Doctor tiers */}
              <div className="card">
                <h3 style={{ fontWeight: 700, fontSize: "0.95rem", color: "#0f172a", marginBottom: 16 }}>👨‍⚕️ Doctor Tiers</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[
                    { label: "⚡ Advanced", value: totalAdvanced, bg: "linear-gradient(135deg, #0f172a, #334155)", pct: doctors.length ? (totalAdvanced / doctors.length) * 100 : 0 },
                    { label: "💎 Pro", value: totalPro, bg: "linear-gradient(135deg, #6d28d9, #4f46e5)", pct: doctors.length ? (totalPro / doctors.length) * 100 : 0 },
                    { label: "Base", value: totalBase, bg: "#94a3b8", pct: doctors.length ? (totalBase / doctors.length) * 100 : 0 },
                  ].map((t, i) => (
                    <div key={i}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#374151" }}>{t.label}</span>
                        <span style={{ fontSize: "0.82rem", color: "#64748b" }}>{t.value} doctors</span>
                      </div>
                      <div style={{ background: "#f1f5f9", borderRadius: 100, height: 8, overflow: "hidden" }}>
                        <div style={{ background: t.bg, height: "100%", width: `${t.pct}%`, borderRadius: 100, transition: "width 0.5s" }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Agency tiers */}
              <div className="card">
                <h3 style={{ fontWeight: 700, fontSize: "0.95rem", color: "#0f172a", marginBottom: 16 }}>🏥 Agency Tiers</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[
                    { label: "⚡ Advanced", value: agencyAdvanced, bg: "linear-gradient(135deg, #0f172a, #334155)", pct: agencies.length ? (agencyAdvanced / agencies.length) * 100 : 0 },
                    { label: "💎 Pro", value: agencyPro, bg: "linear-gradient(135deg, #6d28d9, #4f46e5)", pct: agencies.length ? (agencyPro / agencies.length) * 100 : 0 },
                    { label: "Base", value: agencyBase, bg: "#94a3b8", pct: agencies.length ? (agencyBase / agencies.length) * 100 : 0 },
                  ].map((t, i) => (
                    <div key={i}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#374151" }}>{t.label}</span>
                        <span style={{ fontSize: "0.82rem", color: "#64748b" }}>{t.value} agencies</span>
                      </div>
                      <div style={{ background: "#f1f5f9", borderRadius: 100, height: 8, overflow: "hidden" }}>
                        <div style={{ background: t.bg, height: "100%", width: `${t.pct}%`, borderRadius: 100, transition: "width 0.5s" }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search */}
        {activeTab !== "overview" && (
          <div style={{ marginBottom: 20 }}>
            <input
              className="input-field"
              placeholder={`Search ${activeTab}...`}
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ maxWidth: 360 }}
            />
          </div>
        )}

        {/* DOCTORS TABLE */}
        {activeTab === "doctors" && (
          <div className="fade-up">
            <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
              <button
                onClick={() => changeTab("imports")}
                style={{ display: "flex", alignItems: "center", gap: 6, background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "#fff", border: "none", padding: "9px 16px", borderRadius: 10, fontWeight: 600, fontSize: "0.85rem", cursor: "pointer", fontFamily: "inherit" }}
              >
                + Import CSV
              </button>
              <button
                onClick={() => setShowAddDoctorModal(true)}
                style={{ display: "flex", alignItems: "center", gap: 6, background: "linear-gradient(135deg, #1e293b, #334155)", color: "#fff", border: "none", padding: "9px 16px", borderRadius: 10, fontWeight: 600, fontSize: "0.85rem", cursor: "pointer", fontFamily: "inherit" }}
              >
                + Add Doctor
              </button>
            </div>
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            {filteredDoctors.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px 24px", color: "#94a3b8" }}>
                <div style={{ fontSize: "2rem", marginBottom: 8 }}>👨‍⚕️</div>
                <p>No doctors found</p>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Specialty</th>
                      <th>Grade</th>
                      <th>GMC</th>
                      <th>Location</th>
                      <th>Current Tier</th>
                      <th>Change Tier</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDoctors.map(doc => {
                      const badge = getTierBadge(doc.tier, "doctor");
                      return (
                        <tr key={doc.user_id}>
                          <td style={{ fontWeight: 600, color: "#0f172a", whiteSpace: "nowrap" }}>{doc.full_name || "—"}</td>
                          <td style={{ color: "#64748b" }}>{doc.email || "—"}</td>
                          <td>{doc.specialty || "—"}</td>
                          <td>{doc.grade || "—"}</td>
                          <td style={{ fontFamily: "monospace", fontSize: "0.8rem" }}>{doc.gmc_number || "—"}</td>
                          <td>{doc.preferred_location || "—"}</td>
                          <td>
                            <span style={{ fontSize: "0.72rem", fontWeight: 700, padding: "3px 10px", borderRadius: 100, background: badge.bg, color: badge.color }}>
                              {badge.label}
                            </span>
                          </td>
                          <td>
                            <select
                              className="tier-select"
                              value={doc.tier || "basic"}
                              disabled={savingTier === doc.user_id}
                              onChange={e => handleDoctorTier(doc.user_id, e.target.value)}
                            >
                              <option value="basic">Base</option>
                              <option value="pro">Pro</option>
                              <option value="advanced">Advanced</option>
                            </select>
                          </td>
                          <td>
                            <button
                              onClick={async () => {
                                const newVal = !doc.is_verified;
                                await supabase.from("doctors").update({ is_verified: newVal, verified_at: newVal ? new Date().toISOString() : null }).eq("user_id", doc.user_id);
                                setDoctors(prev => prev.map(d => d.user_id === doc.user_id ? { ...d, is_verified: newVal } : d));
                                setMsg(newVal ? "Doctor verified!" : "Verification removed.");
                                setTimeout(() => setMsg(""), 2000);
                              }}
                              style={{ background: doc.is_verified ? "#f0fdf4" : "#f8f9fc", color: doc.is_verified ? "#16a34a" : "#94a3b8", border: `1.5px solid ${doc.is_verified ? "#bbf7d0" : "#e2e8f0"}`, padding: "5px 10px", borderRadius: 8, fontSize: "0.78rem", cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}
                            >
                              {doc.is_verified ? "✅ Verified" : "○ Verify"}
                            </button>
                          </td>
                          <td>
                            <button
                              onClick={async () => {
                                if (!confirm(`Delete ${doc.full_name}? This cannot be undone.`)) return;
                                await supabase.from("doctors").delete().eq("user_id", doc.user_id);
                                setDoctors(prev => prev.filter(d => d.user_id !== doc.user_id));
                                setMsg("Doctor deleted.");
                                setTimeout(() => setMsg(""), 2000);
                              }}
                              style={{ background: "#fef2f2", color: "#dc2626", border: "1.5px solid #fecaca", padding: "5px 10px", borderRadius: 8, fontSize: "0.78rem", cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}
                            >
                              🗑 Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          </div>
        )}

        {/* AGENCIES TABLE */}
        {activeTab === "agencies" && (
          <div className="fade-up card" style={{ padding: 0, overflow: "hidden" }}>
            {filteredAgencies.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px 24px", color: "#94a3b8" }}>
                <div style={{ fontSize: "2rem", marginBottom: 8 }}>🏥</div>
                <p>No agencies found</p>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table>
                  <thead>
                    <tr>
                      <th>Agency Name</th>
                      <th>Contact Person</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Specialties</th>
                      <th>Current Tier</th>
                      <th>Change Tier</th>
<th>Verified</th>
<th>Actions</th>
                      <th>Top Agency</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAgencies.map(ag => {
                      const badge = getTierBadge(ag.tier, "agency");
                      return (
                        <tr key={ag.id}>
                          <td style={{ fontWeight: 600, color: "#0f172a", whiteSpace: "nowrap" }}>{ag.agency_name || "—"}</td>
                          <td>{ag.contact_person_name || "—"}</td>
                          <td style={{ color: "#64748b" }}>{ag.contact_email || "—"}</td>
                          <td>{ag.contact_phone || "—"}</td>
                          <td style={{ maxWidth: 200 }}>
  <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
    {ag.required_specialties
      ? ag.required_specialties.split(",").slice(0, 2).join(", ") + (ag.required_specialties.split(",").length > 2 ? "..." : "")
      : "—"}
  </span>
</td>
                          <td>
                            <span style={{ fontSize: "0.72rem", fontWeight: 700, padding: "3px 10px", borderRadius: 100, background: badge.bg, color: badge.color }}>
                              {badge.label}
                            </span>
                          </td>
                          <td>
                            <select
                              className="tier-select"
                              value={ag.tier || "basic"}
                              disabled={savingTier === ag.id}
                              onChange={e => handleAgencyTier(ag.id, e.target.value)}
                            >
                              <option value="basic">Base</option>
                              <option value="pro">Pro</option>
                              <option value="advanced">Advanced</option>
                            </select>
                          </td>
                          <td>
                            <button
                              style={{ fontSize: "0.75rem", background: "none", border: "none", cursor: "pointer", color: "#334155", fontFamily: "Inter, sans-serif", fontWeight: 600 }}
                              onClick={async () => {
                                await supabase.from("agencies").update({ is_top_agency: true }).eq("id", ag.id);
                                setMsg(`${ag.agency_name} set as Top Agency!`);
                                setTimeout(() => setMsg(""), 2500);
                              }}
                            >
                              ⚡ Set Top
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* CONNECTIONS TABLE */}
        {activeTab === "connections" && (
          <div className="fade-up card" style={{ padding: 0, overflow: "hidden" }}>
            {filteredConnections.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px 24px", color: "#94a3b8" }}>
                <div style={{ fontSize: "2rem", marginBottom: 8 }}>🔗</div>
                <p>No connections found</p>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table>
                  <thead>
                    <tr>
                      <th>Doctor Name</th>
                      <th>Doctor Email</th>
                      <th>Agency</th>
                      <th>Status</th>
                      <th>Connected At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredConnections.map((conn, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 600, color: "#0f172a" }}>{conn.doctor_name}</td>
                        <td style={{ color: "#64748b" }}>{conn.doctor_email}</td>
                        <td>
                          <span style={{ background: "#f5f3ff", color: "#334155", fontSize: "0.8rem", fontWeight: 600, padding: "3px 10px", borderRadius: 100 }}>🏥 {conn.agency_name}</span>
                        </td>
                        <td>
                          <span style={{ fontSize: "0.72rem", fontWeight: 700, padding: "3px 10px", borderRadius: 100, background: conn.status === "accepted" ? "#f0fdf4" : conn.status === "declined" ? "#fef2f2" : "#fffbeb", color: conn.status === "accepted" ? "#16a34a" : conn.status === "declined" ? "#dc2626" : "#92400e" }}>
                            {conn.status === "accepted" ? "✓ Connected" : conn.status === "declined" ? "✗ Declined" : "⏳ Pending"}
                          </span>
                        </td>
                        <td style={{ color: "#94a3b8", fontSize: "0.82rem" }}>{conn.connected_at ? new Date(conn.connected_at).toLocaleDateString() : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
        {/* BROADCASTS */}
        {activeTab === "broadcasts" && (
          
          <BroadcastTab />
        )}
        {/* IMPORTS */}
        {activeTab === "imports" && (
          <ImportTab />
        )}
        {/* FEATURE REQUESTS */}
{activeTab === "feedback" && (
  <div className="fade-up">
    <div style={{ marginBottom: 24 }}>
      <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: "1.3rem", fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>💡 Feature Requests</h2>
      <p style={{ fontSize: "0.85rem", color: "#94a3b8" }}>Suggestions from doctors. Click status to update.</p>
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 20 }}>
      {[
        { label: "Total", value: featureRequests.length, color: "#f8f9fc" },
        { label: "Submitted", value: featureRequests.filter(f => f.status === "submitted").length, color: "#f1f5f9" },
        { label: "Under Review", value: featureRequests.filter(f => f.status === "under_review").length, color: "#fefce8" },
        { label: "Planned", value: featureRequests.filter(f => f.status === "planned").length, color: "#f0fdf4" },
        { label: "Live", value: featureRequests.filter(f => f.status === "live").length, color: "#f5f3ff" },
      ].map((s, i) => (
        <div key={i} className="card" style={{ background: s.color, border: "none", padding: "14px 16px", textAlign: "center" }}>
          <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "#0f172a" }}>{s.value}</div>
          <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: 2 }}>{s.label}</div>
        </div>
      ))}
    </div>

    {featureRequests.length === 0 ? (
      <div className="card" style={{ textAlign: "center", padding: "48px 24px", color: "#94a3b8" }}>
        <div style={{ fontSize: "2rem", marginBottom: 8 }}>💡</div>
        <p>No feature requests yet</p>
      </div>
    ) : (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {featureRequests.map(req => (
          <div key={req.id} className="card">
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: "0.72rem", background: "#f1f5f9", color: "#64748b", padding: "2px 8px", borderRadius: 100, textTransform: "capitalize" }}>{req.category}</span>
                  <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>{new Date(req.created_at).toLocaleDateString("en-GB")}</span>
                  <span style={{ fontSize: "0.72rem", color: "#7c3aed", fontWeight: 600 }}>👍 {req.votes}</span>
                </div>
                <p style={{ fontWeight: 700, fontSize: "0.95rem", color: "#0f172a", marginBottom: 4 }}>{req.title}</p>
                {req.description && <p style={{ fontSize: "0.82rem", color: "#64748b", lineHeight: 1.6 }}>{req.description}</p>}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
                <select
                  className="tier-select"
                  value={req.status}
                  onChange={async e => {
                    const newStatus = e.target.value;
                    await supabase.from("feature_requests").update({ status: newStatus }).eq("id", req.id);
                    setFeatureRequests(prev => prev.map(f => f.id === req.id ? { ...f, status: newStatus } : f));
                    setMsg("Status updated!");
                    setTimeout(() => setMsg(""), 2000);
                  }}
                >
                  <option value="submitted">📬 Submitted</option>
                  <option value="under_review">🔍 Under Review</option>
                  <option value="planned">📅 Planned</option>
                  <option value="live">✅ Live</option>
                  <option value="declined">❌ Declined</option>
                </select>
              </div>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
)}
        {/* USERS */}
        {activeTab === "users" && (
          <div className="fade-up">
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: "1.3rem", fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>User Management</h2>
              <p style={{ fontSize: "0.85rem", color: "#94a3b8" }}>Click any Role or Tier cell to edit inline.</p>
            </div>

            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 20 }}>
              {[
                { label: "Total Users", value: users.length, color: "#f8f9fc" },
                { label: "Doctors", value: users.filter(u => u.role === "doctor").length, color: "#f5f3ff" },
                { label: "Agencies", value: users.filter(u => u.role === "agency").length, color: "#f0fdf4" },
                { label: "Base", value: users.filter(u => u.tier === "basic").length, color: "#f1f5f9" },
                { label: "Pro", value: users.filter(u => u.tier === "pro").length, color: "#fdf4ff" },
                { label: "Advanced", value: users.filter(u => u.tier === "advanced").length, color: "#eff6ff" },
              ].map((s, i) => (
                <div key={i} className="card" style={{ background: s.color, border: "none", padding: "14px 16px", textAlign: "center" }}>
                  <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "#0f172a" }}>{s.value}</div>
                  <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Filters */}
            <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
              <input
                className="input-field"
                placeholder="Search by name or email..."
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                style={{ maxWidth: 280 }}
              />
              <select className="input-field" style={{ width: "auto" }} value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
                <option value="all">All Roles</option>
                <option value="doctor">Doctors</option>
                <option value="agency">Agencies</option>
                <option value="admin">Admins</option>
              </select>
              <select className="input-field" style={{ width: "auto" }} value={tierFilter} onChange={e => setTierFilter(e.target.value)}>
                <option value="all">All Tiers</option>
                <option value="basic">Base</option>
                <option value="pro">Pro</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            {/* Table */}
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#f8f9fc" }}>
                      {["Name", "Email", "Role", "Tier", "Details", "Joined", "Last Login", "Status"].map(h => (
                        <th key={h} style={{ fontSize: "0.72rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", padding: "12px 16px", textAlign: "left", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users
                      .filter(u => {
                        const matchSearch = !userSearch ||
                          u.display_name?.toLowerCase().includes(userSearch.toLowerCase()) ||
                          u.email?.toLowerCase().includes(userSearch.toLowerCase());
                        const matchRole = roleFilter === "all" || u.role === roleFilter;
                        const matchTier = tierFilter === "all" || u.tier === tierFilter;
                        return matchSearch && matchRole && matchTier;
                      })
                      .map(user => (
                        <tr key={user.id} style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.1s" }}
                          onMouseEnter={e => (e.currentTarget.style.background = "#f8f9fc")}
                          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                        >
                          {/* Name */}
                          <td style={{ padding: "12px 16px", fontWeight: 600, color: "#0f172a", fontSize: "0.88rem", whiteSpace: "nowrap" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div style={{ width: 32, height: 32, borderRadius: "50%", background: user.role === "doctor" ? "#f5f3ff" : user.role === "agency" ? "#f0fdf4" : "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", fontWeight: 700, color: user.role === "doctor" ? "#7c3aed" : user.role === "agency" ? "#16a34a" : "#334155", flexShrink: 0 }}>
                                {user.display_name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() || "??"}
                              </div>
                              {user.display_name || "—"}
                            </div>
                          </td>

                          {/* Email */}
                          <td style={{ padding: "12px 16px", color: "#64748b", fontSize: "0.85rem" }}>{user.email}</td>

                          {/* Role — clickable */}
                          <td style={{ padding: "12px 16px" }}>
                            {editingCell?.id === user.id && editingCell?.field === "role" ? (
                              <select
                                autoFocus
                                className="tier-select"
                                defaultValue={user.role}
                                onBlur={() => setEditingCell(null)}
                                onChange={async e => {
                                  const newRole = e.target.value;
                                  await supabase.from("user_profiles").upsert({ id: user.id, role: newRole }, { onConflict: "id" });
                                  setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: newRole } : u));
                                  setEditingCell(null);
                                  setMsg("Role updated!");
                                  setTimeout(() => setMsg(""), 2000);
                                }}
                              >
                                <option value="doctor">Doctor</option>
                                <option value="agency">Agency</option>
                                <option value="admin">Admin</option>
                              </select>
                            ) : (
                              <span
                                onClick={() => setEditingCell({ id: user.id, field: "role" })}
                                title="Click to edit"
                                style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4, fontSize: "0.78rem", fontWeight: 700, padding: "4px 10px", borderRadius: 100, background: user.role === "doctor" ? "#f5f3ff" : user.role === "agency" ? "#f0fdf4" : user.role === "admin" ? "#eff6ff" : "#f1f5f9", color: user.role === "doctor" ? "#7c3aed" : user.role === "agency" ? "#16a34a" : user.role === "admin" ? "#334155" : "#64748b", border: "1.5px dashed transparent", transition: "all 0.15s" }}
                                onMouseEnter={e => (e.currentTarget.style.borderColor = "#cbd5e1")}
                                onMouseLeave={e => (e.currentTarget.style.borderColor = "transparent")}
                              >
                                {user.role === "doctor" ? "👨‍⚕️" : user.role === "agency" ? "🏥" : user.role === "admin" ? "⚙️" : "❓"} {user.role || "unknown"}
                                <span style={{ fontSize: "0.6rem", color: "#94a3b8" }}>✏️</span>
                              </span>
                            )}
                          </td>

                          {/* Tier — clickable */}
                          <td style={{ padding: "12px 16px" }}>
                            {editingCell?.id === user.id && editingCell?.field === "tier" ? (
                              <select
                                autoFocus
                                className="tier-select"
                                defaultValue={user.tier}
                                onBlur={() => setEditingCell(null)}
                                onChange={async e => {
                                  const newTier = e.target.value;
                                  // Update doctors or agencies table
                                  if (user.role === "doctor") {
                                    await supabase.from("doctors").update({ tier: newTier }).eq("user_id", user.id);
                                  } else if (user.role === "agency") {
                                    const { data: auData } = await supabase.from("agency_users").select("agency_id").eq("user_id", user.id).single();
                                    if (auData) await supabase.from("agencies").update({ tier: newTier }).eq("id", auData.agency_id);
                                  }
                                  setUsers(prev => prev.map(u => u.id === user.id ? { ...u, tier: newTier } : u));
                                  setEditingCell(null);
                                  setMsg("Tier updated!");
                                  setTimeout(() => setMsg(""), 2000);
                                }}
                              >
                                <option value="basic">Base</option>
                                <option value="pro">Pro</option>
                                <option value="advanced">Advanced</option>
                              </select>
                            ) : (
                              <span
                                onClick={() => setEditingCell({ id: user.id, field: "tier" })}
                                title="Click to edit"
                                style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4, fontSize: "0.78rem", fontWeight: 700, padding: "4px 10px", borderRadius: 100, background: user.tier === "advanced" ? "linear-gradient(135deg, #1e293b, #334155)" : user.tier === "pro" ? "linear-gradient(135deg, #6d28d9, #7c3aed)" : "#f1f5f9", color: user.tier === "advanced" || user.tier === "pro" ? "#fff" : "#64748b", border: "1.5px dashed transparent", transition: "border-color 0.15s" }}
                                onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)")}
                                onMouseLeave={e => (e.currentTarget.style.borderColor = "transparent")}
                              >
                                {user.tier === "advanced" ? "⚡" : user.tier === "pro" ? "💎" : "●"} {user.tier === "basic" ? "Base" : user.tier === "pro" ? "Pro" : "Advanced"}
                                <span style={{ fontSize: "0.6rem", opacity: 0.7 }}>✏️</span>
                              </span>
                            )}
                          </td>

                          {/* Details */}
                          <td style={{ padding: "12px 16px", fontSize: "0.8rem", color: "#64748b" }}>
                            {user.role === "doctor" ? (
                              <div>
                                {user.specialty && <div>{user.specialty}</div>}
                                {user.grade && <div style={{ color: "#94a3b8" }}>{user.grade}</div>}
                                {user.gmc_number && <div style={{ fontFamily: "monospace", fontSize: "0.75rem" }}>GMC: {user.gmc_number}</div>}
                              </div>
                            ) : user.role === "agency" ? (
                              <div style={{ color: "#16a34a", fontWeight: 500 }}>🏥 {user.agency_name}</div>
                            ) : "—"}
                          </td>

                          {/* Joined */}
                          <td style={{ padding: "12px 16px", fontSize: "0.8rem", color: "#94a3b8", whiteSpace: "nowrap" }}>
                            {user.created_at ? new Date(user.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                          </td>

                          {/* Last Login */}
                          <td style={{ padding: "12px 16px", fontSize: "0.8rem", color: "#94a3b8", whiteSpace: "nowrap" }}>
                            {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "Never"}
                          </td>

                          {/* Status */}
                          <td style={{ padding: "12px 16px" }}>
                            <span style={{ fontSize: "0.72rem", fontWeight: 700, padding: "3px 8px", borderRadius: 100, background: user.confirmed ? "#f0fdf4" : "#fffbeb", color: user.confirmed ? "#16a34a" : "#92400e" }}>
                              {user.confirmed ? "✓ Confirmed" : "⏳ Pending"}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              {users.filter(u => {
                const matchSearch = !userSearch || u.display_name?.toLowerCase().includes(userSearch.toLowerCase()) || u.email?.toLowerCase().includes(userSearch.toLowerCase());
                const matchRole = roleFilter === "all" || u.role === roleFilter;
                const matchTier = tierFilter === "all" || u.tier === tierFilter;
                return matchSearch && matchRole && matchTier;
              }).length === 0 && (
                <div style={{ textAlign: "center", padding: "48px 24px", color: "#94a3b8" }}>
                  <div style={{ fontSize: "2rem", marginBottom: 8 }}>👥</div>
                  <p>No users found</p>
                </div>
              )}
            </div>
          </div>
        )}
        {/* SUPPORT MESSAGES */}
        {activeTab === "support" && (
          <div className="fade-up">
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: "1.3rem", fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>💬 Support Messages</h2>
              <p style={{ fontSize: "0.85rem", color: "#94a3b8" }}>Messages from doctors and agencies. Click status to update.</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 20 }}>
              {[
                { label: "Total", value: supportMessages.length, color: "#f8f9fc" },
                { label: "Open", value: supportMessages.filter(m => m.status === "open").length, color: "#fef2f2" },
                { label: "In Progress", value: supportMessages.filter(m => m.status === "in_progress").length, color: "#fefce8" },
                { label: "Resolved", value: supportMessages.filter(m => m.status === "resolved").length, color: "#f0fdf4" },
              ].map((s, i) => (
                <div key={i} className="card" style={{ background: s.color, border: "none", padding: "14px 16px", textAlign: "center" }}>
                  <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "#0f172a" }}>{s.value}</div>
                  <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
            {supportMessages.length === 0 ? (
              <div className="card" style={{ textAlign: "center", padding: "48px 24px", color: "#94a3b8" }}>
                <div style={{ fontSize: "2rem", marginBottom: 8 }}>💬</div>
                <p>No support messages yet</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {supportMessages.map(msg => (
                  <div key={msg.id} className="card">
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                          <span style={{ fontSize: "0.72rem", fontWeight: 700, padding: "2px 8px", borderRadius: 100, background: msg.user_type === "doctor" ? "#f5f3ff" : "#f0fdf4", color: msg.user_type === "doctor" ? "#7c3aed" : "#16a34a" }}>
                            {msg.user_type === "doctor" ? "👨‍⚕️ Doctor" : "🏥 Agency"}
                          </span>
                          {msg.subject && <span style={{ fontSize: "0.72rem", background: "#f1f5f9", color: "#64748b", padding: "2px 8px", borderRadius: 100 }}>{msg.subject}</span>}
                          <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>{new Date(msg.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                        </div>
                        <p style={{ fontSize: "0.88rem", color: "#374151", lineHeight: 1.6 }}>{msg.message}</p>
                      </div>
                      <select
                        className="tier-select"
                        value={msg.status}
                        onChange={async e => {
                          const newStatus = e.target.value;
                          await supabase.from("support_messages").update({ status: newStatus }).eq("id", msg.id);
                          setSupportMessages(prev => prev.map(m => m.id === msg.id ? { ...m, status: newStatus } : m));
                          setMsg("Status updated!");
                          setTimeout(() => setMsg(""), 2000);
                        }}
                      >
                        <option value="open">🔴 Open</option>
                        <option value="in_progress">🟡 In Progress</option>
                        <option value="resolved">✅ Resolved</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}