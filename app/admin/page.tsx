"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useRouter } from "next/navigation";

type Doctor = {
  user_id: string;
  full_name: string;
  email: string;
  specialty: string | null;
  grade: string | null;
  phone: string | null;
  gmc_number: string | null;
  preferred_location: string | null;
  tier: string;
};

type Agency = {
  id: string;
  agency_name: string;
  contact_email: string;
  contact_person_name: string | null;
  contact_phone: string | null;
  tier: string;
  required_specialties: string | null;
  required_grades: string | null;
};

type Connection = {
  doctor_name: string;
  doctor_email: string;
  agency_name: string;
  connected_at: string;
  status: string;
};

export default function AdminPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview"|"doctors"|"agencies"|"connections">("overview");
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [savingTier, setSavingTier] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data: adminData } = await supabase
        .from("admins")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!adminData) { router.push("/"); return; }
      setAuthorized(true);

      const { data: docs } = await supabase
        .from("doctors")
        .select("*")
        .order("full_name", { ascending: true });
      if (docs) setDoctors(docs);

      const { data: ags } = await supabase
        .from("agencies")
        .select("*")
        .order("agency_name", { ascending: true });
      if (ags) setAgencies(ags);

      const { data: conns } = await supabase
        .from("doctor_agencies")
        .select("connected_at, status, doctors(full_name, email), agencies(agency_name)");
      if (conns) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mapped = conns.map((c: any) => ({
          doctor_name: Array.isArray(c.doctors) ? c.doctors[0]?.full_name || "Unknown" : c.doctors?.full_name || "Unknown",
          doctor_email: Array.isArray(c.doctors) ? c.doctors[0]?.email || "" : c.doctors?.email || "",
          agency_name: Array.isArray(c.agencies) ? c.agencies[0]?.agency_name || "Unknown" : c.agencies?.agency_name || "Unknown",
          connected_at: c.connected_at,
          status: c.status,
        }));
        setConnections(mapped);
      }

      setLoading(false);
    };
    init();
  }, [router]);

  const handleDoctorTier = async (user_id: string, tier: string) => {
    setSavingTier(user_id);
    const { error } = await supabase.from("doctors").update({ tier }).eq("user_id", user_id);
    if (!error) {
      setDoctors(prev => prev.map(d => d.user_id === user_id ? { ...d, tier } : d));
      setMsg("Tier updated!");
      setTimeout(() => setMsg(""), 2500);
    }
    setSavingTier(null);
  };

  const handleAgencyTier = async (id: string, tier: string) => {
    setSavingTier(id);
    const { error } = await supabase.from("agencies").update({ tier }).eq("id", id);
    if (!error) {
      setAgencies(prev => prev.map(a => a.id === id ? { ...a, tier } : a));
      setMsg("Tier updated!");
      setTimeout(() => setMsg(""), 2500);
    }
    setSavingTier(null);
  };

  const handleSignOut = async () => { await supabase.auth.signOut(); router.push("/"); };

  const filteredDoctors = doctors.filter(d =>
    d.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    d.email?.toLowerCase().includes(search.toLowerCase()) ||
    d.specialty?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredAgencies = agencies.filter(a =>
    a.agency_name?.toLowerCase().includes(search.toLowerCase()) ||
    a.contact_email?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredConnections = connections.filter(c =>
    c.doctor_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.agency_name?.toLowerCase().includes(search.toLowerCase())
  );

  const getTierBadge = (tier: string, type: "doctor" | "agency") => {
    const badges: Record<string, { label: string; bg: string; color: string }> = {
      advanced: { label: "⚡ Advanced", bg: "linear-gradient(135deg, #0f172a, #1d4ed8)", color: "#fff" },
      pro: { label: "💎 Pro", bg: "linear-gradient(135deg, #6d28d9, #4f46e5)", color: "#fff" },
      basic: { label: "Base", bg: "#f1f5f9", color: "#64748b" },
    };
    return badges[tier] || badges.basic;
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#f8faff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 40, height: 40, border: "3px solid #e0eaff", borderTop: "3px solid #1d4ed8", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
        <p style={{ color: "#94a3b8", fontSize: "0.9rem" }}>Loading admin dashboard...</p>
      </div>
    </div>
  );

  if (!authorized) return null;

  const totalPro = doctors.filter(d => d.tier === "pro").length;
  const totalAdvanced = doctors.filter(d => d.tier === "advanced").length;
  const totalBase = doctors.filter(d => d.tier === "basic" || !d.tier).length;
  const agencyPro = agencies.filter(a => a.tier === "pro").length;
  const agencyAdvanced = agencies.filter(a => a.tier === "advanced").length;
  const agencyBase = agencies.filter(a => a.tier === "basic" || !a.tier).length;

  return (
    <div style={{ minHeight: "100vh", background: "#f1f5fb", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .sidebar-link { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-radius: 10px; font-size: 0.9rem; font-weight: 500; color: #64748b; cursor: pointer; transition: all 0.15s; border: none; background: none; width: 100%; text-align: left; font-family: 'DM Sans', sans-serif; }
        .sidebar-link:hover { background: #eff6ff; color: #1d4ed8; }
        .sidebar-link.active { background: #1d4ed8; color: #fff; }
        .card { background: #fff; border-radius: 16px; border: 1px solid #e8f0fe; padding: 24px; }
        .input-field { width: 100%; padding: 10px 14px; border: 1.5px solid #e0eaff; border-radius: 10px; font-size: 0.9rem; color: #0f172a; background: #fff; outline: none; font-family: 'DM Sans', sans-serif; transition: border-color 0.2s; }
        .input-field:focus { border-color: #1d4ed8; }
        .tier-select { padding: 5px 10px; border: 1.5px solid #e0eaff; border-radius: 8px; font-size: 0.82rem; font-family: 'DM Sans', sans-serif; color: #0f172a; background: #fff; cursor: pointer; outline: none; }
        .tier-select:focus { border-color: #1d4ed8; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        .fade-up { animation: fadeUp 0.4s ease both; }
        table { width: 100%; border-collapse: collapse; }
        th { font-size: 0.72rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.06em; padding: 10px 12px; text-align: left; border-bottom: 1px solid #f1f5f9; }
        td { font-size: 0.85rem; color: #374151; padding: 12px 12px; border-bottom: 1px solid #f8faff; vertical-align: middle; }
        tr:last-child td { border-bottom: none; }
        tr:hover td { background: #f8faff; }
      `}</style>

      {/* SIDEBAR */}
      <div style={{ position: "fixed", top: 0, left: 0, width: 240, height: "100vh", background: "#fff", borderRight: "1px solid #e8f0fe", display: "flex", flexDirection: "column", padding: "24px 16px", zIndex: 40 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, padding: "0 6px" }}>
          <div style={{ width: 30, height: 30, background: "#1d4ed8", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none"><path d="M9 2v14M2 9h14" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/></svg>
          </div>
          <span style={{ fontWeight: 700, fontSize: "1.1rem", color: "#1d4ed8" }}>MedHub</span>
        </div>
        <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", padding: "0 6px", marginBottom: 20 }}>Admin Panel</div>

        <nav style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
          {([
            { key: "overview", label: "Overview", icon: "⊞" },
            { key: "doctors", label: "Doctors", icon: "👨‍⚕️", count: doctors.length },
            { key: "agencies", label: "Agencies", icon: "🏥", count: agencies.length },
            { key: "connections", label: "Connections", icon: "🔗", count: connections.length },
          ] as { key: "overview"|"doctors"|"agencies"|"connections"; label: string; icon: string; count?: number }[]).map(item => (
            <button key={item.key} className={`sidebar-link ${activeTab === item.key ? "active" : ""}`} onClick={() => { setActiveTab(item.key); setSearch(""); }}>
              <span>{item.icon}</span>{item.label}
              {item.count !== undefined && (
                <span style={{ marginLeft: "auto", background: activeTab === item.key ? "rgba(255,255,255,0.25)" : "#f1f5f9", color: activeTab === item.key ? "#fff" : "#64748b", fontSize: "0.72rem", fontWeight: 700, padding: "2px 8px", borderRadius: 100 }}>{item.count}</span>
              )}
            </button>
          ))}
        </nav>

        <div style={{ padding: "12px 6px", borderTop: "1px solid #f1f5f9", marginTop: 12 }}>
          <p style={{ fontSize: "0.75rem", color: "#94a3b8", marginBottom: 4 }}>Signed in as</p>
          <p style={{ fontSize: "0.82rem", fontWeight: 600, color: "#374151", marginBottom: 12 }}>charlene@whatthebleep.co.uk</p>
          <button className="sidebar-link" onClick={handleSignOut} style={{ color: "#ef4444" }}>
            <span>🚪</span> Sign out
          </button>
        </div>
      </div>

      {/* MAIN */}
      <div style={{ marginLeft: 240, padding: "32px 32px 64px" }}>

        {/* Top bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
          <div>
            <p style={{ fontSize: "0.82rem", color: "#94a3b8", marginBottom: 2 }}>MedHub Admin</p>
            <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.6rem", color: "#0f172a" }}>
              {activeTab === "overview" ? "Dashboard Overview" :
               activeTab === "doctors" ? "All Doctors" :
               activeTab === "agencies" ? "All Agencies" : "Connections"}
            </h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {msg && <span style={{ fontSize: "0.82rem", color: "#16a34a", background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "6px 12px", borderRadius: 8 }}>✅ {msg}</span>}
            <div style={{ width: 36, height: 36, background: "#1d4ed8", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: "0.78rem" }}>CW</div>
          </div>
        </div>

        {/* OVERVIEW */}
        {activeTab === "overview" && (
          <div className="fade-up">
            {/* Stats grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 16, marginBottom: 28 }}>
              {[
                { label: "Total Doctors", value: doctors.length, icon: "👨‍⚕️", color: "#eff6ff" },
                { label: "Total Agencies", value: agencies.length, icon: "🏥", color: "#f0fdf4" },
                { label: "Total Connections", value: connections.length, icon: "🔗", color: "#fefce8" },
                { label: "Active Connections", value: connections.filter(c => c.status === "accepted").length, icon: "✅", color: "#f0fdf4" },
              ].map((stat, i) => (
                <div key={i} className="card" style={{ background: stat.color, border: "none", padding: "16px 20px" }}>
                  <div style={{ fontSize: "1.2rem", marginBottom: 6 }}>{stat.icon}</div>
                  <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#0f172a", lineHeight: 1 }}>{stat.value}</div>
                  <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: 3 }}>{stat.label}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              {/* Doctor tiers */}
              <div className="card">
                <h3 style={{ fontWeight: 700, fontSize: "0.95rem", color: "#0f172a", marginBottom: 16 }}>👨‍⚕️ Doctor Tiers</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[
                    { label: "⚡ Advanced", value: totalAdvanced, bg: "linear-gradient(135deg, #0f172a, #1d4ed8)", pct: doctors.length ? (totalAdvanced / doctors.length) * 100 : 0 },
                    { label: "💎 Pro", value: totalPro, bg: "linear-gradient(135deg, #6d28d9, #4f46e5)", pct: doctors.length ? (totalPro / doctors.length) * 100 : 0 },
                    { label: "Base", value: totalBase, bg: "#94a3b8", pct: doctors.length ? (totalBase / doctors.length) * 100 : 0 },
                  ].map((t, i) => (
                    <div key={i}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#374151" }}>{t.label}</span>
                        <span style={{ fontSize: "0.82rem", color: "#64748b" }}>{t.value} doctors</span>
                      </div>
                      <div style={{ background: "#f1f5f9", borderRadius: 100, height: 8, overflow: "hidden" }}>
                        <div style={{ background: t.bg, height: "100%", width: `${t.pct}%`, borderRadius: 100, transition: "width 0.5s" }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Agency tiers */}
              <div className="card">
                <h3 style={{ fontWeight: 700, fontSize: "0.95rem", color: "#0f172a", marginBottom: 16 }}>🏥 Agency Tiers</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[
                    { label: "⚡ Advanced", value: agencyAdvanced, bg: "linear-gradient(135deg, #0f172a, #1d4ed8)", pct: agencies.length ? (agencyAdvanced / agencies.length) * 100 : 0 },
                    { label: "💎 Pro", value: agencyPro, bg: "linear-gradient(135deg, #6d28d9, #4f46e5)", pct: agencies.length ? (agencyPro / agencies.length) * 100 : 0 },
                    { label: "Base", value: agencyBase, bg: "#94a3b8", pct: agencies.length ? (agencyBase / agencies.length) * 100 : 0 },
                  ].map((t, i) => (
                    <div key={i}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#374151" }}>{t.label}</span>
                        <span style={{ fontSize: "0.82rem", color: "#64748b" }}>{t.value} agencies</span>
                      </div>
                      <div style={{ background: "#f1f5f9", borderRadius: 100, height: 8, overflow: "hidden" }}>
                        <div style={{ background: t.bg, height: "100%", width: `${t.pct}%`, borderRadius: 100, transition: "width 0.5s" }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search */}
        {activeTab !== "overview" && (
          <div style={{ marginBottom: 20 }}>
            <input
              className="input-field"
              placeholder={`Search ${activeTab}...`}
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ maxWidth: 360 }}
            />
          </div>
        )}

        {/* DOCTORS TABLE */}
        {activeTab === "doctors" && (
          <div className="fade-up card" style={{ padding: 0, overflow: "hidden" }}>
            {filteredDoctors.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px 24px", color: "#94a3b8" }}>
                <div style={{ fontSize: "2rem", marginBottom: 8 }}>👨‍⚕️</div>
                <p>No doctors found</p>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Specialty</th>
                      <th>Grade</th>
                      <th>GMC</th>
                      <th>Location</th>
                      <th>Current Tier</th>
                      <th>Change Tier</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDoctors.map(doc => {
                      const badge = getTierBadge(doc.tier, "doctor");
                      return (
                        <tr key={doc.user_id}>
                          <td style={{ fontWeight: 600, color: "#0f172a", whiteSpace: "nowrap" }}>{doc.full_name || "—"}</td>
                          <td style={{ color: "#64748b" }}>{doc.email || "—"}</td>
                          <td>{doc.specialty || "—"}</td>
                          <td>{doc.grade || "—"}</td>
                          <td style={{ fontFamily: "monospace", fontSize: "0.8rem" }}>{doc.gmc_number || "—"}</td>
                          <td>{doc.preferred_location || "—"}</td>
                          <td>
                            <span style={{ fontSize: "0.72rem", fontWeight: 700, padding: "3px 10px", borderRadius: 100, background: badge.bg, color: badge.color }}>
                              {badge.label}
                            </span>
                          </td>
                          <td>
                            <select
                              className="tier-select"
                              value={doc.tier || "basic"}
                              disabled={savingTier === doc.user_id}
                              onChange={e => handleDoctorTier(doc.user_id, e.target.value)}
                            >
                              <option value="basic">Base</option>
                              <option value="pro">Pro</option>
                              <option value="advanced">Advanced</option>
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* AGENCIES TABLE */}
        {activeTab === "agencies" && (
          <div className="fade-up card" style={{ padding: 0, overflow: "hidden" }}>
            {filteredAgencies.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px 24px", color: "#94a3b8" }}>
                <div style={{ fontSize: "2rem", marginBottom: 8 }}>🏥</div>
                <p>No agencies found</p>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table>
                  <thead>
                    <tr>
                      <th>Agency Name</th>
                      <th>Contact Person</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Specialties</th>
                      <th>Current Tier</th>
                      <th>Change Tier</th>
                      <th>Top Agency</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAgencies.map(ag => {
                      const badge = getTierBadge(ag.tier, "agency");
                      return (
                        <tr key={ag.id}>
                          <td style={{ fontWeight: 600, color: "#0f172a", whiteSpace: "nowrap" }}>{ag.agency_name || "—"}</td>
                          <td>{ag.contact_person_name || "—"}</td>
                          <td style={{ color: "#64748b" }}>{ag.contact_email || "—"}</td>
                          <td>{ag.contact_phone || "—"}</td>
                          <td style={{ maxWidth: 200 }}>
                            <span style={{ fontSize: "0.75rem", color: "#64748b" }}>{ag.required_specialties?.split(",").slice(0,2).join(", ") || "—"}{(ag.required_specialties?.split(",").length ?? 0) > 2 ? "..." : ""}</span>
                          </td>
                          <td>
                            <span style={{ fontSize: "0.72rem", fontWeight: 700, padding: "3px 10px", borderRadius: 100, background: badge.bg, color: badge.color }}>
                              {badge.label}
                            </span>
                          </td>
                          <td>
                            <select
                              className="tier-select"
                              value={ag.tier || "basic"}
                              disabled={savingTier === ag.id}
                              onChange={e => handleAgencyTier(ag.id, e.target.value)}
                            >
                              <option value="basic">Base</option>
                              <option value="pro">Pro</option>
                              <option value="advanced">Advanced</option>
                            </select>
                          </td>
                          <td>
                            <button
                              style={{ fontSize: "0.75rem", background: "none", border: "none", cursor: "pointer", color: "#1d4ed8", fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}
                              onClick={async () => {
                                await supabase.from("agencies").update({ is_top_agency: true }).eq("id", ag.id);
                                setMsg(`${ag.agency_name} set as Top Agency!`);
                                setTimeout(() => setMsg(""), 2500);
                              }}
                            >
                              ⚡ Set Top
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* CONNECTIONS TABLE */}
        {activeTab === "connections" && (
          <div className="fade-up card" style={{ padding: 0, overflow: "hidden" }}>
            {filteredConnections.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px 24px", color: "#94a3b8" }}>
                <div style={{ fontSize: "2rem", marginBottom: 8 }}>🔗</div>
                <p>No connections found</p>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table>
                  <thead>
                    <tr>
                      <th>Doctor Name</th>
                      <th>Doctor Email</th>
                      <th>Agency</th>
                      <th>Status</th>
                      <th>Connected At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredConnections.map((conn, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 600, color: "#0f172a" }}>{conn.doctor_name}</td>
                        <td style={{ color: "#64748b" }}>{conn.doctor_email}</td>
                        <td>
                          <span style={{ background: "#eff6ff", color: "#1d4ed8", fontSize: "0.8rem", fontWeight: 600, padding: "3px 10px", borderRadius: 100 }}>🏥 {conn.agency_name}</span>
                        </td>
                        <td>
                          <span style={{ fontSize: "0.72rem", fontWeight: 700, padding: "3px 10px", borderRadius: 100, background: conn.status === "accepted" ? "#f0fdf4" : conn.status === "declined" ? "#fef2f2" : "#fffbeb", color: conn.status === "accepted" ? "#16a34a" : conn.status === "declined" ? "#dc2626" : "#92400e" }}>
                            {conn.status === "accepted" ? "✓ Connected" : conn.status === "declined" ? "✗ Declined" : "⏳ Pending"}
                          </span>
                        </td>
                        <td style={{ color: "#94a3b8", fontSize: "0.82rem" }}>{conn.connected_at ? new Date(conn.connected_at).toLocaleDateString() : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}