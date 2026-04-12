"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [referrerId, setReferrerId] = useState<string | null>(null);

  useEffect(() => {
    // Capture referral ID from URL
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) setReferrerId(ref);
  }, []);

  const handleSignup = async () => {
    setError("");
    if (!fullName || !email || !password || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
    if (signUpError) {
      setLoading(false);
      setError(signUpError.message);
      return;
    }
    if (data.user) {
      // Create doctor record
      await supabase.from("doctors").insert({
        user_id: data.user.id,
        full_name: fullName,
        email: email,
        tier: "basic",
        onboarding_completed: false,
      });

      // Add to user_profiles
      await supabase.from("user_profiles").insert({
        id: data.user.id,
        role: "doctor",
      });

      // Track referral if came via referral link
      if (referrerId) {
        await supabase.from("referrals").insert({
          referrer_id: referrerId,
          referee_email: email,
          referee_id: data.user.id,
          status: "signed_up",
        });
      }
    }
    setLoading(false);
    setSuccess(true);
  };

  if (success) {
    return (
      <div style={{ minHeight: "100vh", background: "#f8faff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif" }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600&display=swap'); * { box-sizing: border-box; }`}</style>
        <div style={{ textAlign: "center", padding: "40px", maxWidth: 440 }}>
          <div style={{ width: 64, height: 64, background: "#eff6ff", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M5 13l4 4L19 7" stroke="#1d4ed8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.8rem", color: "#0f172a", marginBottom: 12 }}>Account created!</h2>
          {referrerId && (
            <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "10px 16px", marginBottom: 16, fontSize: "0.85rem", color: "#16a34a", fontWeight: 600 }}>
              🎉 You joined via a colleague's invite!
            </div>
          )}
          <p style={{ color: "#64748b", fontSize: "0.92rem", lineHeight: 1.7, marginBottom: 32 }}>
            Check your email to confirm your account, then sign in to complete your profile.
          </p>
          <a href="/login" style={{ display: "inline-block", background: "#1d4ed8", color: "#fff", fontWeight: 600, fontSize: "0.95rem", padding: "14px 32px", borderRadius: 12, textDecoration: "none" }}>
            Go to Sign In
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f8faff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        .input-field { width: 100%; padding: 13px 16px; border: 1.5px solid #e0eaff; border-radius: 12px; font-size: 0.95rem; color: #0f172a; background: #fff; outline: none; transition: border-color 0.2s, box-shadow 0.2s; font-family: 'DM Sans', sans-serif; }
        .input-field:focus { border-color: #1d4ed8; box-shadow: 0 0 0 4px rgba(29,78,216,0.08); }
        .input-field::placeholder { color: #94a3b8; }
        .btn { width: 100%; padding: 14px; background: #1d4ed8; color: #fff; font-weight: 600; font-size: 0.95rem; border: none; border-radius: 12px; cursor: pointer; box-shadow: 0 4px 18px rgba(29,78,216,0.25); font-family: 'DM Sans', sans-serif; }
        .btn:hover:not(:disabled) { background: #1e40af; }
        .btn:disabled { opacity: 0.7; cursor: not-allowed; }
        label { display: block; font-size: 0.85rem; font-weight: 600; color: #374151; margin-bottom: 8px; }
      `}</style>

      <div style={{ width: "100%", maxWidth: 440, padding: "0 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 40 }}>
          <div style={{ width: 30, height: 30, background: "#1d4ed8", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
              <path d="M9 2v14M2 9h14" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </div>
          <span style={{ fontWeight: 700, fontSize: "1.1rem", color: "#1d4ed8" }}>MedHub</span>
        </div>

        <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "2rem", color: "#0f172a", marginBottom: 8 }}>Create account</h1>
        <p style={{ color: "#64748b", fontSize: "0.92rem", marginBottom: 8 }}>
          Already have an account?{" "}
          <a href="/login" style={{ color: "#1d4ed8", fontWeight: 600, textDecoration: "none" }}>Sign in</a>
        </p>

        {referrerId && (
          <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "10px 16px", marginBottom: 20, fontSize: "0.85rem", color: "#16a34a", fontWeight: 600 }}>
            🎉 You were invited by a colleague!
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 18, marginTop: 24 }}>
          <div>
            <label>Full name</label>
            <input className="input-field" type="text" placeholder="Dr. Jane Smith" value={fullName} onChange={e => setFullName(e.target.value)} />
          </div>
          <div>
            <label>Email address</label>
            <input className="input-field" type="email" placeholder="doctor@example.com" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div>
            <label>Password</label>
            <input className="input-field" type="password" placeholder="Min. 6 characters" value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          <div>
            <label>Confirm password</label>
            <input className="input-field" type="password" placeholder="••••••••" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSignup()} />
          </div>

          {error && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "12px 16px", color: "#dc2626", fontSize: "0.88rem" }}>
              {error}
            </div>
          )}

          <button className="btn" onClick={handleSignup} disabled={loading}>
            {loading ? "Creating account..." : "Create my MedHub account"}
          </button>

          <p style={{ fontSize: "0.78rem", color: "#94a3b8", textAlign: "center", lineHeight: 1.6 }}>
            By creating an account you agree to MedHub&apos;s Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}