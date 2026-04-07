"use client";

import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useRouter } from "next/navigation";

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
    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false, // Only existing users can log in via OTP
      },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setStep("otp");
  };

  const handleVerifyOTP = async () => {
    setError("");
    if (!otp || otp.length < 6) {
      setError("Please enter the 6-digit code from your email.");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: "email",
    });
    setLoading(false);
    if (error) {
      setError("Invalid or expired code. Please try again.");
      return;
    }
    if (data.user) {
      // Check if admin
      const { data: adminData } = await supabase
        .from("admins")
        .select("id")
        .eq("user_id", data.user.id)
        .single();
      if (adminData) { router.push("/admin"); return; }

      // Check if agency
      const { data: agencyUser } = await supabase
        .from("agency_users")
        .select("id")
        .eq("user_id", data.user.id)
        .single();
      if (agencyUser) { router.push("/agency-dashboard"); return; }

      router.push("/dashboard");
    }
  };

  const handleResendOTP = async () => {
    setResending(true);
    setError("");
    await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });
    setResending(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f8faff 0%, #fdf4ff 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif", padding: 24 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        .input-field { width: 100%; padding: 13px 16px; border: 1.5px solid #e0eaff; border-radius: 12px; font-size: 0.95rem; color: #0f172a; background: #fff; outline: none; transition: border-color 0.2s, box-shadow 0.2s; font-family: 'DM Sans', sans-serif; }
        .input-field:focus { border-color: #1d4ed8; box-shadow: 0 0 0 4px rgba(29,78,216,0.08); }
        .input-field::placeholder { color: #94a3b8; }
        .otp-input { width: 100%; padding: 16px; border: 1.5px solid #e0eaff; border-radius: 12px; font-size: 1.5rem; font-weight: 700; color: #0f172a; background: #fff; outline: none; text-align: center; letter-spacing: 0.3em; font-family: monospace; transition: border-color 0.2s, box-shadow 0.2s; }
        .otp-input:focus { border-color: #1d4ed8; box-shadow: 0 0 0 4px rgba(29,78,216,0.08); }
        .btn { width: 100%; padding: 14px; background: #1d4ed8; color: #fff; font-weight: 600; font-size: 0.95rem; border: none; border-radius: 12px; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: background 0.2s; }
        .btn:hover:not(:disabled) { background: #1e40af; }
        .btn:disabled { opacity: 0.7; cursor: not-allowed; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        .fade-up { animation: fadeUp 0.4s ease both; }
      `}</style>

      <div style={{ width: "100%", maxWidth: 440 }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 40 }}>
          <div style={{ width: 30, height: 30, background: "#1d4ed8", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
              <path d="M9 2v14M2 9h14" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </div>
          <span style={{ fontWeight: 700, fontSize: "1.1rem", color: "#1d4ed8" }}>MedHub</span>
        </div>

        {step === "email" && (
          <div className="fade-up">
            <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "2rem", color: "#0f172a", marginBottom: 8 }}>
              Sign in to MedHub
            </h1>
            <p style={{ color: "#64748b", fontSize: "0.92rem", marginBottom: 36 }}>
              Enter your email and we'll send you a one-time login code — no password needed.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#374151", marginBottom: 8 }}>Email address</label>
                <input
                  className="input-field"
                  type="email"
                  placeholder="doctor@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSendOTP()}
                  autoFocus
                />
              </div>

              {error && (
                <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "12px 16px", color: "#dc2626", fontSize: "0.88rem" }}>
                  {error}
                </div>
              )}

              <button className="btn" onClick={handleSendOTP} disabled={loading || !email}>
                {loading ? "Sending code..." : "Send Login Code →"}
              </button>

              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: "0.82rem", color: "#94a3b8", marginBottom: 8 }}>Prefer to use a password?</p>
                <a href="/login" style={{ fontSize: "0.88rem", color: "#1d4ed8", fontWeight: 600, textDecoration: "none" }}>Sign in with password</a>
              </div>
            </div>
          </div>
        )}

        {step === "otp" && (
          <div className="fade-up">
            <div style={{ width: 56, height: 56, background: "#eff6ff", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.8rem", marginBottom: 20 }}>
              📧
            </div>
            <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "2rem", color: "#0f172a", marginBottom: 8 }}>
              Check your email
            </h1>
            <p style={{ color: "#64748b", fontSize: "0.92rem", marginBottom: 8 }}>
              We've sent a 6-digit login code to
            </p>
            <p style={{ color: "#0f172a", fontWeight: 700, fontSize: "0.95rem", marginBottom: 32 }}>
              {email}
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#374151", marginBottom: 8 }}>Enter your 6-digit code</label>
                <input
                  className="otp-input"
                  type="text"
                  inputMode="numeric"
                  placeholder="000000"
                  maxLength={6}
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  onKeyDown={e => e.key === "Enter" && otp.length === 6 && handleVerifyOTP()}
                  autoFocus
                />
              </div>

              {error && (
                <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "12px 16px", color: "#dc2626", fontSize: "0.88rem" }}>
                  {error}
                </div>
              )}

              <button className="btn" onClick={handleVerifyOTP} disabled={loading || otp.length < 6}>
                {loading ? "Verifying..." : "Verify & Sign In →"}
              </button>

              <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
                <p style={{ fontSize: "0.82rem", color: "#94a3b8" }}>Didn't receive the code?</p>
                <button
                  onClick={handleResendOTP}
                  disabled={resending}
                  style={{ background: "none", border: "none", color: "#1d4ed8", fontWeight: 600, fontSize: "0.88rem", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}
                >
                  {resending ? "Sending..." : "Resend code"}
                </button>
                <button
                  onClick={() => { setStep("email"); setOtp(""); setError(""); }}
                  style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "0.82rem", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}
                >
                  ← Use a different email
                </button>
              </div>
            </div>
          </div>
        )}

        <p style={{ marginTop: 32, fontSize: "0.78rem", color: "#94a3b8", textAlign: "center", lineHeight: 1.6 }}>
          By signing in you agree to MedHub's Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}