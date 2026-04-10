"use client";

import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const redirectAfterLogin = async (userId: string) => {
  const { data: adminData } = await supabase
    .from("admins")
    .select("id")
    .eq("user_id", userId)
    .single();
  if (adminData) { router.push("/admin"); return; }

  const { data: agencyUser } = await supabase
    .from("agency_users")
    .select("id")
    .eq("user_id", userId)
    .single();
  if (agencyUser) { router.push("/agency-dashboard"); return; }

  // Check if doctor onboarding completed
  const { data: doctorData } = await supabase
    .from("doctors")
    .select("onboarding_completed")
    .eq("user_id", userId)
    .single();

  if (!doctorData || !doctorData.onboarding_completed) {
    router.push("/onboarding");
    return;
  }

  router.push("/dashboard");
  };

  const handleLogin = async () => {
    setError("");
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    if (data.user) {
      await redirectAfterLogin(data.user.id);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setError(error.message);
      setGoogleLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f8faff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        .input-field { width: 100%; padding: 13px 16px; border: 1.5px solid #e0eaff; border-radius: 12px; font-size: 0.95rem; color: #0f172a; background: #fff; outline: none; transition: border-color 0.2s, box-shadow 0.2s; font-family: 'DM Sans', sans-serif; }
        .input-field:focus { border-color: #1d4ed8; box-shadow: 0 0 0 4px rgba(29,78,216,0.08); }
        .input-field::placeholder { color: #94a3b8; }
        .btn { width: 100%; padding: 14px; background: #1d4ed8; color: #fff; font-weight: 600; font-size: 0.95rem; border: none; border-radius: 12px; cursor: pointer; box-shadow: 0 4px 18px rgba(29,78,216,0.25); font-family: 'DM Sans', sans-serif; transition: background 0.2s; }
        .btn:hover:not(:disabled) { background: #1e40af; }
        .btn:disabled { opacity: 0.7; cursor: not-allowed; }
        .btn-google { width: 100%; padding: 13px; background: #fff; color: #374151; font-weight: 600; font-size: 0.95rem; border: 1.5px solid #e0eaff; border-radius: 12px; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 10px; }
        .btn-google:hover:not(:disabled) { background: #f8faff; border-color: #1d4ed8; }
        .btn-google:disabled { opacity: 0.7; cursor: not-allowed; }
        label { display: block; font-size: 0.85rem; font-weight: 600; color: #374151; margin-bottom: 8px; }
        .divider { display: flex; align-items: center; gap: 12px; margin: 4px 0; }
        .divider::before, .divider::after { content: ""; flex: 1; height: 1px; background: #e0eaff; }
        .divider span { font-size: 0.78rem; color: #94a3b8; font-weight: 500; }
      `}</style>

      <div style={{ width: "100%", maxWidth: 440, padding: "0 24px" }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 40 }}>
          <div style={{ width: 30, height: 30, background: "#1d4ed8", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
              <path d="M9 2v14M2 9h14" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </div>
          <span style={{ fontWeight: 700, fontSize: "1.1rem", color: "#1d4ed8" }}>MedHub</span>
        </div>

        <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "2rem", color: "#0f172a", marginBottom: 8 }}>Sign in</h1>
        <p style={{ color: "#64748b", fontSize: "0.92rem", marginBottom: 36 }}>
          Don&apos;t have an account?{" "}
          <a href="/signup" style={{ color: "#1d4ed8", fontWeight: 600, textDecoration: "none" }}>Create one</a>
          <div style={{ textAlign: "center", marginTop: 8 }}>
  <p style={{ fontSize: "0.82rem", color: "#94a3b8", marginBottom: 6 }}>Don't want to use a password?</p>
  <a href="/otp-login" style={{ fontSize: "0.88rem", color: "#1d4ed8", fontWeight: 600, textDecoration: "none" }}>Sign in with email code instead →</a>
</div>
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Google Sign In */}
          <button className="btn-google" onClick={handleGoogleLogin} disabled={googleLoading}>
            {googleLoading ? (
              <span>Connecting...</span>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </>
            )}
          </button>

          <div className="divider"><span>or sign in with email</span></div>

          <div>
            <label>Email address</label>
            <input className="input-field" type="email" placeholder="doctor@example.com" value={email} onChange={e => setEmail(e.target.value)} />
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <label style={{ margin: 0 }}>Password</label>
              <a href="/forgot-password" style={{ fontSize: "0.82rem", color: "#1d4ed8", textDecoration: "none" }}>Forgot password?</a>
            </div>
            <input className="input-field" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && handleLogin()} />
          </div>

          {error && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "12px 16px", color: "#dc2626", fontSize: "0.88rem" }}>
              {error}
            </div>
          )}

          <button className="btn" onClick={handleLogin} disabled={loading}>
            {loading ? "Signing in..." : "Sign in to MedHub"}
          </button>
        </div>

        <p style={{ marginTop: 32, fontSize: "0.78rem", color: "#94a3b8", textAlign: "center", lineHeight: 1.6 }}>
          By signing in you agree to MedHub&apos;s Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}