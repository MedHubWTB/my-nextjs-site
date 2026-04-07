"use client";

import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useRouter } from "next/navigation";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    setError("");
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) { setError(error.message); return; }
    router.push("/login?message=password_updated");
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f8faff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif", padding: 24 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        .input-field { width: 100%; padding: 13px 16px; border: 1.5px solid #e0eaff; border-radius: 12px; font-size: 0.95rem; color: #0f172a; background: #fff; outline: none; font-family: 'DM Sans', sans-serif; }
        .input-field:focus { border-color: #1d4ed8; }
        .btn { width: 100%; padding: 14px; background: #1d4ed8; color: #fff; font-weight: 600; font-size: 0.95rem; border: none; border-radius: 12px; cursor: pointer; font-family: 'DM Sans', sans-serif; }
        .btn:disabled { opacity: 0.7; cursor: not-allowed; }
      `}</style>
      <div style={{ width: "100%", maxWidth: 440 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 40 }}>
          <div style={{ width: 30, height: 30, background: "#1d4ed8", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none"><path d="M9 2v14M2 9h14" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/></svg>
          </div>
          <span style={{ fontWeight: 700, fontSize: "1.1rem", color: "#1d4ed8" }}>MedHub</span>
        </div>
        <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "2rem", color: "#0f172a", marginBottom: 8 }}>New password</h1>
        <p style={{ color: "#64748b", fontSize: "0.92rem", marginBottom: 36 }}>Choose a new password for your account.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#374151", marginBottom: 8 }}>New Password</label>
            <input className="input-field" type="password" placeholder="Min. 6 characters" value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#374151", marginBottom: 8 }}>Confirm Password</label>
            <input className="input-field" type="password" placeholder="Repeat password" value={confirm} onChange={e => setConfirm(e.target.value)} />
          </div>
          {error && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "12px 16px", color: "#dc2626", fontSize: "0.88rem" }}>{error}</div>}
          <button className="btn" onClick={handleReset} disabled={loading || !password || !confirm}>{loading ? "Updating..." : "Update Password"}</button>
        </div>
      </div>
    </div>
  );
}