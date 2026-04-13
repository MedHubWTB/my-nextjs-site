"use client";

import { useState } from "react";
import { supabase } from "../lib/supabase";
import Logo from "../components/Logo";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setSent(true);
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f8f9fc 0%, #f1f0f8 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-inter), Inter, sans-serif", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 440 }}>
        <div style={{ marginBottom: 40 }}><Logo /></div>
        <div style={{ background: "#fff", borderRadius: 20, padding: "36px", border: "1px solid #e2e8f0", boxShadow: "0 4px 24px rgba(51,65,85,0.08)" }}>
          {sent ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "3rem", marginBottom: 16 }}>📧</div>
              <h1 style={{ fontSize: "1.6rem", fontWeight: 700, color: "#0f172a", marginBottom: 8, letterSpacing: "-0.02em" }}>Check your email</h1>
              <p style={{ color: "#64748b", marginBottom: 24, fontSize: "0.9rem" }}>We've sent a password reset link to <strong>{email}</strong></p>
              <a href="/login" style={{ color: "#7c3aed", fontWeight: 600, textDecoration: "none", fontSize: "0.9rem" }}>← Back to sign in</a>
            </div>
          ) : (
            <>
              <h1 style={{ fontSize: "1.6rem", fontWeight: 700, color: "#0f172a", marginBottom: 6, letterSpacing: "-0.02em" }}>Reset password</h1>
              <p style={{ color: "#64748b", fontSize: "0.88rem", marginBottom: 28 }}>Enter your email and we'll send you a reset link.</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Email address</label>
                  <input className="qm-input" type="email" placeholder="doctor@example.com" value={email} onChange={e => setEmail(e.target.value)} />
                </div>
                {error && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "10px 14px", color: "#dc2626", fontSize: "0.85rem" }}>{error}</div>}
                <button className="qm-btn-primary" style={{ width: "100%", padding: "13px", borderRadius: 12 }} onClick={handleReset} disabled={loading || !email}>{loading ? "Sending..." : "Send Reset Link"}</button>
                <a href="/login" style={{ textAlign: "center", color: "#64748b", fontSize: "0.88rem", textDecoration: "none" }}>← Back to sign in</a>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}