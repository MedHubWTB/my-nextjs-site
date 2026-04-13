"use client";

import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useRouter } from "next/navigation";
import Logo from "../components/Logo";

export default function OTPLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resending, setResending] = useState(false);

  const handleSendOTP = async () => {
    setError("");
    if (!email || !email.includes("@")) { setError("Please enter a valid email address."); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setStep("otp");
  };

  const handleVerifyOTP = async () => {
    setError("");
    if (!otp || otp.length < 6) { setError("Please enter the 6-digit code from your email."); return; }
    setLoading(true);
    const { data, error } = await supabase.auth.verifyOtp({ email, token: otp, type: "email" });
    setLoading(false);
    if (error) { setError("Invalid or expired code. Please try again."); return; }
    if (data.user) {
      const { data: adminData } = await supabase.from("admins").select("id").eq("user_id", data.user.id).single();
      if (adminData) { router.push("/admin"); return; }
      const { data: agencyUser } = await supabase.from("agency_users").select("id").eq("user_id", data.user.id).single();
      if (agencyUser) { router.push("/agency-dashboard"); return; }
      const { data: doctorData } = await supabase.from("doctors").select("onboarding_completed").eq("user_id", data.user.id).single();
      if (!doctorData || !doctorData.onboarding_completed) { router.push("/onboarding"); return; }
      router.push("/dashboard");
    }
  };

  const handleResendOTP = async () => {
    setResending(true);
    setError("");
    await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
    setResending(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f8f9fc 0%, #f1f0f8 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-inter), Inter, sans-serif", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 440 }}>
        <div style={{ marginBottom: 40 }}><Logo /></div>

        <div style={{ background: "#fff", borderRadius: 20, padding: "36px", border: "1px solid #e2e8f0", boxShadow: "0 4px 24px rgba(51,65,85,0.08)" }}>
          {step === "email" && (
            <div className="fade-up">
              <h1 style={{ fontSize: "1.6rem", fontWeight: 700, color: "#0f172a", marginBottom: 6, letterSpacing: "-0.02em" }}>Sign in to QuietMedical</h1>
              <p style={{ color: "#64748b", fontSize: "0.88rem", marginBottom: 28 }}>Enter your email and we'll send you a one-time login code — no password needed.</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Email address</label>
                  <input className="qm-input" type="email" placeholder="doctor@example.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSendOTP()} autoFocus />
                </div>
                {error && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "10px 14px", color: "#dc2626", fontSize: "0.85rem" }}>{error}</div>}
                <button className="qm-btn-primary" style={{ width: "100%", padding: "13px", fontSize: "0.95rem", borderRadius: 12 }} onClick={handleSendOTP} disabled={loading || !email}>
                  {loading ? "Sending code..." : "Send Login Code →"}
                </button>
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontSize: "0.82rem", color: "#94a3b8", marginBottom: 6 }}>Prefer to use a password?</p>
                  <a href="/login" style={{ fontSize: "0.88rem", color: "#7c3aed", fontWeight: 600, textDecoration: "none" }}>Sign in with password</a>
                </div>
              </div>
            </div>
          )}

          {step === "otp" && (
            <div className="fade-up">
              <div style={{ width: 52, height: 52, background: "linear-gradient(135deg, #f1f0f8, #ede9fe)", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.6rem", marginBottom: 20, border: "1px solid #ddd6fe" }}>📧</div>
              <h1 style={{ fontSize: "1.6rem", fontWeight: 700, color: "#0f172a", marginBottom: 6, letterSpacing: "-0.02em" }}>Check your email</h1>
              <p style={{ color: "#64748b", fontSize: "0.88rem", marginBottom: 4 }}>We sent a 6-digit code to</p>
              <p style={{ color: "#0f172a", fontWeight: 700, fontSize: "0.95rem", marginBottom: 28 }}>{email}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>6-digit code</label>
                  <input
                    style={{ width: "100%", padding: "16px", border: "1.5px solid #e2e8f0", borderRadius: 12, fontSize: "1.6rem", fontWeight: 700, color: "#0f172a", background: "#fff", outline: "none", textAlign: "center", letterSpacing: "0.3em", fontFamily: "monospace", transition: "border-color 0.2s" }}
                    type="text" inputMode="numeric" placeholder="000000" maxLength={6}
                    value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    onKeyDown={e => e.key === "Enter" && otp.length === 6 && handleVerifyOTP()} autoFocus
                  />
                </div>
                {error && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "10px 14px", color: "#dc2626", fontSize: "0.85rem" }}>{error}</div>}
                <button className="qm-btn-primary" style={{ width: "100%", padding: "13px", fontSize: "0.95rem", borderRadius: 12 }} onClick={handleVerifyOTP} disabled={loading || otp.length < 6}>
                  {loading ? "Verifying..." : "Verify & Sign In →"}
                </button>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
                  <p style={{ fontSize: "0.82rem", color: "#94a3b8" }}>Didn't receive the code?</p>
                  <button onClick={handleResendOTP} disabled={resending} style={{ background: "none", border: "none", color: "#7c3aed", fontWeight: 600, fontSize: "0.88rem", cursor: "pointer", fontFamily: "inherit" }}>
                    {resending ? "Sending..." : "Resend code"}
                  </button>
                  <button onClick={() => { setStep("email"); setOtp(""); setError(""); }} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "0.82rem", cursor: "pointer", fontFamily: "inherit" }}>
                    ← Use a different email
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <p style={{ marginTop: 20, fontSize: "0.75rem", color: "#94a3b8", textAlign: "center", lineHeight: 1.6 }}>
          By signing in you agree to QuietMedical&apos;s Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}