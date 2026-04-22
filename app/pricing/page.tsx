"use client";

import { useState } from "react";
import Logo from "../components/Logo";

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f8f9fc 0%, #f1f0f8 100%)", fontFamily: "var(--font-inter), Inter, sans-serif" }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .pricing-card { background: #fff; border-radius: 20px; border: 1px solid #e2e8f0; padding: 28px; transition: all 0.2s; }
        .pricing-card:hover { transform: translateY(-4px); box-shadow: 0 12px 40px rgba(51,65,85,0.1); }
        @media (max-width: 900px) { .pricing-grid { grid-template-columns: 1fr 1fr !important; } }
        @media (max-width: 600px) { .pricing-grid { grid-template-columns: 1fr !important; } }
      `}</style>

      {/* Nav */}
      <nav style={{ padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", maxWidth: 1100, margin: "0 auto" }}>
        <Logo />
        <div style={{ display: "flex", gap: 12 }}>
          <a href="/login" style={{ color: "#64748b", textDecoration: "none", fontSize: "0.9rem", fontWeight: 500 }}>Sign in</a>
          <a href="/signup" style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "#fff", textDecoration: "none", fontSize: "0.88rem", fontWeight: 600, padding: "8px 18px", borderRadius: 10 }}>Get started free</a>
        </div>
      </nav>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 24px 80px" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <h1 style={{ fontSize: "2.8rem", fontWeight: 800, color: "#0f172a", marginBottom: 12, letterSpacing: "-0.03em" }}>Simple, transparent pricing</h1>
          <p style={{ fontSize: "1rem", color: "#64748b", marginBottom: 32 }}>Start free. Upgrade when you need more.</p>

          {/* Billing toggle */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
            <span style={{ fontSize: "0.9rem", color: billingCycle === "monthly" ? "#0f172a" : "#94a3b8", fontWeight: billingCycle === "monthly" ? 600 : 400 }}>Monthly</span>
            <div onClick={() => setBillingCycle(prev => prev === "monthly" ? "yearly" : "monthly")}
              style={{ width: 48, height: 26, background: billingCycle === "yearly" ? "#7c3aed" : "#e2e8f0", borderRadius: 100, cursor: "pointer", position: "relative", transition: "background 0.2s" }}>
              <div style={{ position: "absolute", top: 3, left: billingCycle === "yearly" ? 25 : 3, width: 20, height: 20, background: "#fff", borderRadius: "50%", transition: "left 0.2s", boxShadow: "0 1px 4px rgba(0,0,0,0.2)" }} />
            </div>
            <span style={{ fontSize: "0.9rem", color: billingCycle === "yearly" ? "#0f172a" : "#94a3b8", fontWeight: billingCycle === "yearly" ? 600 : 400 }}>
              Yearly <span style={{ background: "#f0fdf4", color: "#16a34a", fontSize: "0.72rem", fontWeight: 700, padding: "2px 7px", borderRadius: 100, marginLeft: 4 }}>Save 17%</span>
            </span>
          </div>
        </div>

        {/* Doctor pricing label */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.06em" }}>👨‍⚕️ For Doctors</span>
          <div style={{ flex: 1, height: 1, background: "#e2e8f0" }} />
        </div>

        {/* Doctor pricing grid */}
        <div className="pricing-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, marginBottom: 60 }}>

          {/* Base */}
          <div className="pricing-card">
            <p style={{ fontSize: "0.78rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Base</p>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 6 }}>
              <span style={{ fontSize: "2.4rem", fontWeight: 800, color: "#0f172a" }}>Free</span>
            </div>
            <p style={{ fontSize: "0.82rem", color: "#94a3b8", marginBottom: 20 }}>Forever free. No credit card needed.</p>
            <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 16, marginBottom: 20 }}>
              {["Digital Compliance Vault", "Basic Profile", "Privacy Shield", "Agency Carousel (blurred)", "Profile Matches (count only)", "Document Sharing"].map((f, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0" }}>
                  <span style={{ color: "#16a34a", fontWeight: 700, flexShrink: 0 }}>✓</span>
                  <span style={{ fontSize: "0.84rem", color: "#374151" }}>{f}</span>
                </div>
              ))}
            </div>
            <a href="/signup" style={{ display: "block", textAlign: "center", background: "#f1f5f9", color: "#334155", padding: "12px", borderRadius: 12, fontWeight: 700, fontSize: "0.9rem", textDecoration: "none" }}>Get started free</a>
          </div>

          {/* Pro */}
          <div className="pricing-card" style={{ border: "2px solid #7c3aed", position: "relative", boxShadow: "0 8px 32px rgba(124,58,237,0.15)" }}>
            <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "#fff", fontSize: "0.7rem", fontWeight: 700, padding: "4px 14px", borderRadius: 100, whiteSpace: "nowrap" }}>MOST POPULAR</div>
            <p style={{ fontSize: "0.78rem", fontWeight: 700, color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Pro</p>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 4 }}>
              <span style={{ fontSize: "2.4rem", fontWeight: 800, color: "#0f172a" }}>£{billingCycle === "monthly" ? "15" : "12.50"}</span>
              <span style={{ fontSize: "0.9rem", color: "#94a3b8" }}>/month</span>
            </div>
            <p style={{ fontSize: "0.82rem", color: billingCycle === "yearly" ? "#16a34a" : "#94a3b8", fontWeight: billingCycle === "yearly" ? 600 : 400, marginBottom: 20 }}>
              {billingCycle === "yearly" ? "£150/year — save £30" : "or £150/year"}
            </p>
            <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 16, marginBottom: 20 }}>
              {["Everything in Base", "Work Feed", "Proactive Chat (2/day)", "Live Vacancy Calendar", "BMA Rate Benchmarking", "Agency Reviews", "Agency Names Visible", "Appraisal Tracking"].map((f, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0" }}>
                  <span style={{ color: "#7c3aed", fontWeight: 700, flexShrink: 0 }}>✓</span>
                  <span style={{ fontSize: "0.84rem", color: "#374151" }}>{f}</span>
                </div>
              ))}
            </div>
            <a href="/signup" style={{ display: "block", textAlign: "center", background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "#fff", padding: "12px", borderRadius: 12, fontWeight: 700, fontSize: "0.9rem", textDecoration: "none", boxShadow: "0 4px 16px rgba(124,58,237,0.3)" }}>Start Pro</a>
          </div>

          {/* Advanced */}
          <div className="pricing-card" style={{ border: "2px solid #334155", position: "relative" }}>
            <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: "linear-gradient(135deg, #1e293b, #334155)", color: "#fff", fontSize: "0.7rem", fontWeight: 700, padding: "4px 14px", borderRadius: 100, whiteSpace: "nowrap" }}>🔥 RELAUNCH OFFER</div>
            <p style={{ fontSize: "0.78rem", fontWeight: 700, color: "#334155", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Advanced</p>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: "1.3rem", fontWeight: 700, color: "#94a3b8", textDecoration: "line-through" }}>£25</span>
              <span style={{ fontSize: "2.4rem", fontWeight: 800, color: "#0f172a" }}>£{billingCycle === "monthly" ? "15" : "12.50"}</span>
              <span style={{ fontSize: "0.9rem", color: "#94a3b8" }}>/month</span>
            </div>
            <p style={{ fontSize: "0.82rem", color: "#94a3b8", marginBottom: 8 }}>{billingCycle === "yearly" ? "£150/year · relaunch price" : "or £150/year · Until May relaunch"}</p>
            <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "5px 10px", marginBottom: 20, fontSize: "0.73rem", color: "#92400e", fontWeight: 600 }}>
              ⏰ Price goes to £25/month after relaunch
            </div>
            <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 16, marginBottom: 20 }}>
              {["Everything in Pro", "Priority Feed", "Unlimited Chat", "Instant Grab", "Universal Passport", "Recruiter SLA", "Designated Body/RO Link", "Top of Agency Search"].map((f, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0" }}>
                  <span style={{ color: "#334155", fontWeight: 700, flexShrink: 0 }}>✓</span>
                  <span style={{ fontSize: "0.84rem", color: "#374151" }}>{f}</span>
                </div>
              ))}
            </div>
            <a href="/signup" style={{ display: "block", textAlign: "center", background: "linear-gradient(135deg, #1e293b, #334155)", color: "#fff", padding: "12px", borderRadius: 12, fontWeight: 700, fontSize: "0.9rem", textDecoration: "none" }}>Start Advanced</a>
          </div>
        </div>

        {/* FAQ */}
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <h2 style={{ fontSize: "1.8rem", fontWeight: 800, color: "#0f172a", textAlign: "center", marginBottom: 40, letterSpacing: "-0.02em" }}>Frequently asked questions</h2>
          {[
            { q: "Can I upgrade or downgrade anytime?", a: "Yes — you can change your plan at any time. Upgrades take effect immediately. Downgrades take effect at the end of your billing period." },
            { q: "Is the Advanced relaunch offer limited?", a: "Yes — the £15/month Advanced price is a special relaunch offer until May. After that it returns to £25/month. Lock in the lower price now." },
            { q: "Do doctors need to pay to use Quiet?", a: "The Base plan is completely free for doctors forever. Pro (£15/month) and Advanced (£15/month relaunch price) unlock additional features." },
            { q: "Are there agency pricing plans?", a: "Yes — agency pricing is available when you register as an agency. Visit the agency registration page to learn more." },
            { q: "How do I cancel?", a: "You can cancel your subscription at any time from your account settings. No cancellation fees." },
          ].map((item, i) => (
            <div key={i} style={{ borderBottom: "1px solid #e2e8f0", padding: "20px 0" }}>
              <p style={{ fontWeight: 700, fontSize: "0.95rem", color: "#0f172a", marginBottom: 8 }}>{item.q}</p>
              <p style={{ fontSize: "0.88rem", color: "#64748b", lineHeight: 1.7 }}>{item.a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer style={{ background: "#0f172a", padding: "32px 24px", textAlign: "center" }}>
        <p style={{ fontSize: "0.78rem", color: "#475569" }}>© 2025 Quiet · quietmedical.co.uk · <a href="/" style={{ color: "#7c3aed", textDecoration: "none" }}>Back to home</a></p>
      </footer>
    </div>
  );
}