"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import Logo from "../components/Logo";

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [referrerId, setReferrerId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) setReferrerId(ref);
  }, []);

  const handleSignup = async () => {
    setError("");
    if (!fullName || !email || !password || !confirmPassword) { setError("Please fill in all fields."); return; }
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true);
    const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
    if (signUpError) { setLoading(false); setError(signUpError.message); return; }
    if (data.user) {
      await supabase.from("doctors").insert({ user_id: data.user.id, full_name: fullName, email, tier: "basic", onboarding_completed: false });
      await supabase.from("user_profiles").insert({ id: data.user.id, role: "doctor" });
      if (referrerId) await supabase.from("referrals").insert({ referrer_id: referrerId, referee_email: email, referee_id: data.user.id, status: "signed_up" });
    }
    setLoading(false);
    setSuccess(true);
  };

  if (success) return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f8f9fc 0%, #f1f0f8 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-inter), Inter, sans-serif", padding: 24 }}>
      <div style={{ textAlign: "center", maxWidth: 440 }}>
        <div style={{ marginBottom: 32, display: "flex", justifyContent: "center" }}><Logo /></div>
        <div style={{ width: 64, height: 64, background: "linear-gradient(135deg, #f1f0f8, #ede9fe)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", border: "1px solid #ddd6fe" }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <h2 style={{ fontSize: "1.8rem", fontWeight: 700, color: "#0f172a", marginBottom: 12, letterSpacing: "-0.02em" }}>Account created!</h2>
        {referrerId && <div style={{ background: "#f5f3ff", border: "1px solid #ddd6fe", borderRadius: 10, padding: "10px 16px", marginBottom: 16, fontSize: "0.85rem", color: "#7c3aed", fontWeight: 600 }}>🎉 You joined via a colleague's invite!</div>}
        <p style={{ color: "#64748b", fontSize: "0.92rem", lineHeight: 1.7, marginBottom: 32 }}>Check your email to confirm your account, then sign in to complete your profile.</p>
        <a href="/login" style={{ display: "inline-block", background: "linear-gradient(135deg, #1e293b, #334155)", color: "#fff", fontWeight: 600, fontSize: "0.95rem", padding: "13px 32px", borderRadius: 12, textDecoration: "none", boxShadow: "0 2px 8px rgba(51,65,85,0.2)" }}>Go to Sign In</a>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f8f9fc 0%, #f1f0f8 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-inter), Inter, sans-serif", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 440 }}>
        <div style={{ marginBottom: 40 }}><Logo /></div>
        <div style={{ background: "#fff", borderRadius: 20, padding: "36px", border: "1px solid #e2e8f0", boxShadow: "0 4px 24px rgba(51,65,85,0.08)" }}>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 700, color: "#0f172a", marginBottom: 6, letterSpacing: "-0.02em" }}>Create account</h1>
          <p style={{ color: "#64748b", fontSize: "0.88rem", marginBottom: 28 }}>
            Already have an account?{" "}
            <a href="/login" style={{ color: "#7c3aed", fontWeight: 600, textDecoration: "none" }}>Sign in</a>
          </p>

          {referrerId && <div style={{ background: "#f5f3ff", border: "1px solid #ddd6fe", borderRadius: 10, padding: "10px 16px", marginBottom: 20, fontSize: "0.85rem", color: "#7c3aed", fontWeight: 600 }}>🎉 You were invited by a colleague!</div>}

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[
              { label: "Full name", type: "text", placeholder: "Dr. Jane Smith", value: fullName, onChange: setFullName },
              { label: "Email address", type: "email", placeholder: "doctor@example.com", value: email, onChange: setEmail },
              { label: "Password", type: "password", placeholder: "Min. 6 characters", value: password, onChange: setPassword },
              { label: "Confirm password", type: "password", placeholder: "••••••••", value: confirmPassword, onChange: setConfirmPassword },
            ].map(field => (
              <div key={field.label}>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>{field.label}</label>
                <input className="qm-input" type={field.type} placeholder={field.placeholder} value={field.value} onChange={e => field.onChange(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSignup()} />
              </div>
            ))}
            {error && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "10px 14px", color: "#dc2626", fontSize: "0.85rem" }}>{error}</div>}
            <button className="qm-btn-primary" style={{ width: "100%", padding: "13px", fontSize: "0.95rem", borderRadius: 12, marginTop: 4 }} onClick={handleSignup} disabled={loading}>
              {loading ? "Creating account..." : "Create my QuietMedical account"}
            </button>
            <p style={{ fontSize: "0.75rem", color: "#94a3b8", textAlign: "center", lineHeight: 1.6 }}>
              By creating an account you agree to QuietMedical&apos;s Terms of Service and Privacy Policy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}