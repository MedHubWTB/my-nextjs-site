"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";

type Lead = {
  id: string;
  type: "agency" | "doctor";
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  source: string | null;
  status: string;
  tier_interest: string | null;
  notes: string | null;
  next_followup: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
};

type Activity = {
  id: string;
  lead_id: string;
  activity_type: string;
  content: string;
  created_by: string | null;
  created_at: string;
};

const STATUS_OPTIONS = ["new", "contacted", "interested", "demo_booked", "signed_up", "not_interested", "no_response"];
const SOURCE_OPTIONS = ["linkedin", "facebook", "reddit", "referral", "direct", "other"];
const TIER_OPTIONS = ["basic", "pro", "advanced"];

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  new: { bg: "#f5f3ff", color: "#334155", label: "🆕 New" },
  contacted: { bg: "#fdf4ff", color: "#7c3aed", label: "📤 Contacted" },
  interested: { bg: "#fffbeb", color: "#92400e", label: "⭐ Interested" },
  demo_booked: { bg: "#f0fdf4", color: "#16a34a", label: "📅 Demo Booked" },
  signed_up: { bg: "#f0fdf4", color: "#16a34a", label: "✅ Signed Up" },
  not_interested: { bg: "#fef2f2", color: "#dc2626", label: "❌ Not Interested" },
  no_response: { bg: "#f1f5f9", color: "#64748b", label: "🔇 No Response" },
};

export default function CRMPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"all" | "agency" | "doctor">("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [newActivity, setNewActivity] = useState({ activity_type: "note", content: "" });
  const [addingActivity, setAddingActivity] = useState(false);

  const [newLead, setNewLead] = useState({
    type: "agency" as "agency" | "doctor",
    name: "",
    email: "",
    phone: "",
    company: "",
    source: "linkedin",
    status: "new",
    tier_interest: "basic",
    notes: "",
    next_followup: "",
    assigned_to: "",
  });

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const { data: adminData } = await supabase.from("admins").select("id").eq("user_id", user.id).single();
      if (!adminData) { router.push("/"); return; }
      setAuthorized(true);
      await loadLeads();
      setLoading(false);
    };
    init();
  }, [router]);

  const loadLeads = async () => {
    const { data } = await supabase.from("crm_leads").select("*").order("created_at", { ascending: false });
    if (data) setLeads(data);
  };

  const loadActivities = async (leadId: string) => {
    const { data } = await supabase.from("crm_activities").select("*").eq("lead_id", leadId).order("created_at", { ascending: false });
    if (data) setActivities(data);
  };

  const handleSaveLead = async () => {
    setSaving(true);
    if (!newLead.name.trim()) { setMsg("Name is required."); setSaving(false); return; }
    const { data, error } = await supabase.from("crm_leads").insert({
      ...newLead,
      next_followup: newLead.next_followup || null,
      assigned_to: newLead.assigned_to || null,
    }).select().single();
    if (!error && data) {
      setLeads(prev => [data, ...prev]);
      setMsg("Lead added!");
      setTimeout(() => setMsg(""), 2500);
      setShowLeadModal(false);
      setNewLead({ type: "agency", name: "", email: "", phone: "", company: "", source: "linkedin", status: "new", tier_interest: "basic", notes: "", next_followup: "", assigned_to: "" });
    }
    setSaving(false);
  };

  const handleUpdateStatus = async (leadId: string, status: string) => {
    await supabase.from("crm_leads").update({ status, updated_at: new Date().toISOString() }).eq("id", leadId);
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status } : l));
    if (selectedLead?.id === leadId) setSelectedLead(prev => prev ? { ...prev, status } : null);
    setMsg("Status updated!");
    setTimeout(() => setMsg(""), 2000);
  };

  const handleUpdateFollowup = async (leadId: string, date: string) => {
    await supabase.from("crm_leads").update({ next_followup: date, updated_at: new Date().toISOString() }).eq("id", leadId);
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, next_followup: date } : l));
    if (selectedLead?.id === leadId) setSelectedLead(prev => prev ? { ...prev, next_followup: date } : null);
  };

  const handleUpdateNotes = async (leadId: string, notes: string) => {
    await supabase.from("crm_leads").update({ notes, updated_at: new Date().toISOString() }).eq("id", leadId);
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, notes } : l));
  };

  const handleAddActivity = async () => {
    if (!selectedLead || !newActivity.content.trim()) return;
    setAddingActivity(true);
    const { data, error } = await supabase.from("crm_activities").insert({
      lead_id: selectedLead.id,
      activity_type: newActivity.activity_type,
      content: newActivity.content,
      created_by: "Admin",
    }).select().single();
    if (!error && data) {
      setActivities(prev => [data, ...prev]);
      setNewActivity({ activity_type: "note", content: "" });
      setMsg("Activity logged!");
      setTimeout(() => setMsg(""), 2000);
    }
    setAddingActivity(false);
  };

  const handleDeleteLead = async (leadId: string) => {
    await supabase.from("crm_leads").delete().eq("id", leadId);
    setLeads(prev => prev.filter(l => l.id !== leadId));
    if (selectedLead?.id === leadId) { setSelectedLead(null); setShowDetailPanel(false); }
    setMsg("Lead deleted.");
    setTimeout(() => setMsg(""), 2000);
  };

  const openDetail = async (lead: Lead) => {
    setSelectedLead(lead);
    setShowDetailPanel(true);
    await loadActivities(lead.id);
  };

  const filteredLeads = leads.filter(l => {
    const matchesType = activeFilter === "all" || l.type === activeFilter;
    const matchesStatus = statusFilter === "all" || l.status === statusFilter;
    const matchesSearch = !search || l.name.toLowerCase().includes(search.toLowerCase()) || l.email?.toLowerCase().includes(search.toLowerCase()) || l.company?.toLowerCase().includes(search.toLowerCase());
    return matchesType && matchesStatus && matchesSearch;
  });

  const stats = {
    total: leads.length,
    new: leads.filter(l => l.status === "new").length,
    interested: leads.filter(l => l.status === "interested" || l.status === "demo_booked").length,
    signedUp: leads.filter(l => l.status === "signed_up").length,
    followupToday: leads.filter(l => l.next_followup === new Date().toISOString().split("T")[0]).length,
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#f8faff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter, sans-serif" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 40, height: 40, border: "3px solid #e0eaff", borderTop: "3px solid #334155", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
        <p style={{ color: "#94a3b8", fontSize: "0.9rem" }}>Loading CRM...</p>
      </div>
    </div>
  );

  if (!authorized) return null;

  return (
    <div style={{ minHeight: "100vh", background: "#f8f9fc", fontFamily: "Inter, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .sidebar-link { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-radius: 10px; font-size: 0.9rem; font-weight: 500; color: #64748b; cursor: pointer; transition: all 0.15s; border: none; background: none; width: 100%; text-align: left; font-family: Inter, sans-serif; }
        .sidebar-link:hover { background: #f5f3ff; color: #334155; }
        .sidebar-link.active { background: #334155; color: #fff; }
        .card { background: #fff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 24px; }
        .input-field { width: 100%; padding: 10px 14px; border: 1.5px solid #e0eaff; border-radius: 10px; font-size: 0.9rem; color: #0f172a; background: #fff; outline: none; font-family: Inter, sans-serif; transition: border-color 0.2s; }
        .input-field:focus { border-color: #334155; }
        .btn-blue { background: #334155; color: #fff; border: none; padding: 10px 20px; border-radius: 10px; font-weight: 600; font-size: 0.88rem; cursor: pointer; font-family: Inter, sans-serif; }
        .btn-blue:hover { background: #1e40af; }
        .btn-ghost { background: #fff; color: #334155; border: 1.5px solid #ddd6fe; padding: 10px 20px; border-radius: 10px; font-weight: 600; font-size: 0.88rem; cursor: pointer; font-family: Inter, sans-serif; }
        .lead-row { display: flex; align-items: center; padding: 14px 16px; border-radius: 12px; background: #fff; border: 1px solid #e2e8f0; margin-bottom: 8px; cursor: pointer; transition: all 0.15s; gap: 12px; }
        .lead-row:hover { border-color: #334155; box-shadow: 0 4px 12px rgba(29,78,216,0.08); }
        .lead-row.selected { border-color: #334155; background: #f5f3ff; }
        .modal-overlay { position: fixed; inset: 0; background: rgba(15,23,42,0.4); z-index: 100; display: flex; align-items: center; justifyContent: center; padding: 24px; }
        .modal { background: #fff; border-radius: 20px; padding: 28px; width: 100%; max-width: 520px; max-height: 90vh; overflow-y: auto; }
        label { display: block; font-size: 0.78rem; font-weight: 600; color: #64748b; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.06em; }
        .filter-btn { padding: 7px 16px; border-radius: 100px; font-size: 0.82rem; font-weight: 600; cursor: pointer; border: 1.5px solid #e0eaff; background: #fff; color: #64748b; font-family: Inter, sans-serif; transition: all 0.15s; }
        .filter-btn.active { background: #334155; color: #fff; border-color: #334155; }
        .activity-icon { font-size: 0.9rem; }
      `}</style>

      {/* ADD LEAD MODAL */}
      {showLeadModal && (
        <div className="modal-overlay" style={{ display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowLeadModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: "1.2rem", color: "#0f172a" }}>Add New Lead</h2>
              <button onClick={() => setShowLeadModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: "1.2rem" }}>✕</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label>Type</label>
                <select className="input-field" value={newLead.type} onChange={e => setNewLead({ ...newLead, type: e.target.value as "agency" | "doctor" })}>
                  <option value="agency">Agency</option>
                  <option value="doctor">Doctor</option>
                </select>
              </div>
              <div><label>Name *</label><input className="input-field" placeholder="Full name or agency name" value={newLead.name} onChange={e => setNewLead({ ...newLead, name: e.target.value })} /></div>
              <div><label>Email</label><input className="input-field" type="email" placeholder="email@example.com" value={newLead.email} onChange={e => setNewLead({ ...newLead, email: e.target.value })} /></div>
              <div><label>Phone</label><input className="input-field" placeholder="+44 7700 000000" value={newLead.phone} onChange={e => setNewLead({ ...newLead, phone: e.target.value })} /></div>
              {newLead.type === "agency" && <div><label>Company</label><input className="input-field" placeholder="Agency name" value={newLead.company} onChange={e => setNewLead({ ...newLead, company: e.target.value })} /></div>}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label>Source</label>
                  <select className="input-field" value={newLead.source} onChange={e => setNewLead({ ...newLead, source: e.target.value })}>
                    {SOURCE_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label>Tier Interest</label>
                  <select className="input-field" value={newLead.tier_interest} onChange={e => setNewLead({ ...newLead, tier_interest: e.target.value })}>
                    {TIER_OPTIONS.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label>Assigned To</label>
                <input className="input-field" placeholder="e.g. Charlene" value={newLead.assigned_to} onChange={e => setNewLead({ ...newLead, assigned_to: e.target.value })} />
              </div>
              <div>
                <label>Next Follow-up</label>
                <input className="input-field" type="date" value={newLead.next_followup} onChange={e => setNewLead({ ...newLead, next_followup: e.target.value })} />
              </div>
              <div><label>Notes</label><textarea className="input-field" rows={3} placeholder="Any notes about this lead..." value={newLead.notes} onChange={e => setNewLead({ ...newLead, notes: e.target.value })} style={{ resize: "vertical" }} /></div>
              <button className="btn-blue" style={{ width: "100%", marginTop: 4 }} onClick={handleSaveLead} disabled={saving}>{saving ? "Saving..." : "Add Lead"}</button>
            </div>
          </div>
        </div>
      )}

      {/* SIDEBAR */}
      <div style={{ position: "fixed", top: 0, left: 0, width: 240, height: "100vh", background: "#fff", borderRight: "1px solid #e2e8f0", display: "flex", flexDirection: "column", padding: "24px 16px", zIndex: 40 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, padding: "0 6px" }}>
          <div style={{ width: 30, height: 30, background: "#334155", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none"><path d="M9 2v14M2 9h14" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/></svg>
          </div>
          <span style={{ fontWeight: 700, fontSize: "1.1rem", color: "#334155" }}>QuietMedical</span>
        </div>
        <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", padding: "0 6px", marginBottom: 20 }}>CRM</div>
        <nav style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
          <a href="/admin" style={{ textDecoration: "none" }}>
            <button className="sidebar-link">
              <span>⊞</span> Admin Dashboard
            </button>
          </a>
          <button className="sidebar-link active">
            <span>📊</span> CRM Pipeline
          </button>
        </nav>
        <div style={{ padding: "12px 6px", borderTop: "1px solid #f1f5f9" }}>
          <p style={{ fontSize: "0.75rem", color: "#94a3b8", marginBottom: 4 }}>QuietMedical CRM</p>
          <p style={{ fontSize: "0.82rem", fontWeight: 600, color: "#374151" }}>Launch Pipeline</p>
        </div>
      </div>

      {/* MAIN */}
      <div style={{ marginLeft: 240, padding: "32px 24px 64px", display: "flex", gap: 20 }}>

        {/* LEFT — Lead List */}
        <div style={{ flex: showDetailPanel ? "0 0 420px" : "1", minWidth: 0 }}>

          {/* Top bar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
            <div>
              <p style={{ fontSize: "0.82rem", color: "#94a3b8", marginBottom: 2 }}>QuietMedical CRM</p>
              <h1 style={{ fontFamily: "Inter, sans-serif", fontSize: "1.6rem", color: "#0f172a" }}>Launch Pipeline</h1>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {msg && <span style={{ fontSize: "0.82rem", color: "#16a34a", background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "6px 12px", borderRadius: 8 }}>{msg}</span>}
              <button className="btn-blue" onClick={() => setShowLeadModal(true)}>+ Add Lead</button>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 20 }}>
            {[
              { label: "Total", value: stats.total, color: "#f5f3ff", textColor: "#334155" },
              { label: "New", value: stats.new, color: "#fdf4ff", textColor: "#7c3aed" },
              { label: "Interested", value: stats.interested, color: "#fffbeb", textColor: "#92400e" },
              { label: "Signed Up", value: stats.signedUp, color: "#f0fdf4", textColor: "#16a34a" },
              { label: "Follow Up", value: stats.followupToday, color: "#fff1f2", textColor: "#dc2626" },
            ].map((s, i) => (
              <div key={i} className="card" style={{ background: s.color, border: "none", padding: "12px 16px", textAlign: "center" }}>
                <div style={{ fontSize: "1.4rem", fontWeight: 700, color: s.textColor }}>{s.value}</div>
                <div style={{ fontSize: "0.7rem", color: "#64748b", marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            {["all", "agency", "doctor"].map(f => (
              <button key={f} className={`filter-btn ${activeFilter === f ? "active" : ""}`} onClick={() => setActiveFilter(f as "all" | "agency" | "doctor")}>
                {f === "all" ? "All" : f === "agency" ? "🏥 Agencies" : "👨‍⚕️ Doctors"}
              </button>
            ))}
            <select className="input-field" style={{ width: "auto", padding: "7px 12px", fontSize: "0.82rem" }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="all">All Statuses</option>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_STYLES[s]?.label || s}</option>)}
            </select>
            <input className="input-field" placeholder="Search leads..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: 200, padding: "7px 12px", fontSize: "0.82rem" }} />
          </div>

          {/* Lead List */}
          {filteredLeads.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: "48px 24px" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>📊</div>
              <p style={{ fontWeight: 600, color: "#374151", marginBottom: 6 }}>No leads yet</p>
              <p style={{ fontSize: "0.85rem", color: "#94a3b8", marginBottom: 20 }}>Start adding leads from your LinkedIn and Facebook outreach.</p>
              <button className="btn-blue" onClick={() => setShowLeadModal(true)}>Add your first lead</button>
            </div>
          ) : filteredLeads.map(lead => {
            const statusStyle = STATUS_STYLES[lead.status] || STATUS_STYLES.new;
            const isOverdue = lead.next_followup && lead.next_followup < new Date().toISOString().split("T")[0];
            const isDueToday = lead.next_followup === new Date().toISOString().split("T")[0];
            return (
              <div key={lead.id} className={`lead-row ${selectedLead?.id === lead.id ? "selected" : ""}`} onClick={() => openDetail(lead)}>
                {/* Type icon */}
                <div style={{ width: 40, height: 40, borderRadius: 10, background: lead.type === "agency" ? "#f5f3ff" : "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", flexShrink: 0 }}>
                  {lead.type === "agency" ? "🏥" : "👨‍⚕️"}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <p style={{ fontWeight: 700, fontSize: "0.9rem", color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lead.name}</p>
                    {lead.tier_interest && (
                      <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "1px 6px", borderRadius: 100, background: lead.tier_interest === "advanced" ? "linear-gradient(135deg, #0f172a, #334155)" : lead.tier_interest === "pro" ? "linear-gradient(135deg, #6d28d9, #4f46e5)" : "#f1f5f9", color: lead.tier_interest !== "basic" ? "#fff" : "#64748b", flexShrink: 0 }}>
                        {lead.tier_interest === "advanced" ? "⚡" : lead.tier_interest === "pro" ? "💎" : "Base"}
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    {lead.company && <span style={{ fontSize: "0.75rem", color: "#64748b" }}>{lead.company}</span>}
                    {lead.source && <span style={{ fontSize: "0.72rem", background: "#f1f5f9", color: "#64748b", padding: "1px 6px", borderRadius: 100 }}>{lead.source}</span>}
                    {(isOverdue || isDueToday) && (
                      <span style={{ fontSize: "0.72rem", fontWeight: 700, background: isOverdue ? "#fef2f2" : "#fffbeb", color: isOverdue ? "#dc2626" : "#92400e", padding: "1px 6px", borderRadius: 100 }}>
                        {isOverdue ? "⚠️ Overdue" : "📅 Today"}
                      </span>
                    )}
                  </div>
                </div>

                {/* Status */}
                <span style={{ fontSize: "0.72rem", fontWeight: 700, padding: "4px 10px", borderRadius: 100, background: statusStyle.bg, color: statusStyle.color, whiteSpace: "nowrap", flexShrink: 0 }}>
                  {statusStyle.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* RIGHT — Detail Panel */}
        {showDetailPanel && selectedLead && (
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="card" style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: "1.5rem" }}>{selectedLead.type === "agency" ? "🏥" : "👨‍⚕️"}</span>
                    <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: "1.3rem", color: "#0f172a" }}>{selectedLead.name}</h2>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {selectedLead.company && <span style={{ fontSize: "0.78rem", color: "#64748b" }}>🏢 {selectedLead.company}</span>}
                    {selectedLead.email && <span style={{ fontSize: "0.78rem", color: "#64748b" }}>✉️ {selectedLead.email}</span>}
                    {selectedLead.phone && <span style={{ fontSize: "0.78rem", color: "#64748b" }}>📞 {selectedLead.phone}</span>}
                    {selectedLead.source && <span style={{ fontSize: "0.72rem", background: "#f1f5f9", color: "#64748b", padding: "2px 8px", borderRadius: 100 }}>📍 {selectedLead.source}</span>}
                    {selectedLead.assigned_to && <span style={{ fontSize: "0.72rem", background: "#f5f3ff", color: "#334155", padding: "2px 8px", borderRadius: 100 }}>👤 {selectedLead.assigned_to}</span>}
                  </div>
                </div>
                <button onClick={() => { setShowDetailPanel(false); setSelectedLead(null); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: "1.2rem" }}>✕</button>
              </div>

              {/* Status update */}
              <div style={{ marginBottom: 16 }}>
                <label>Status</label>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {STATUS_OPTIONS.map(s => {
                    const style = STATUS_STYLES[s];
                    return (
                      <button key={s} onClick={() => handleUpdateStatus(selectedLead.id, s)} style={{ padding: "5px 12px", borderRadius: 100, fontSize: "0.75rem", fontWeight: 600, cursor: "pointer", border: `1.5px solid ${selectedLead.status === s ? style.color : "#e0eaff"}`, background: selectedLead.status === s ? style.bg : "#fff", color: selectedLead.status === s ? style.color : "#94a3b8", fontFamily: "Inter, sans-serif", transition: "all 0.15s" }}>
                        {style.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Follow-up date */}
              <div style={{ marginBottom: 16 }}>
                <label>Next Follow-up</label>
                <input className="input-field" type="date" value={selectedLead.next_followup || ""} onChange={e => handleUpdateFollowup(selectedLead.id, e.target.value)} />
              </div>

              {/* Notes */}
              <div style={{ marginBottom: 16 }}>
                <label>Notes</label>
                <textarea
                  className="input-field"
                  rows={3}
                  placeholder="Add notes about this lead..."
                  defaultValue={selectedLead.notes || ""}
                  onBlur={e => handleUpdateNotes(selectedLead.id, e.target.value)}
                  style={{ resize: "vertical" }}
                />
              </div>

              {/* Delete */}
              <button onClick={() => handleDeleteLead(selectedLead.id)} style={{ background: "#fef2f2", color: "#dc2626", border: "1.5px solid #fecaca", padding: "8px 16px", borderRadius: 10, fontSize: "0.82rem", fontWeight: 600, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
                🗑 Delete Lead
              </button>
            </div>

            {/* Activity Log */}
            <div className="card">
              <h3 style={{ fontWeight: 700, fontSize: "0.95rem", color: "#0f172a", marginBottom: 16 }}>Activity Log</h3>

              {/* Add activity */}
              <div style={{ background: "#f8faff", borderRadius: 12, padding: "16px", marginBottom: 20, border: "1px solid #e2e8f0" }}>
                <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 10, marginBottom: 10 }}>
                  <select className="input-field" style={{ width: "auto" }} value={newActivity.activity_type} onChange={e => setNewActivity({ ...newActivity, activity_type: e.target.value })}>
                    <option value="note">📝 Note</option>
                    <option value="email">✉️ Email</option>
                    <option value="call">📞 Call</option>
                    <option value="message">💬 Message</option>
                    <option value="meeting">🤝 Meeting</option>
                    <option value="follow_up">🔔 Follow Up</option>
                  </select>
                  <textarea className="input-field" rows={2} placeholder="What happened? What was discussed?" value={newActivity.content} onChange={e => setNewActivity({ ...newActivity, content: e.target.value })} style={{ resize: "none" }} />
                </div>
                <button className="btn-blue" style={{ padding: "8px 20px", fontSize: "0.85rem" }} onClick={handleAddActivity} disabled={addingActivity || !newActivity.content.trim()}>
                  {addingActivity ? "Logging..." : "Log Activity"}
                </button>
              </div>

              {/* Activity list */}
              {activities.length === 0 ? (
                <p style={{ fontSize: "0.85rem", color: "#94a3b8", textAlign: "center", padding: "16px 0" }}>No activities yet — log your first interaction above.</p>
              ) : activities.map(act => {
                const icons: Record<string, string> = { note: "📝", email: "✉️", call: "📞", message: "💬", meeting: "🤝", follow_up: "🔔" };
                return (
                  <div key={act.id} style={{ display: "flex", gap: 12, padding: "12px 0", borderBottom: "1px solid #f1f5f9" }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem", flexShrink: 0 }}>
                      {icons[act.activity_type] || "📝"}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: "0.85rem", color: "#0f172a", marginBottom: 4 }}>{act.content}</p>
                      <div style={{ display: "flex", gap: 8 }}>
                        <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>{new Date(act.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                        {act.created_by && <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>· {act.created_by}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}