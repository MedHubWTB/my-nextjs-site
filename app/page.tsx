"use client";
import { supabase } from './lib/supabase'
console.log('Supabase connected:', supabase)

export default function Home() {
  return (
    <main className="min-h-screen bg-white font-sans overflow-x-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600&display=swap');

        * { box-sizing: border-box; }

        body { font-family: 'DM Sans', sans-serif; }

        .font-display { font-family: 'DM Serif Display', serif; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes pulse-ring {
          0%   { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(37,99,235,0.25); }
          70%  { transform: scale(1);    box-shadow: 0 0 0 14px rgba(37,99,235,0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(37,99,235,0); }
        }

        .anim-1 { animation: fadeUp 0.7s ease both; }
        .anim-2 { animation: fadeUp 0.7s 0.15s ease both; }
        .anim-3 { animation: fadeUp 0.7s 0.30s ease both; }
        .anim-4 { animation: fadeUp 0.7s 0.45s ease both; }
        .anim-5 { animation: fadeIn 1.2s 0.6s ease both; }

        .btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #1d4ed8;
          color: #fff;
          font-family: 'DM Sans', sans-serif;
          font-weight: 600;
          font-size: 0.95rem;
          letter-spacing: 0.01em;
          padding: 14px 32px;
          border-radius: 100px;
          border: none;
          cursor: pointer;
          transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
          box-shadow: 0 4px 18px rgba(29,78,216,0.28);
          animation: pulse-ring 2.8s 1.4s infinite;
        }
        .btn-primary:hover {
          background: #1e40af;
          transform: translateY(-2px);
          box-shadow: 0 8px 28px rgba(29,78,216,0.38);
        }

        .btn-ghost {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: transparent;
          color: #1d4ed8;
          font-family: 'DM Sans', sans-serif;
          font-weight: 500;
          font-size: 0.9rem;
          padding: 10px 20px;
          border-radius: 100px;
          border: 1.5px solid #bfdbfe;
          cursor: pointer;
          transition: background 0.2s, border-color 0.2s;
        }
        .btn-ghost:hover {
          background: #eff6ff;
          border-color: #93c5fd;
        }

        .btn-agency {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #f5f3ff;
          color: #6d28d9;
          font-family: 'DM Sans', sans-serif;
          font-weight: 500;
          font-size: 0.9rem;
          padding: 10px 20px;
          border-radius: 100px;
          border: 1.5px solid #d8b4fe;
          cursor: pointer;
          transition: background 0.2s, border-color 0.2s;
        }
        .btn-agency:hover {
          background: #ede9fe;
          border-color: #a78bfa;
        }

        .card {
          background: #f8faff;
          border: 1px solid #e0eaff;
          border-radius: 20px;
          padding: 32px 28px;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 36px rgba(29,78,216,0.10);
        }

        .grid-bg {
          background-image:
            linear-gradient(rgba(219,234,254,0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(219,234,254,0.5) 1px, transparent 1px);
          background-size: 48px 48px;
        }

        .stat-number {
          font-family: 'DM Serif Display', serif;
          font-size: 2.6rem;
          color: #1d4ed8;
          line-height: 1;
        }

        .pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #eff6ff;
          color: #1d4ed8;
          font-size: 0.78rem;
          font-weight: 600;
          letter-spacing: 0.07em;
          text-transform: uppercase;
          padding: 6px 14px;
          border-radius: 100px;
          border: 1px solid #bfdbfe;
        }

        nav {
          position: sticky;
          top: 0;
          z-index: 50;
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          background: rgba(255,255,255,0.88);
          border-bottom: 1px solid #e0eaff;
        }
      `}</style>

      {/* ── NAV ── */}
      <nav>
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 32, height: 32, background: '#1d4ed8', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M9 2v14M2 9h14" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            </div>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: '1.15rem', color: '#1d4ed8', letterSpacing: '-0.01em' }}>
              MedHub
            </span>
          </div>

          {/* Nav links + buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            {['Platform', 'Solutions', 'About'].map(link => (
              <a key={link} href="#" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.88rem', fontWeight: 500, color: '#475569', textDecoration: 'none', transition: 'color 0.15s' }}
                onMouseOver={e => (e.currentTarget.style.color = '#1d4ed8')}
                onMouseOut={e => (e.currentTarget.style.color = '#475569')}>
                {link}
              </a>
            ))}

            {/* Divider */}
            <div style={{ width: 1, height: 20, background: '#e0eaff' }} />

            {/* Doctor sign in */}
            <button
              className="btn-ghost"
              style={{ fontSize: '0.85rem', padding: '8px 18px' }}
              onClick={() => window.location.href = '/login'}>
              👨‍⚕️ Doctor Sign In
            </button>

            {/* Agency sign in */}
            <button
              className="btn-agency"
              style={{ fontSize: '0.85rem', padding: '8px 18px' }}
              onClick={() => window.location.href = '/agency-login'}>
              🏥 Agency Sign In
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="grid-bg" style={{ padding: '96px 24px 80px', textAlign: 'center', position: 'relative' }}>
        <div style={{ position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)', width: 600, height: 400, background: 'radial-gradient(ellipse, rgba(191,219,254,0.45) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', maxWidth: 760, margin: '0 auto' }}>
          <div className="anim-1" style={{ marginBottom: 20, display: 'flex', justifyContent: 'center' }}>
            <span className="pill">
              <span style={{ width: 6, height: 6, background: '#22c55e', borderRadius: '50%', display: 'inline-block' }} />
              Now in open beta
            </span>
          </div>

          <h1 className="font-display anim-2" style={{ fontSize: 'clamp(2.4rem, 6vw, 4rem)', color: '#0f172a', lineHeight: 1.1, letterSpacing: '-0.02em', margin: '0 0 24px' }}>
            The Future of<br />
            <em style={{ color: '#1d4ed8', fontStyle: 'italic' }}>Medical Coordination</em>
          </h1>

          <p className="anim-3" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '1.1rem', color: '#64748b', lineHeight: 1.7, maxWidth: 520, margin: '0 auto 40px', fontWeight: 400 }}>
            MedHub connects doctors and medical agencies in one intelligent platform — reducing admin and giving clinicians more time for what matters.
          </p>

          <div className="anim-4" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
            <button className="btn-primary" onClick={() => window.location.href = '/signup'}>
              Get Started — it&apos;s free
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <button className="btn-agency" onClick={() => window.location.href = '/agency-contact'}>
              🏥 Register your Agency
            </button>
          </div>
        </div>
      </section>

      {/* ── WHO IS IT FOR ── */}
      <section style={{ background: '#fff', borderTop: '1px solid #e0eaff', borderBottom: '1px solid #e0eaff', padding: '64px 24px' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <span className="pill" style={{ marginBottom: 16, display: 'inline-flex' }}>Who it&apos;s for</span>
            <h2 className="font-display" style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.2rem)', color: '#0f172a', letterSpacing: '-0.02em', margin: '12px 0 0' }}>
              One platform, two sides
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
            {/* Doctors card */}
            <div style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: 24, padding: '36px 32px' }}>
              <div style={{ fontSize: '2.2rem', marginBottom: 16 }}>👨‍⚕️</div>
              <h3 className="font-display" style={{ fontSize: '1.4rem', color: '#0f172a', marginBottom: 12 }}>For Doctors</h3>
              <p style={{ fontSize: '0.9rem', color: '#64748b', lineHeight: 1.7, marginBottom: 20 }}>
                Manage your documents, track your working hours, connect with agencies, and get notified when your certifications are about to expire.
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {['📄 Document vault with expiry alerts', '🗓️ Calendar & shift tracking', '🏥 Connect with multiple agencies', '💎 Pro features available'].map((item, i) => (
                  <li key={i} style={{ fontSize: '0.88rem', color: '#374151', display: 'flex', alignItems: 'center', gap: 8 }}>{item}</li>
                ))}
              </ul>
              <button className="btn-primary" style={{ width: '100%', justifyContent: 'center', animation: 'none', boxShadow: 'none', borderRadius: 12 }} onClick={() => window.location.href = '/signup'}>
                Create Doctor Account
              </button>
            </div>

            {/* Agencies card */}
            <div style={{ background: '#f5f3ff', border: '1.5px solid #d8b4fe', borderRadius: 24, padding: '36px 32px' }}>
              <div style={{ fontSize: '2.2rem', marginBottom: 16 }}>🏥</div>
              <h3 className="font-display" style={{ fontSize: '1.4rem', color: '#0f172a', marginBottom: 12 }}>For Agencies</h3>
              <p style={{ fontSize: '0.9rem', color: '#64748b', lineHeight: 1.7, marginBottom: 20 }}>
                Access a pool of verified doctors, manage leads, receive shared documents, send shift offers, and grow your placement business.
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {['👨‍⚕️ Doctor leads & profiles', '📋 Post high-demand vacancies', '🧾 Automated referral invoicing', '💎 Pro plan available'].map((item, i) => (
                  <li key={i} style={{ fontSize: '0.88rem', color: '#374151', display: 'flex', alignItems: 'center', gap: 8 }}>{item}</li>
                ))}
              </ul>
              <button className="btn-agency" style={{ width: '100%', justifyContent: 'center', borderRadius: 12, padding: '14px 20px', fontWeight: 600 }} onClick={() => window.location.href = '/agency-contact'}>
                Register your Agency
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="anim-5" style={{ background: '#fff', borderBottom: '1px solid #e0eaff' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '48px 24px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0 }}>
          {[
            { value: '3.2M+', label: 'Patient records managed' },
            { value: '98.7%', label: 'Uptime guarantee' },
            { value: '140+', label: 'Partner hospitals' },
          ].map((stat, i) => (
            <div key={i} style={{ textAlign: 'center', padding: '8px 16px', borderRight: i < 2 ? '1px solid #e0eaff' : 'none' }}>
              <div className="stat-number">{stat.value}</div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.88rem', color: '#94a3b8', marginTop: 6, fontWeight: 400 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section style={{ maxWidth: 1120, margin: '0 auto', padding: '88px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <span className="pill" style={{ marginBottom: 16, display: 'inline-flex' }}>Platform features</span>
          <h2 className="font-display" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', color: '#0f172a', letterSpacing: '-0.02em', margin: '12px 0 0' }}>
            Built for modern care teams
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          {[
            { icon: '⚡', title: 'Real-time coordination', body: 'Instant updates across departments keep every clinician aligned — from triage to discharge.' },
            { icon: '🔒', title: 'HIPAA-compliant security', body: 'End-to-end encryption and role-based access ensure patient data stays protected at every layer.' },
            { icon: '📊', title: 'Clinical analytics', body: 'Surface actionable insights from patient data to support faster, more confident decisions.' },
          ].map((f, i) => (
            <div key={i} className="card">
              <div style={{ fontSize: '1.8rem', marginBottom: 16 }}>{f.icon}</div>
              <h3 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: '1.05rem', color: '#0f172a', margin: '0 0 10px' }}>{f.title}</h3>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.9rem', color: '#64748b', lineHeight: 1.65, margin: 0 }}>{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section style={{ padding: '0 24px 96px' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 50%, #3b82f6 100%)', borderRadius: 28, padding: '64px 48px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -60, right: -60, width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -40, left: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />

          <h2 className="font-display" style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)', color: '#fff', letterSpacing: '-0.02em', margin: '0 0 16px' }}>
            Ready to transform your practice?
          </h2>
          <p style={{ fontFamily: "'DM Sans', sans-serif", color: 'rgba(255,255,255,0.75)', fontSize: '1rem', margin: '0 auto 36px', maxWidth: 440, lineHeight: 1.65 }}>
            Join hundreds of hospitals already using MedHub to deliver better patient outcomes.
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#fff', color: '#1d4ed8', fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: '0.95rem', padding: '14px 32px', borderRadius: '100px', border: 'none', cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.2s', boxShadow: '0 4px 18px rgba(0,0,0,0.15)' }}
              onClick={() => window.location.href = '/signup'}
              onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(0,0,0,0.2)'; }}
              onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 18px rgba(0,0,0,0.15)'; }}>
              👨‍⚕️ I&apos;m a Doctor
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="#1d4ed8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <button style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.15)', color: '#fff', fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: '0.95rem', padding: '14px 32px', borderRadius: '100px', border: '1.5px solid rgba(255,255,255,0.4)', cursor: 'pointer', transition: 'transform 0.15s, background 0.2s' }}
              onClick={() => window.location.href = '/agency-contact'}
              onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.background = 'rgba(255,255,255,0.25)'; }}
              onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }}>
              🏥 I&apos;m an Agency
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: '1px solid #e0eaff', padding: '32px 24px', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 10 }}>
          <div style={{ width: 22, height: 22, background: '#1d4ed8', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 1v10M1 6h10" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: '0.95rem', color: '#1d4ed8' }}>MedHub</span>
        </div>
        <div style={{ display: 'flex', gap: 24, justifyContent: 'center', marginBottom: 12 }}>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.82rem', color: '#64748b', fontFamily: "'DM Sans', sans-serif" }} onClick={() => window.location.href = '/login'}>Doctor Login</button>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.82rem', color: '#64748b', fontFamily: "'DM Sans', sans-serif" }} onClick={() => window.location.href = '/agency-login'}>Agency Login</button>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.82rem', color: '#64748b', fontFamily: "'DM Sans', sans-serif" }} onClick={() => window.location.href = '/agency-contact'}>Contact Us</button>
        </div>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>
          © {new Date().getFullYear()} MedHub. All rights reserved.
        </p>
      </footer>
    </main>
  );
}