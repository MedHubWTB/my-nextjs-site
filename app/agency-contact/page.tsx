"use client";

import { useState, useRef, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useRouter } from "next/navigation";

const SPECIALTIES = [
  "General Practice (GP)", "Acute Internal Medicine", "Cardiology", "Clinical Genetics",
  "Clinical Neurophysiology", "Clinical Oncology", "Clinical Pharmacology & Therapeutics",
  "Dermatology", "Endocrinology & Diabetes Mellitus", "Gastroenterology",
  "Genitourinary Medicine", "Geriatric Medicine", "Haematology", "Immunology",
  "Infectious Diseases", "Medical Microbiology", "Medical Oncology", "Medical Ophthalmology",
  "Nuclear Medicine", "Paediatric Cardiology", "Palliative Medicine", "Pharmaceutical Medicine",
  "Rehabilitation Medicine", "Renal Medicine (Nephrology)", "Respiratory Medicine",
  "Rheumatology", "Sport and Exercise Medicine", "Tropical Medicine",
  "Aviation & Space Medicine", "Chemical Pathology", "Community Sexual & Reproductive Health",
  "Emergency Medicine", "Intensive Care Medicine", "Ophthalmology", "Paediatrics",
  "Psychiatry", "Child & Adolescent Psychiatry", "Old Age Psychiatry", "Forensic Psychiatry",
  "Liaison Psychiatry", "Public Health Medicine", "Occupational Medicine",
  "Cardiothoracic Surgery", "ENT (Otolaryngology)", "General Surgery", "Neurosurgery",
  "Oral & Maxillofacial Surgery", "Orthopaedic Surgery", "Paediatric Surgery",
  "Plastic Surgery", "Urology", "Vascular Surgery", "Other"
];

const GRADES = [
  "Junior Doctor", "SHO", "Middle Grade", "Registrar", "Consultant", "Other"
];

export default function AgencyContactPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    agency_name: "",
    contact_person_name: "",
    email: "",
    phone: "",
    message: "",
    password: "",
    confirmPassword: "",
  });
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [selectedGrades, setSelectedGrades] = useState<string[]>([]);
  const [specialtySearch, setSpecialtySearch] = useState("");
  const [specialtyDropdownOpen, setSpecialtyDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const specialtyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (specialtyRef.current && !specialtyRef.current.contains(e.target as Node)) {
        setSpecialtyDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filteredSpecialties = SPECIALTIES.filter(s =>
    s.toLowerCase().includes(specialtySearch.toLowerCase())
  );

  const toggleSpecialty = (s: string) => {
    setSelectedSpecialties(prev =>
      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
    );
  };

  const toggleGrade = (g: string) => {
    setSelectedGrades(prev =>
      prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]
    );
  };

  const selectAllSpecialties = () => {
    if (selectedSpecialties.length === SPECIALTIES.length) {
      setSelectedSpecialties([]);
    } else {
      setSelectedSpecialties([...SPECIALTIES]);
    }
  };

  const selectAllGrades = () => {
    if (selectedGrades.length === GRADES.length) {
      setSelectedGrades([]);
    } else {
      setSelectedGrades([...GRADES]);
    }
  };

  const handleNext = () => {
    setError("");
    if (!form.agency_name || !form.contact_person_name || !form.email || !form.phone) {
      setError("Please fill in all required fields.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      setError("Please enter a valid email address.");
      return;
    }
    setStep(2);
  };

  const handleSubmit = async () => {
    setError("");
    if (!form.password || form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    // Create auth account
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    // Insert into agencies table — including specialties and grades
    const { data: agencyData, error: agencyError } = await supabase
      .from("agencies")
      .insert({
        agency_name: form.agency_name,
        contact_person_name: form.contact_person_name,
        contact_email: form.email,
        contact_phone: form.phone,
        tier: "basic",
        required_specialties: selectedSpecialties.join(", "),
        required_grades: selectedGrades.join(", "),
      })
      .select()
      .single();

    if (agencyError) {
      setError(agencyError.message);
      setLoading(false);
      return;
    }

    // Link user to agency
    await supabase.from("agency_users").insert({
      user_id: authData.user?.id,
      agency_id: agencyData.id,
    });

    // Save enquiry with doctor requirements
    await supabase.from("agency_enquiries").insert({
      agency_name: form.agency_name,
      contact_person_name: form.contact_person_name,
      email: form.email,
      phone: form.phone,
      message: form.message,
      required_specialties: selectedSpecialties.join(", "),
      required_grades: selectedGrades.join(", "),
      auto_account_created: true,
    });

    // Sign them in
    await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    });

    setLoading(false);
    router.push("/agency-dashboard");
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f8faff 0%, #fdf4ff 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter, sans-serif", padding: "32px 24px" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        .input-field { width: 100%; padding: 10px 14px; border: 1.5px solid #e0eaff; border-radius: 10px; font-size: 0.9rem; color: #0f172a; background: #fff; outline: none; font-family: Inter, sans-serif; transition: border-color 0.2s; }
        .input-field:focus { border-color: #334155; }
        .grade-tag { display: inline-flex; align-items: center; padding: 8px 16px; border-radius: 100px; font-size: 0.85rem; font-weight: 500; cursor: pointer; border: 1.5px solid #e0eaff; background: #fff; color: #64748b; transition: all 0.15s; font-family: Inter, sans-serif; }
        .grade-tag:hover { border-color: #6d28d9; color: #6d28d9; background: #f5f3ff; }
        .grade-tag.selected { border-color: #6d28d9; background: #6d28d9; color: #fff; }
        .dropdown-item { display: flex; align-items: center; gap: 10px; padding: 9px 14px; cursor: pointer; font-size: 0.88rem; color: #374151; transition: background 0.1s; border-radius: 8px; }
        .dropdown-item:hover { background: #f5f3ff; color: #334155; }
        .dropdown-item.selected { background: #f5f3ff; color: #334155; font-weight: 600; }
        .select-all-btn { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 100px; font-size: 0.78rem; font-weight: 600; cursor: pointer; border: 1.5px solid #334155; background: #fff; color: #334155; transition: all 0.15s; font-family: Inter, sans-serif; }
        .select-all-btn:hover { background: #334155; color: #fff; }
        .select-all-btn.all-selected { background: #334155; color: #fff; }
      `}</style>

      <div style={{ background: "#fff", borderRadius: 24, padding: "40px 36px", width: "100%", maxWidth: 580, border: "1px solid #e2e8f0", boxShadow: "0 8px 40px rgba(29,78,216,0.08)" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 28 }}>
          <div style={{ width: 32, height: 32, background: "#334155", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none"><path d="M9 2v14M2 9h14" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/></svg>
          </div>
          <span style={{ fontWeight: 700, fontSize: "1.1rem", color: "#334155" }}>QuietMedical</span>
          <span style={{ fontSize: "0.78rem", color: "#94a3b8", marginLeft: 4 }}>· Agency Registration</span>
        </div>

        {/* Step indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 28 }}>
          {[1, 2].map(s => (
            <div key={s} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.82rem", background: step >= s ? "#334155" : "#f1f5f9", color: step >= s ? "#fff" : "#94a3b8", transition: "all 0.2s" }}>{s}</div>
              <span style={{ fontSize: "0.82rem", color: step >= s ? "#334155" : "#94a3b8", fontWeight: step === s ? 600 : 400 }}>
                {s === 1 ? "Agency Details" : "Doctor Requirements"}
              </span>
              {s < 2 && <div style={{ width: 32, height: 2, background: step > s ? "#334155" : "#e0eaff", borderRadius: 2 }} />}
            </div>
          ))}
        </div>

        {error && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", padding: "10px 14px", borderRadius: 10, fontSize: "0.85rem", marginBottom: 20 }}>{error}</div>
        )}

        {/* STEP 1 */}
        {step === 1 && (
          <div>
            <h1 style={{ fontFamily: "Inter, sans-serif", fontSize: "1.5rem", color: "#0f172a", marginBottom: 6 }}>Tell us about your agency</h1>
            <p style={{ color: "#64748b", fontSize: "0.88rem", marginBottom: 24 }}>We'll create your free account instantly — no waiting.</p>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                { label: "Agency Name *", key: "agency_name", placeholder: "e.g. MediStaff UK", type: "text" },
                { label: "Contact Person Name *", key: "contact_person_name", placeholder: "e.g. Jane Smith", type: "text" },
                { label: "Email Address *", key: "email", placeholder: "agency@example.com", type: "email" },
                { label: "Phone Number *", key: "phone", placeholder: "+44 7700 000000", type: "tel" },
              ].map(field => (
                <div key={field.key}>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>{field.label}</label>
                  <input
                    className="input-field"
                    type={field.type}
                    placeholder={field.placeholder}
                    value={(form as Record<string, string>)[field.key]}
                    onChange={e => setForm({ ...form, [field.key]: e.target.value })}
                  />
                </div>
              ))}
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Additional Message (optional)</label>
                <textarea
                  className="input-field"
                  placeholder="Any additional details about your agency..."
                  rows={3}
                  value={form.message}
                  onChange={e => setForm({ ...form, message: e.target.value })}
                  style={{ resize: "vertical" }}
                />
              </div>
              <button onClick={handleNext} style={{ background: "#334155", color: "#fff", border: "none", padding: "13px", borderRadius: 10, fontWeight: 700, fontSize: "0.95rem", cursor: "pointer", fontFamily: "Inter, sans-serif", marginTop: 4, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                Next — Doctor Requirements
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>

            <p style={{ textAlign: "center", fontSize: "0.82rem", color: "#94a3b8", marginTop: 20 }}>
              Already have an account? <span onClick={() => { window.location.href = "/agency-login"; }} style={{ color: "#334155", fontWeight: 600, cursor: "pointer" }}>Sign in here</span>
            </p>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div>
            <h1 style={{ fontFamily: "Inter, sans-serif", fontSize: "1.5rem", color: "#0f172a", marginBottom: 6 }}>What doctors are you looking for?</h1>
            <p style={{ color: "#64748b", fontSize: "0.88rem", marginBottom: 24 }}>This determines which doctors can find and connect with your agency.</p>

            {/* Specialties Dropdown */}
            <div style={{ marginBottom: 24 }} ref={specialtyRef}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Specialties Needed
                  {selectedSpecialties.length > 0 && (
                    <span style={{ marginLeft: 8, background: "#334155", color: "#fff", fontSize: "0.7rem", padding: "2px 8px", borderRadius: 100 }}>
                      {selectedSpecialties.length === SPECIALTIES.length ? "All selected" : `${selectedSpecialties.length} selected`}
                    </span>
                  )}
                </label>
                <button
                  className={`select-all-btn ${selectedSpecialties.length === SPECIALTIES.length ? "all-selected" : ""}`}
                  onClick={selectAllSpecialties}
                >
                  {selectedSpecialties.length === SPECIALTIES.length ? "✓ All Selected" : "Select All"}
                </button>
              </div>

              {/* Selected chips */}
              {selectedSpecialties.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                  {selectedSpecialties.map(s => (
                    <span key={s} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#f5f3ff", color: "#334155", fontSize: "0.78rem", fontWeight: 600, padding: "4px 10px", borderRadius: 100, border: "1px solid #ddd6fe" }}>
                      {s}
                      <button onClick={() => toggleSpecialty(s)} style={{ background: "none", border: "none", cursor: "pointer", color: "#334155", fontSize: "0.9rem", padding: 0, lineHeight: 1, display: "flex", alignItems: "center" }}>×</button>
                    </span>
                  ))}
                </div>
              )}

              {/* Dropdown trigger */}
              <div
                onClick={() => setSpecialtyDropdownOpen(prev => !prev)}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", border: `1.5px solid ${specialtyDropdownOpen ? "#334155" : "#e0eaff"}`, borderRadius: 10, cursor: "pointer", background: "#fff", transition: "border-color 0.2s" }}
              >
                <span style={{ fontSize: "0.9rem", color: "#94a3b8" }}>
                  {selectedSpecialties.length === 0 ? "Search and select specialties..." : `${selectedSpecialties.length} specialty${selectedSpecialties.length !== 1 ? "s" : ""} selected`}
                </span>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ transform: specialtyDropdownOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
                  <path d="M2 4l5 5 5-5" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>

              {/* Dropdown panel */}
              {specialtyDropdownOpen && (
                <div style={{ position: "relative", zIndex: 50 }}>
                  <div style={{ position: "absolute", top: 4, left: 0, right: 0, background: "#fff", border: "1.5px solid #e0eaff", borderRadius: 12, boxShadow: "0 8px 32px rgba(29,78,216,0.12)", overflow: "hidden" }}>
                    <div style={{ padding: "10px 12px", borderBottom: "1px solid #f1f5f9" }}>
                      <input
                        className="input-field"
                        placeholder="🔍 Search specialties..."
                        value={specialtySearch}
                        onChange={e => setSpecialtySearch(e.target.value)}
                        onClick={e => e.stopPropagation()}
                        autoFocus
                        style={{ fontSize: "0.88rem" }}
                      />
                    </div>
                    <div style={{ maxHeight: 260, overflowY: "auto", padding: "8px" }}>
                      {filteredSpecialties.length === 0 ? (
                        <p style={{ textAlign: "center", color: "#94a3b8", fontSize: "0.85rem", padding: "16px 0" }}>No specialties found</p>
                      ) : filteredSpecialties.map(s => (
                        <div
                          key={s}
                          className={`dropdown-item ${selectedSpecialties.includes(s) ? "selected" : ""}`}
                          onClick={() => toggleSpecialty(s)}
                        >
                          <div style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${selectedSpecialties.includes(s) ? "#334155" : "#e0eaff"}`, background: selectedSpecialties.includes(s) ? "#334155" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.15s" }}>
                            {selectedSpecialties.includes(s) && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                          </div>
                          {s}
                        </div>
                      ))}
                    </div>
                    <div style={{ padding: "10px 12px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "0.78rem", color: "#94a3b8" }}>{filteredSpecialties.length} specialties shown</span>
                      <button onClick={() => setSpecialtyDropdownOpen(false)} style={{ background: "#334155", color: "#fff", border: "none", padding: "6px 14px", borderRadius: 8, fontSize: "0.82rem", fontWeight: 600, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>Done</button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Grades */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Grades Needed
                  {selectedGrades.length > 0 && (
                    <span style={{ marginLeft: 8, background: "#6d28d9", color: "#fff", fontSize: "0.7rem", padding: "2px 8px", borderRadius: 100 }}>
                      {selectedGrades.length === GRADES.length ? "All selected" : `${selectedGrades.length} selected`}
                    </span>
                  )}
                </label>
                <button
                  className={`select-all-btn ${selectedGrades.length === GRADES.length ? "all-selected" : ""}`}
                  style={{ borderColor: "#6d28d9", color: selectedGrades.length === GRADES.length ? "#fff" : "#6d28d9", background: selectedGrades.length === GRADES.length ? "#6d28d9" : "#fff" }}
                  onClick={selectAllGrades}
                >
                  {selectedGrades.length === GRADES.length ? "✓ All Selected" : "Select All"}
                </button>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {GRADES.map(g => (
                  <button key={g} className={`grade-tag ${selectedGrades.includes(g) ? "selected" : ""}`} onClick={() => toggleGrade(g)}>
                    {selectedGrades.includes(g) ? "✓ " : ""}{g}
                  </button>
                ))}
              </div>
            </div>

            {/* Password */}
            <div style={{ background: "#f8faff", borderRadius: 14, padding: "20px", border: "1px solid #e2e8f0", marginBottom: 20 }}>
              <p style={{ fontSize: "0.82rem", fontWeight: 700, color: "#0f172a", marginBottom: 14 }}>🔐 Create your password</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Password *</label>
                  <input className="input-field" type="password" placeholder="Min. 6 characters" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Confirm Password *</label>
                  <input className="input-field" type="password" placeholder="Repeat password" value={form.confirmPassword} onChange={e => setForm({ ...form, confirmPassword: e.target.value })} />
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => { setStep(1); setError(""); }} style={{ background: "#fff", color: "#334155", border: "1.5px solid #ddd6fe", padding: "13px 20px", borderRadius: 10, fontWeight: 600, fontSize: "0.88rem", cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
                ← Back
              </button>
              <button onClick={handleSubmit} disabled={loading} style={{ flex: 1, background: "#334155", color: "#fff", border: "none", padding: "13px", borderRadius: 10, fontWeight: 700, fontSize: "0.95rem", cursor: loading ? "not-allowed" : "pointer", fontFamily: "Inter, sans-serif", opacity: loading ? 0.7 : 1 }}>
                {loading ? "Creating your account..." : "🏥 Create Agency Account & Sign In"}
              </button>
            </div>

            <p style={{ textAlign: "center", fontSize: "0.78rem", color: "#94a3b8", marginTop: 16 }}>
              Your account starts on the free Basic plan. Upgrade anytime.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}