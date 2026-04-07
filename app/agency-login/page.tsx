"use client";

import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useRouter } from "next/navigation";

export default function AgencyLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError("");
    if (!email || !password) { setError("Please enter your email and password."); return; }
    setLoading(true);
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) { setError(authError.message); setLoading(false); return; }
    router.push("/agency-dashboard");
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f8faff 0%, #fdf4ff 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif", padding: 24 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        .input-field { width: 100%; padding: 10px 14px; border: 1.5px solid #e0eaff; border-radius: 10px; font-size: 0.9rem; color: #0f172a; background: #fff; outline: none; font-family: 'DM Sans', sans-serif; transition: border-color 0.2s; }
        .input-field:focus { border-color: #1d4ed8; }
      `}</style>
      <div style={{ background: "#fff", borderRadius: 24, padding: "40px 36px", width: "100%", maxWidth: 420, border: "1px solid #e8f0fe", boxShadow: "0 8px 40px rgba(29,78,216,0.08)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 32 }}>
          <div style={{ width: 32, height: 32, background: "#1d4ed8", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none"><path d="M9 2v14M2 9h14" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/></svg>
          </div>
          <span style={{ fontWeight: 700, fontSize: "1.1rem", color: "#1d4ed8" }}>MedHub</span>
          <span style={{ fontSize: "0.78rem", color: "#94a3b8", marginLeft: 4 }}>· Agency Portal</span>
        </div>
        <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.7rem", color: "#0f172a", marginBottom: 6 }}>Agency Sign In</h1>
        <p style={{ color: "#64748b", fontSize: "0.88rem", marginBottom: 28 }}>Sign in with the credentials provided by MedHub.</p>

        {error && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", padding: "10px 14px", borderRadius: 10, fontSize: "0.85rem", marginBottom: 20 }}>{error}</div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Email</label>
            <input className="input-field" type="email" placeholder="agency@example.com" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Password</label>
            <input className="input-field" type="password" placeholder="Your password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && handleLogin()} />
          </div>
          <button onClick={handleLogin} disabled={loading} style={{ background: "#1d4ed8", color: "#fff", border: "none", padding: "13px", borderRadius: 10, fontWeight: 700, fontSize: "0.95rem", cursor: loading ? "not-allowed" : "pointer", fontFamily: "'DM Sans', sans-serif", marginTop: 4, opacity: loading ? 0.7 : 1, transition: "background 0.2s" }}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </div>

        <div style={{ marginTop: 28, padding: "16px", background: "#f8faff", borderRadius: 12, border: "1px solid #e8f0fe" }}>
          <p style={{ fontSize: "0.8rem", color: "#64748b", textAlign: "center" }}>Don't have login credentials yet?</p>
          <p style={{ fontSize: "0.8rem", color: "#1d4ed8", textAlign: "center", fontWeight: 600, marginTop: 4 }}>Contact MedHub to get started →</p>
        </div>

        <p style={{ textAlign: "center", fontSize: "0.82rem", color: "#94a3b8", marginTop: 20 }}>
          Are you a doctor? <span onClick={() => router.push("/login")} style={{ color: "#1d4ed8", fontWeight: 600, cursor: "pointer" }}>Doctor login</span>
        </p>
      </div>
    </div>
  );
}