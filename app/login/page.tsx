"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useRouter } from "next/navigation";
import Logo from "../components/Logo";

export default function LoginPage() {
  const router = useRouter();
  useEffect(() => {
    router.prefetch("/dashboard");
    router.prefetch("/admin");
    router.prefetch("/agency-dashboard");
    router.prefetch("/onboarding");
  }, [router]);
  const [userType, setUserType] = useState<"doctor" | "agency" | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const redirectAfterLogin = async (userId: string) => {
    const [adminResult, agencyResult, doctorResult] = await Promise.all([
      supabase.from("admins").select("id").eq("user_id", userId).single(),
      supabase.from("agency_users").select("id").eq("user_id", userId).single(),
      supabase.from("doctors").select("onboarding_completed").eq("user_id", userId).single(),
    ]);
    if (adminResult.data) { router.push("/admin"); return; }
    if (agencyResult.data) { router.push("/agency-dashboard"); return; }
    if (!doctorResult.data || !doctorResult.data.onboarding_completed) { router.push("/onboarding"); return; }
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
    <div style={{
      minHeight: "100dvh",
      background: "linear-gradient(135deg, #f8f9fc 0%, #f1f0f8 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "var(--font-inter), Inter, sans-serif",
      padding: "24px 16px",
    }}>
      <style>{`
        * { box-sizing: border-box; }
        .login-card {
          width: 100%;
          max-width: 440px;
        }
        .qm-input {
          width: 100%;
          padding: 13px 16px;
          border: 1.5px solid #e2e8f0;
          border-radius: 12px;
          font-size: 1rem;
          color: #0f172a;
          background: #fff;
          outline: none;
          font-family: inherit;
          transition: border-color 0.2s, box-shadow 0.2s;
          -webkit-appearance: none;
        }
        .qm-input:focus {
          border-color: #7c3aed;
          box-shadow: 0 0 0 3px rgba(124,58,237,0.1);
        }
        .qm-input::placeholder { color: #94a3b8; }
        .qm-btn-primary {
          width: 100%;
          padding: 14px;
          background: linear-gradient(135deg, #7c3aed, #6d28d9);
          color: #fff;
          font-weight: 600;
          font-size: 1rem;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.2s;
          box-shadow: 0 2px 12px rgba(124,58,237,0.3);
          -webkit-appearance: none;
        }
        .qm-btn-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 20px rgba(124,58,237,0.4);
        }
        .qm-btn-primary:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
        }
        @media (max-width: 480px) {
          .login-card {
            max-width: 100%;
          }
          .login-box {
            padding: 28px 20px !important;
            border-radius: 16px !important;
          }
          .login-title {
            font-size: 1.4rem !important;
          }
        }
        @media (min-width: 481px) and (max-width: 768px) {
          .login-card {
            max-width: 420px;
          }
        }
      `}</style>

      <div className="login-card">
        <div style={{ marginBottom: 32 }}><Logo /></div>

        <div
          className="login-box"
          style={{
            background: "#fff",
            borderRadius: 20,
            padding: "36px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 4px 24px rgba(51,65,85,0.08)",
          }}
        >
          <h1
            className="login-title"
            style={{
              fontSize: "1.6rem",
              fontWeight: 700,
              color: "#0f172a",
              marginBottom: 6,
              letterSpacing: "-0.02em",
            }}
          >
            Welcome back
          </h1>
          <p style={{ color: "#64748b", fontSize: "0.88rem", marginBottom: 28 }}>
            Don&apos;t have an account?{" "}
            <a href="/signup" style={{ color: "#7c3aed", fontWeight: 600, textDecoration: "none" }}>
              Create one
            </a>
          </p>

          {/* User type selector */}
          {!userType ? (
            <div>
              <p style={{ fontSize: "0.88rem", fontWeight: 600, color: "#64748b", marginBottom: 14, textAlign: "center" }}>I am a...</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <button
                  onClick={() => setUserType("doctor")}
                  style={{ width: "100%", padding: "16px", background: "#f5f3ff", border: "2px solid #ddd6fe", borderRadius: 14, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 14, transition: "all 0.2s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#7c3aed"; e.currentTarget.style.background = "#ede9fe"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "#ddd6fe"; e.currentTarget.style.background = "#f5f3ff"; }}
                >
                  <span style={{ fontSize: "1.8rem" }}>👨‍⚕️</span>
                  <div style={{ textAlign: "left" }}>
                    <p style={{ fontWeight: 700, fontSize: "0.95rem", color: "#0f172a" }}>Doctor</p>
                    <p style={{ fontSize: "0.78rem", color: "#64748b", marginTop: 2 }}>Access your compliance passport & shifts</p>
                  </div>
                </button>
                <button
                  onClick={() => setUserType("agency")}
                  style={{ width: "100%", padding: "16px", background: "#f0fdf4", border: "2px solid #bbf7d0", borderRadius: 14, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 14, transition: "all 0.2s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#16a34a"; e.currentTarget.style.background = "#dcfce7"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "#bbf7d0"; e.currentTarget.style.background = "#f0fdf4"; }}
                >
                  <span style={{ fontSize: "1.8rem" }}>🏥</span>
                  <div style={{ textAlign: "left" }}>
                    <p style={{ fontWeight: 700, fontSize: "0.95rem", color: "#0f172a" }}>Agency</p>
                    <p style={{ fontSize: "0.78rem", color: "#64748b", marginTop: 2 }}>Manage your doctors & post shifts</p>
                  </div>
                </button>
              </div>
            </div>
          ) : (
            <div>
              <button
                onClick={() => setUserType(null)}
                style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: "#7c3aed", fontWeight: 600, fontSize: "0.82rem", fontFamily: "inherit", marginBottom: 20, padding: 0 }}
              >
                ← Back
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: 10, background: userType === "doctor" ? "#f5f3ff" : "#f0fdf4", border: `1.5px solid ${userType === "doctor" ? "#ddd6fe" : "#bbf7d0"}`, borderRadius: 10, padding: "10px 14px", marginBottom: 20 }}>
                <span style={{ fontSize: "1.2rem" }}>{userType === "doctor" ? "👨‍⚕️" : "🏥"}</span>
                <p style={{ fontSize: "0.85rem", fontWeight: 600, color: "#0f172a" }}>Signing in as {userType === "doctor" ? "a Doctor" : "an Agency"}</p>
              </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div>
              <label style={{
                display: "block",
                fontSize: "0.78rem",
                fontWeight: 600,
                color: "#64748b",
                marginBottom: 8,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}>
                Email address
              </label>
              <input
                className="qm-input"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="doctor@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleLogin()}
              />
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label style={{
                    display: "block",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    color: "#64748b",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}>
                    Password
                  </label>
                  <a
                    href="/forgot-password"
                    style={{ fontSize: "0.82rem", color: "#7c3aed", textDecoration: "none", fontWeight: 500 }}
                  >
                    Forgot password?
                  </a>
                </div>
              </div>
              <input
                className="qm-input"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleLogin()}
              />
            </div>

            {error && (
              <div style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: 10,
                padding: "12px 14px",
                color: "#dc2626",
                fontSize: "0.88rem",
                lineHeight: 1.5,
              }}>
                {error}
              </div>
            )}

            <button
              className="qm-btn-primary"
              onClick={handleLogin}
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign in to Quiet"}
            </button>
          </div>
            </div>
          )}
        </div>
        <p style={{
          marginTop: 20,
          fontSize: "0.75rem",
          color: "#94a3b8",
          textAlign: "center",
          lineHeight: 1.6,
          padding: "0 8px",
        }}>
          By signing in you agree to Quiet&apos;s Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}