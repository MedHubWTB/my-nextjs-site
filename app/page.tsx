"use client";

import { useState, useEffect } from "react";
import Logo from "./components/Logo";

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div style={{ fontFamily: "var(--font-inter), Inter, -apple-system, sans-serif", color: "#0f172a", overflowX: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        .nav-link { color: #64748b; text-decoration: none; font-size: 0.9rem; font-weight: 500; transition: color 0.2s; }
        .nav-link:hover { color: #334155; }
        .btn-primary { display: inline-block; background: linear-gradient(135deg, #1e293b, #334155); color: #fff; font-weight: 600; font-size: 0.95rem; padding: 13px 28px; border-radius: 12px; text-decoration: none; border: none; cursor: pointer; font-family: inherit; transition: all 0.2s; box-shadow: 0 2px 12px rgba(51,65,85,0.25); letter-spacing: -0.01em; }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(51,65,85,0.3); opacity: 0.95; }
        .btn-ghost { display: inline-block; background: transparent; color: #334155; font-weight: 600; font-size: 0.95rem; padding: 13px 28px; border-radius: 12px; text-decoration: none; border: 1.5px solid #e2e8f0; cursor: pointer; font-family: inherit; transition: all 0.2s; }
        .btn-ghost:hover { border-color: #334155; background: #f8f9fc; }
        .btn-violet { display: inline-block; background: linear-gradient(135deg, #6d28d9, #7c3aed); color: #fff; font-weight: 600; font-size: 0.95rem; padding: 13px 28px; border-radius: 12px; text-decoration: none; border: none; cursor: pointer; font-family: inherit; transition: all 0.2s; box-shadow: 0 2px 12px rgba(124,58,237,0.25); }
        .btn-violet:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(124,58,237,0.3); }
        .feature-card { background: #fff; border-radius: 16px; padding: 28px; border: 1px solid #e2e8f0; transition: all 0.25s; }
        .feature-card:hover { transform: translateY(-4px); box-shadow: 0 12px 40px rgba(51,65,85,0.1); border-color: #ddd6fe; }
        .step-card { background: #fff; border-radius: 16px; padding: 28px; border: 1px solid #e2e8f0; position: relative; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        .fade-up { animation: fadeUp 0.7s ease both; }
        .fade-up-2 { animation: fadeUp 0.7s 0.15s ease both; }
        .fade-up-3 { animation: fadeUp 0.7s 0.3s ease both; }
        .float { animation: float 4s ease-in-out infinite; }
        @media (max-width: 768px) {
          .hero-grid { grid-template-columns: 1fr !important; }
          .features-grid { grid-template-columns: 1fr !important; }
          .steps-grid { grid-template-columns: 1fr !important; }
          .nav-links { display: none !important; }
          .mobile-menu { display: flex !important; }
        }
      `}</style>

      {/* NAVBAR */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, padding: "0 24px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", background: scrolled ? "rgba(255,255,255,0.95)" : "transparent", backdropFilter: scrolled ? "blur(12px)" : "none", borderBottom: scrolled ? "1px solid #e2e8f0" : "none", transition: "all 0.3s" }}>
        <Logo />
        <div className="nav-links" style={{ display: "flex", alignItems: "center", gap: 32 }}>
          <a href="#for-doctors" className="nav-link">For Doctors</a>
          <a href="#for-agencies" className="nav-link">For Agencies</a>
          <a href="#how-it-works" className="nav-link">How it works</a>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <a href="/login" className="btn-ghost" style={{ padding: "9px 20px", fontSize: "0.88rem" }}>Sign in</a>
          <a href="/signup" className="btn-primary" style={{ padding: "9px 20px", fontSize: "0.88rem" }}>Get started free</a>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ minHeight: "100vh", background: "linear-gradient(160deg, #f8f9fc 0%, #f1f0f8 50%, #e8f4f8 100%)", display: "flex", alignItems: "center", padding: "100px 24px 80px", position: "relative", overflow: "hidden" }}>
        {/* Background decoration */}
        <div style={{ position: "absolute", top: "10%", right: "-5%", width: 500, height: 500, background: "radial-gradient(circle, rgba(124,58,237,0.08) 0%, transparent 70%)", borderRadius: "50%", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "10%", left: "-5%", width: 400, height: 400, background: "radial-gradient(circle, rgba(51,65,85,0.06) 0%, transparent 70%)", borderRadius: "50%", pointerEvents: "none" }} />

        <div style={{ maxWidth: 1100, margin: "0 auto", width: "100%" }}>
          <div className="hero-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center" }}>
            {/* Left */}
            <div>
              <div className="fade-up" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#fff", border: "1px solid #ddd6fe", borderRadius: 100, padding: "6px 14px", marginBottom: 24, boxShadow: "0 2px 8px rgba(124,58,237,0.1)" }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#7c3aed", display: "inline-block" }} />
                <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "#7c3aed", letterSpacing: "0.04em" }}>NOW LIVE — UK LOCUM DOCTORS</span>
              </div>

              <h1 className="fade-up-2" style={{ fontSize: "3.2rem", fontWeight: 800, color: "#0f172a", lineHeight: 1.15, marginBottom: 20, letterSpacing: "-0.03em" }}>
                Your compliance passport.<br />
                <span style={{ background: "linear-gradient(135deg, #334155, #7c3aed)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Quietly powerful.</span>
              </h1>

              <p className="fade-up-3" style={{ fontSize: "1.1rem", color: "#64748b", lineHeight: 1.7, marginBottom: 36, maxWidth: 480 }}>
                One secure place for your GMC certificate, DBS, Right to Work, and indemnity documents. Share with agencies in one click — with full control over who sees what.
              </p>

              <div className="fade-up-3" style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                <a href="/signup" className="btn-primary" style={{ fontSize: "1rem", padding: "14px 32px" }}>
                  Create free account →
                </a>
                <a href="/otp-login" className="btn-ghost" style={{ fontSize: "1rem", padding: "14px 32px" }}>
                  Sign in with email code
                </a>
              </div>

              <div className="fade-up-3" style={{ display: "flex", gap: 24, marginTop: 36, flexWrap: "wrap" }}>
                {[
                  { icon: "🔒", text: "No data sharing without consent" },
                  { icon: "✅", text: "GMC verified profiles" },
                  { icon: "🇬🇧", text: "Built for UK locum doctors" },
                ].map((item, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <span style={{ fontSize: "1rem" }}>{item.icon}</span>
                    <span style={{ fontSize: "0.82rem", color: "#64748b", fontWeight: 500 }}>{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — Dashboard Preview */}
            <div className="float" style={{ position: "relative" }}>
              <div style={{ background: "#fff", borderRadius: 20, border: "1px solid #e2e8f0", boxShadow: "0 20px 60px rgba(51,65,85,0.15)", overflow: "hidden" }}>
                {/* Mock sidebar */}
                <div style={{ display: "grid", gridTemplateColumns: "200px 1fr" }}>
                  <div style={{ background: "#fff", borderRight: "1px solid #e2e8f0", padding: "20px 12px", minHeight: 340 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 20, padding: "0 6px" }}>
                      <div style={{ width: 24, height: 24, background: "linear-gradient(135deg, #1e293b, #334155)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ color: "#fff", fontWeight: 800, fontSize: "0.72rem" }}>Q</span>
                      </div>
                      <span style={{ fontWeight: 700, fontSize: "0.82rem", color: "#1e293b" }}>Quiet<span style={{ color: "#7c3aed" }}>Medical</span></span>
                    </div>
                    {["⊞ Overview", "📄 Document Vault", "🗓️ My Calendar", "🏥 My Agencies", "📝 Appraisal"].map((item, i) => (
                      <div key={i} style={{ padding: "7px 10px", borderRadius: 8, marginBottom: 3, background: i === 0 ? "linear-gradient(135deg, #1e293b, #334155)" : "transparent", color: i === 0 ? "#fff" : "#64748b", fontSize: "0.75rem", fontWeight: i === 0 ? 600 : 400 }}>{item}</div>
                    ))}
                  </div>
                  <div style={{ padding: 16, background: "#f8f9fc" }}>
                    <p style={{ fontSize: "0.7rem", color: "#94a3b8", marginBottom: 4 }}>Welcome back</p>
                    <p style={{ fontSize: "0.95rem", fontWeight: 700, color: "#0f172a", marginBottom: 14, letterSpacing: "-0.01em" }}>Good day, Dr. Smith 👋</p>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
                      {[
                        { icon: "📄", val: "8", label: "Documents" },
                        { icon: "🏥", val: "3", label: "Agencies" },
                        { icon: "⏱️", val: "124h", label: "This year" },
                      ].map((s, i) => (
                        <div key={i} style={{ background: "#fff", borderRadius: 10, padding: "10px 8px", border: "1px solid #e2e8f0", textAlign: "center" }}>
                          <div style={{ fontSize: "1rem" }}>{s.icon}</div>
                          <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "#0f172a" }}>{s.val}</div>
                          <div style={{ fontSize: "0.65rem", color: "#94a3b8" }}>{s.label}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ background: "#fff", borderRadius: 10, padding: "10px 12px", border: "1px solid #e2e8f0" }}>
                      <p style={{ fontSize: "0.72rem", fontWeight: 600, color: "#0f172a", marginBottom: 6 }}>Document Vault</p>
                      {["GMC Certificate", "DBS Check", "Right to Work"].map((doc, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 0", borderBottom: i < 2 ? "1px solid #f1f5f9" : "none" }}>
                          <span style={{ fontSize: "0.7rem", color: "#374151" }}>📄 {doc}</span>
                          <span style={{ fontSize: "0.62rem", background: "#f0fdf4", color: "#16a34a", padding: "1px 6px", borderRadius: 100, fontWeight: 600 }}>✓ Verified</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              {/* Floating badge */}
              <div style={{ position: "absolute", bottom: -16, right: -16, background: "#fff", borderRadius: 14, padding: "12px 16px", border: "1px solid #ddd6fe", boxShadow: "0 8px 24px rgba(124,58,237,0.15)", display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 36, height: 36, background: "linear-gradient(135deg, #6d28d9, #7c3aed)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem" }}>🛡️</div>
                <div>
                  <p style={{ fontSize: "0.78rem", fontWeight: 700, color: "#0f172a" }}>Privacy Shield</p>
                  <p style={{ fontSize: "0.68rem", color: "#94a3b8" }}>You control your data</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOR DOCTORS */}
      <section id="for-doctors" style={{ padding: "100px 24px", background: "#fff" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#f5f3ff", border: "1px solid #ddd6fe", borderRadius: 100, padding: "6px 14px", marginBottom: 16 }}>
              <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "#7c3aed" }}>👨‍⚕️ FOR DOCTORS</span>
            </div>
            <h2 style={{ fontSize: "2.4rem", fontWeight: 800, color: "#0f172a", marginBottom: 16, letterSpacing: "-0.03em" }}>
              Stop chasing paperwork.<br />Start doing what matters.
            </h2>
            <p style={{ fontSize: "1rem", color: "#64748b", maxWidth: 560, margin: "0 auto", lineHeight: 1.7 }}>
              QuietMedical gives you a single, verified compliance passport that travels with you across every locum placement.
            </p>
          </div>

          <div className="features-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
            {[
              {
                icon: "🔒",
                title: "Digital Compliance Vault",
                desc: "Store your GMC certificate, DBS, Right to Work, indemnity and appraisal documents in one secure place. Set expiry reminders so nothing lapses.",
                badge: "All plans",
                badgeColor: "#f1f5f9",
                badgeText: "#64748b",
              },
              {
                icon: "📤",
                title: "One-Click Document Sharing",
                desc: "Share your compliance documents with agencies instantly. You control who gets access, and you can revoke it at any time.",
                badge: "All plans",
                badgeColor: "#f1f5f9",
                badgeText: "#64748b",
              },
              {
                icon: "🛡️",
                title: "Privacy Shield",
                desc: "Agencies can only see your documents if you approve it. No cold calls, no spam, no data sold to third parties. Ever.",
                badge: "All plans",
                badgeColor: "#f1f5f9",
                badgeText: "#64748b",
              },
              {
                icon: "📰",
                title: "Work Feed",
                desc: "See matching locum roles from agencies looking for your specialty and grade. Filter by location, pay rate and freshness.",
                badge: "Pro & Advanced",
                badgeColor: "#f5f3ff",
                badgeText: "#7c3aed",
              },
              {
                icon: "💷",
                title: "BMA Rate Benchmarking",
                desc: "Compare your pay against the BMA Rate Card for your grade. Know your worth before you negotiate.",
                badge: "Pro & Advanced",
                badgeColor: "#f5f3ff",
                badgeText: "#7c3aed",
              },
              {
                icon: "⚡",
                title: "Instant Grab",
                desc: "One-click application for open calendar spots with priority status. Advanced members appear at the top of agency search results.",
                badge: "Advanced only",
                badgeColor: "linear-gradient(135deg, #1e293b, #334155)",
                badgeText: "#fff",
              },
            ].map((feature, i) => (
              <div key={i} className="feature-card">
                <div style={{ width: 48, height: 48, background: "linear-gradient(135deg, #f8f9fc, #f1f0f8)", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem", marginBottom: 16, border: "1px solid #e2e8f0" }}>{feature.icon}</div>
                <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#0f172a", marginBottom: 8, letterSpacing: "-0.01em" }}>{feature.title}</h3>
                <p style={{ fontSize: "0.85rem", color: "#64748b", lineHeight: 1.65, marginBottom: 14 }}>{feature.desc}</p>
                <span style={{ fontSize: "0.72rem", fontWeight: 700, padding: "3px 10px", borderRadius: 100, background: feature.badgeColor, color: feature.badgeText, letterSpacing: "0.02em" }}>{feature.badge}</span>
              </div>
            ))}
          </div>

          <div style={{ textAlign: "center", marginTop: 48 }}>
            <a href="/signup" className="btn-primary" style={{ fontSize: "1rem", padding: "14px 36px" }}>Create your compliance passport →</a>
          </div>
        </div>
      </section>

      {/* FOR AGENCIES */}
      <section id="for-agencies" style={{ padding: "100px 24px", background: "linear-gradient(160deg, #f8f9fc, #f1f0f8)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 100, padding: "6px 14px", marginBottom: 16 }}>
              <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "#334155" }}>🏥 FOR AGENCIES</span>
            </div>
            <h2 style={{ fontSize: "2.4rem", fontWeight: 800, color: "#0f172a", marginBottom: 16, letterSpacing: "-0.03em" }}>
              Find verified doctors.<br />Fill shifts faster.
            </h2>
            <p style={{ fontSize: "1rem", color: "#64748b", maxWidth: 560, margin: "0 auto", lineHeight: 1.7 }}>
              Access a pool of pre-verified UK locum doctors. Post shifts directly to their calendars and manage compliance documents in one place.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24 }}>
            {[
              { icon: "📋", title: "Post Shifts to Doctor Calendars", desc: "Publish open spots that appear directly on matching doctors' live calendars. Get instant grabs from Advanced tier doctors." },
              { icon: "🔍", title: "Market View", desc: "Browse active UK locum doctors matching your specialty requirements. Pro and Advanced agencies get summarised CVs and outreach credits." },
              { icon: "📄", title: "Verified Compliance Documents", desc: "Request access to doctor compliance documents directly through the platform. No more chasing paper trails." },
              { icon: "⚡", title: "Top Agency Status", desc: "Advanced agencies get their logo and jobs pinned to the top of all doctor lists, plus 2x email blasts to targeted doctors per month." },
            ].map((feature, i) => (
              <div key={i} className="feature-card">
                <div style={{ width: 48, height: 48, background: "linear-gradient(135deg, #f8f9fc, #f1f0f8)", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem", marginBottom: 16, border: "1px solid #e2e8f0" }}>{feature.icon}</div>
                <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#0f172a", marginBottom: 8, letterSpacing: "-0.01em" }}>{feature.title}</h3>
                <p style={{ fontSize: "0.85rem", color: "#64748b", lineHeight: 1.65 }}>{feature.desc}</p>
              </div>
            ))}
          </div>

          <div style={{ textAlign: "center", marginTop: 48 }}>
            <a href="/agency-contact" className="btn-ghost" style={{ fontSize: "1rem", padding: "14px 36px" }}>Register your agency →</a>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" style={{ padding: "100px 24px", background: "#fff" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <h2 style={{ fontSize: "2.4rem", fontWeight: 800, color: "#0f172a", marginBottom: 16, letterSpacing: "-0.03em" }}>Up and running in minutes</h2>
            <p style={{ fontSize: "1rem", color: "#64748b", lineHeight: 1.7 }}>No forms to fill, no documents to post. Just sign up and start.</p>
          </div>

          <div className="steps-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
            {[
              { step: "01", icon: "✉️", title: "Sign up with your email", desc: "No password needed. Enter your email, get a one-time code, and you're in." },
              { step: "02", icon: "📋", title: "Build your compliance passport", desc: "Add your specialty, grade and GMC number. Upload your compliance documents securely." },
              { step: "03", icon: "🚀", title: "Connect with agencies", desc: "Agencies find you based on your specialty and grade. Share your documents with one click." },
            ].map((step, i) => (
              <div key={i} className="step-card">
                <div style={{ position: "absolute", top: 20, right: 20, fontSize: "2rem", fontWeight: 800, color: "#f1f5f9", letterSpacing: "-0.05em" }}>{step.step}</div>
                <div style={{ width: 48, height: 48, background: "linear-gradient(135deg, #1e293b, #334155)", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem", marginBottom: 16, boxShadow: "0 4px 12px rgba(51,65,85,0.2)" }}>{step.icon}</div>
                <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#0f172a", marginBottom: 8, letterSpacing: "-0.01em" }}>{step.title}</h3>
                <p style={{ fontSize: "0.85rem", color: "#64748b", lineHeight: 1.65 }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section style={{ padding: "100px 24px", background: "linear-gradient(135deg, #1e293b 0%, #334155 50%, #4c1d95 100%)", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "20%", right: "10%", width: 300, height: 300, background: "radial-gradient(circle, rgba(124,58,237,0.3) 0%, transparent 70%)", borderRadius: "50%", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "10%", left: "5%", width: 200, height: 200, background: "radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%)", borderRadius: "50%", pointerEvents: "none" }} />
        <div style={{ maxWidth: 700, margin: "0 auto", textAlign: "center", position: "relative" }}>
          <h2 style={{ fontSize: "2.8rem", fontWeight: 800, color: "#fff", marginBottom: 16, letterSpacing: "-0.03em", lineHeight: 1.2 }}>
            Your compliance passport.<br />Always ready.
          </h2>
          <p style={{ fontSize: "1.05rem", color: "rgba(255,255,255,0.75)", marginBottom: 40, lineHeight: 1.7 }}>
            Join UK locum doctors who've moved their compliance documents out of email and into QuietMedical.
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <a href="/signup" style={{ display: "inline-block", background: "#fff", color: "#1e293b", fontWeight: 700, fontSize: "1rem", padding: "14px 36px", borderRadius: 12, textDecoration: "none", transition: "all 0.2s", boxShadow: "0 4px 16px rgba(0,0,0,0.2)" }}>
              Create free account →
            </a>
            <a href="/otp-login" style={{ display: "inline-block", background: "rgba(255,255,255,0.1)", color: "#fff", fontWeight: 600, fontSize: "1rem", padding: "14px 36px", borderRadius: 12, textDecoration: "none", border: "1.5px solid rgba(255,255,255,0.2)", transition: "all 0.2s" }}>
              Sign in with email code
            </a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: "#0f172a", padding: "48px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 24, marginBottom: 32 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 28, height: 28, background: "linear-gradient(135deg, #334155, #475569)", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ color: "#fff", fontWeight: 800, fontSize: "0.82rem" }}>Q</span>
              </div>
              <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "#fff", letterSpacing: "-0.02em" }}>Quiet<span style={{ color: "#a78bfa" }}>Medical</span></span>
            </div>
            <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
              {[
                { label: "For Doctors", href: "#for-doctors" },
                { label: "For Agencies", href: "#for-agencies" },
                { label: "Sign In", href: "/login" },
                { label: "Sign Up", href: "/signup" },
              ].map((link, i) => (
                <a key={i} href={link.href} style={{ color: "#94a3b8", textDecoration: "none", fontSize: "0.85rem", fontWeight: 500, transition: "color 0.2s" }}>{link.label}</a>
              ))}
            </div>
          </div>
          <div style={{ borderTop: "1px solid #1e293b", paddingTop: 24, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <p style={{ fontSize: "0.78rem", color: "#475569" }}>© 2025 QuietMedical. Built for UK locum doctors.</p>
            <p style={{ fontSize: "0.78rem", color: "#475569" }}>Privacy Policy · Terms of Service</p>
          </div>
        </div>
      </footer>
    </div>
  );
}