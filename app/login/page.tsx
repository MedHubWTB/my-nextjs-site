"use client";

import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useRouter } from "next/navigation";
import Logo from "../components/Logo";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const redirectAfterLogin = async (userId: string) => {
    const { data: adminData } = await supabase.from("admins").select("id").eq("user_id", userId).single();
    if (adminData) { router.push("/admin"); return; }
    const { data: agencyUser } = await supabase.from("agency_users").select("id").eq("user_id", userId).single();
    if (agencyUser) { router.push("/agency-dashboard"); return; }
    const { data: doctorData } = await supabase.from("doctors").select("onboarding_completed").eq("user_id", userId).single();
    if (!doctorData || !doctorData.onboarding_completed) { router.push("/onboarding"); return; }
    router.push("/dashboard");
  };

  const handleLogin = async () => {
    setError("");
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { setError(error.message); return; }
    if (data.user) await redirectAfterLogin(data.user.id);
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) { setError(error.message); setGoogleLoading(false); }
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f8f9fc 0%, #f1f0f8 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-inter), Inter, sans-serif", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 440 }}>
        <div style={{ marginBottom: 40 }}><Logo /></div>

        <div style={{ background: "#fff", borderRadius: 20, padding: "36px", border: "1px solid #e2e8f0", boxShadow: "0 4px 24px rgba(51,65,85,0.08)" }}>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 700, color: "#0f172a", marginBottom: 6, letterSpacing: "-0.02em" }}>Welcome back</h1>
          <p style={{ color: "#64748b", fontSize: "0.88rem", marginBottom: 28 }}>
            Don&apos;t have an account?{" "}
            <a href="/signup" style={{ color: "#7c3aed", fontWeight: 600, textDecoration: "none" }}>Create one</a>
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Google */}
            <button
              onClick={handleGoogleLogin}
              disabled={googleLoading}
              style={{ width: "100%", padding: "11px", background: "#fff", color: "#334155", fontWeight: 600, fontSize: "0.9rem", border: "1.5px solid #e2e8f0", borderRadius: 12, cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}
            >
              {googleLoading ? "Connecting..." : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </>
              )}
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ flex: 1, height: 1, background: "#e2e8f0" }} />
              <span style={{ fontSize: "0.78rem", color: "#94a3b8", fontWeight: 500 }}>or sign in with email</span>
              <div style={{ flex: 1, height: 1, background: "#e2e8f0" }} />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Email address</label>
              <input className="qm-input" type="email" placeholder="doctor@example.com" value={email} onChange={e => setEmail(e.target.value)} />
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>Password</label>
                <a href="/forgot-password" style={{ fontSize: "0.78rem", color: "#7c3aed", textDecoration: "none", fontWeight: 500 }}>Forgot password?</a>
              </div>
              <input className="qm-input" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && handleLogin()} />
            </div>

            {error && (
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "10px 14px", color: "#dc2626", fontSize: "0.85rem" }}>{error}</div>
            )}

            <button className="qm-btn-primary" style={{ width: "100%", padding: "13px", fontSize: "0.95rem", borderRadius: 12 }} onClick={handleLogin} disabled={loading}>
              {loading ? "Signing in..." : "Sign in to QuietMedical"}
            </button>

            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: "0.82rem", color: "#94a3b8", marginBottom: 6 }}>Prefer passwordless login?</p>
              <a href="/otp-login" style={{ fontSize: "0.88rem", color: "#7c3aed", fontWeight: 600, textDecoration: "none" }}>Sign in with email code →</a>
            </div>
          </div>
        </div>

        <p style={{ marginTop: 20, fontSize: "0.75rem", color: "#94a3b8", textAlign: "center", lineHeight: 1.6 }}>
          By signing in you agree to QuietMedical&apos;s Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}