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
            <div>
              <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Email address</label>
              <input className="qm-input" type="email" placeholder="doctor@example.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && handleLogin()} />
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

          </div>
        </div>

        <p style={{ marginTop: 20, fontSize: "0.75rem", color: "#94a3b8", textAlign: "center", lineHeight: 1.6 }}>
          By signing in you agree to QuietMedical&apos;s Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}