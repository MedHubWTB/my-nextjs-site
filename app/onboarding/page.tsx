"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "../lib/supabase";
import { useRouter } from "next/navigation";
import Logo from "../components/Logo";

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

const GRADES = ["Junior Doctor", "SHO", "Middle Grade", "Registrar", "Specialist Registrar", "Consultant", "Other"];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [uploadingCV, setUploadingCV] = useState(false);
  const [uploadingCompliance, setUploadingCompliance] = useState(false);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [complianceFile, setComplianceFile] = useState<File | null>(null);
  const [cvUploaded, setCvUploaded] = useState(false);
  const [complianceUploaded, setComplianceUploaded] = useState(false);
  const cvRef = useRef<HTMLInputElement>(null);
  const complianceRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    specialty: "",
    grade: "",
    gmc_number: "",
    is_specialist_registrar: false,
  });

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUserId(user.id);
      const { data: doctorData } = await supabase
        .from("doctors")
        .select("onboarding_completed, full_name, email, phone, specialty, grade, gmc_number, is_specialist_registrar")
        .eq("user_id", user.id)
        .single();
      if (doctorData?.onboarding_completed) { router.push("/dashboard"); return; }
      setForm(prev => ({
        ...prev,
        email: user.email || "",
        full_name: doctorData?.full_name || "",
        phone: doctorData?.phone || "",
        specialty: doctorData?.specialty || "",
        grade: doctorData?.grade || "",
        gmc_number: doctorData?.gmc_number || "",
        is_specialist_registrar: doctorData?.is_specialist_registrar || false,
      }));
      setLoading(false);
    };
    init();
  }, [router]);

  const handleSaveStep1 = () => {
    setError("");
    if (!form.full_name.trim()) { setError("Please enter your full name."); return; }
    if (!form.email.trim()) { setError("Please enter your email."); return; }
    setStep(2);
  };

  const handleSaveStep2 = () => {
    setError("");
    if (!form.specialty) { setError("Please select your specialty."); return; }
    if (!form.grade) { setError("Please select your grade."); return; }
    if (!form.gmc_number.trim()) { setError("Please enter your GMC number."); return; }
    setStep(3);
  };

  const handleUploadCV = async () => {
    if (!cvFile) return;
    setUploadingCV(true);
    const filePath = `${userId}/cvs/${Date.now()}_${cvFile.name}`;
    const { error } = await supabase.storage.from("doctor-documents").upload(filePath, cvFile);
    if (!error) {
      await supabase.from("documents").insert({ user_id: userId, file_name: cvFile.name, folder: "cvs", storage_path: filePath });
      setCvUploaded(true);
    }
    setUploadingCV(false);
  };

  const handleUploadCompliance = async () => {
    if (!complianceFile) return;
    setUploadingCompliance(true);
    const filePath = `${userId}/compliance/${Date.now()}_${complianceFile.name}`;
    const { error } = await supabase.storage.from("doctor-documents").upload(filePath, complianceFile);
    if (!error) {
      await supabase.from("documents").insert({ user_id: userId, file_name: complianceFile.name, folder: "compliance", storage_path: filePath });
      setComplianceUploaded(true);
    }
    setUploadingCompliance(false);
  };

  const handleComplete = async () => {
    setSaving(true);
    const { error } = await supabase.from("doctors").upsert({
      user_id: userId,
      full_name: form.full_name,
      email: form.email,
      phone: form.phone,
      specialty: form.specialty,
      grade: form.grade,
      gmc_number: form.gmc_number,
      is_specialist_registrar: form.is_specialist_registrar,
      tier: "basic",
      onboarding_completed: true,
    }, { onConflict: "user_id" });
    if (error) { setError(error.message); setSaving(false); return; }
    router.push("/dashboard");
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#f8f9fc", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-inter), Inter, sans-serif" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 40, height: 40, border: "3px solid #e2e8f0", borderTop: "3px solid #7c3aed", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
        <p style={{ color: "#94a3b8", fontSize: "0.9rem" }}>Loading...</p>
      </div>
    </div>
  );

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "11px 14px", border: "1.5px solid #e2e8f0",
    borderRadius: 10, fontSize: "0.9rem", color: "#0f172a",
    background: "#fff", outline: "none", fontFamily: "inherit",
  };
  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: "0.78rem", fontWeight: 600,
    color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em",
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f8f9fc 0%, #f1f0f8 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-inter), Inter, sans-serif", padding: "32px 24px" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        .fade-up { animation: fadeUp 0.4s ease both; }
        .upload-zone { border: 2px dashed #e2e8f0; border-radius: 12px; padding: 24px; text-align: center; cursor: pointer; transition: all 0.2s; background: #f8f9fc; }
        .upload-zone:hover { border-color: #7c3aed; background: #f5f3ff; }
        .upload-zone.done { border-color: #7c3aed; background: #f5f3ff; }
      `}</style>

      <div style={{ width: "100%", maxWidth: 520 }}>
        <div style={{ marginBottom: 32 }}><Logo /></div>

        {/* Progress */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>Step {step} of 3</span>
            <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>{step === 1 ? "Personal Details" : step === 2 ? "Professional Details" : "Upload Documents"}</span>
          </div>
          <div style={{ background: "#e2e8f0", borderRadius: 100, height: 5, overflow: "hidden" }}>
            <div style={{ background: "linear-gradient(90deg, #334155, #7c3aed)", height: "100%", width: `${(step / 3) * 100}%`, borderRadius: 100, transition: "width 0.4s ease" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
            {["Personal", "Professional", "Documents"].map((label, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: step > i + 1 ? "#7c3aed" : step === i + 1 ? "linear-gradient(135deg, #334155, #7c3aed)" : "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {step > i + 1 ? (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  ) : (
                    <span style={{ fontSize: "0.65rem", fontWeight: 700, color: step === i + 1 ? "#fff" : "#94a3b8" }}>{i + 1}</span>
                  )}
                </div>
                <span style={{ fontSize: "0.72rem", color: step === i + 1 ? "#334155" : step > i + 1 ? "#7c3aed" : "#94a3b8", fontWeight: step === i + 1 ? 600 : 400 }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: "#fff", borderRadius: 20, padding: "36px", border: "1px solid #e2e8f0", boxShadow: "0 4px 24px rgba(51,65,85,0.08)" }}>

          {/* STEP 1 */}
          {step === 1 && (
            <div className="fade-up">
              <h1 style={{ fontSize: "1.6rem", fontWeight: 700, color: "#0f172a", marginBottom: 6, letterSpacing: "-0.02em" }}>Welcome to Quiet 👋</h1>
              <p style={{ color: "#64748b", fontSize: "0.88rem", marginBottom: 28 }}>Let's set up your profile. This takes less than 2 minutes.</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div><label style={labelStyle}>Full Name *</label><input style={inputStyle} placeholder="Dr. Jane Smith" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} /></div>
                <div><label style={labelStyle}>Email Address *</label><input style={inputStyle} type="email" placeholder="doctor@example.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
                <div><label style={labelStyle}>Phone Number</label><input style={inputStyle} type="tel" placeholder="+44 7700 000000" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
                {error && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "10px 14px", color: "#dc2626", fontSize: "0.85rem" }}>{error}</div>}
                <button className="qm-btn-primary" style={{ width: "100%", padding: "13px", borderRadius: 12, marginTop: 4 }} onClick={handleSaveStep1}>
                  Continue → Professional Details
                </button>
              </div>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="fade-up">
              <h1 style={{ fontSize: "1.6rem", fontWeight: 700, color: "#0f172a", marginBottom: 6, letterSpacing: "-0.02em" }}>Professional Details</h1>
              <p style={{ color: "#64748b", fontSize: "0.88rem", marginBottom: 28 }}>This helps agencies find and match you to the right roles.</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={labelStyle}>Specialty *</label>
                  <select style={inputStyle} value={form.specialty} onChange={e => setForm({ ...form, specialty: e.target.value })}>
                    <option value="">Select your specialty</option>
                    {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Grade *</label>
                  <select style={inputStyle} value={form.grade} onChange={e => setForm({ ...form, grade: e.target.value })}>
                    <option value="">Select your grade</option>
                    {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div><label style={labelStyle}>GMC Number *</label><input style={inputStyle} placeholder="7-digit GMC number" value={form.gmc_number} onChange={e => setForm({ ...form, gmc_number: e.target.value })} /></div>

                {/* Specialist Registrar checkbox */}
                <div
                  style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 16px", background: "#f5f3ff", border: `1.5px solid ${form.is_specialist_registrar ? "#7c3aed" : "#ddd6fe"}`, borderRadius: 12, cursor: "pointer", transition: "border-color 0.15s" }}
                  onClick={() => setForm({ ...form, is_specialist_registrar: !form.is_specialist_registrar })}
                >
                  <div style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${form.is_specialist_registrar ? "#7c3aed" : "#ddd6fe"}`, background: form.is_specialist_registrar ? "#7c3aed" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1, transition: "all 0.15s" }}>
                    {form.is_specialist_registrar && <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: "0.88rem", color: "#0f172a", marginBottom: 3 }}>I am a Specialist Registrar</p>
                    <p style={{ fontSize: "0.78rem", color: "#64748b", lineHeight: 1.5 }}>Tick this if you hold a Specialist Registrar post. This helps us match you with specialist assessment opportunities beyond regular locum shifts.</p>
                  </div>
                </div>

                {error && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "10px 14px", color: "#dc2626", fontSize: "0.85rem" }}>{error}</div>}
                <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                  <button onClick={() => { setStep(1); setError(""); }} style={{ background: "#fff", color: "#334155", border: "1.5px solid #e2e8f0", padding: "13px 20px", borderRadius: 12, fontWeight: 600, fontSize: "0.88rem", cursor: "pointer", fontFamily: "inherit" }}>← Back</button>
                  <button className="qm-btn-primary" style={{ flex: 1, padding: "13px", borderRadius: 12 }} onClick={handleSaveStep2}>Continue → Upload Documents</button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div className="fade-up">
              <h1 style={{ fontSize: "1.6rem", fontWeight: 700, color: "#0f172a", marginBottom: 6, letterSpacing: "-0.02em" }}>Upload Your Documents</h1>
              <p style={{ color: "#64748b", fontSize: "0.88rem", marginBottom: 8 }}>Upload your CV and compliance documents to get started. You can also do this later.</p>
              <div style={{ background: "linear-gradient(135deg, #f5f3ff, #ede9fe)", border: "1px solid #ddd6fe", borderRadius: 10, padding: "10px 14px", marginBottom: 24, fontSize: "0.82rem", color: "#7c3aed", fontWeight: 500 }}>
                💡 Agencies can only request access — they never see your documents without your approval.
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {/* CV */}
                <div>
                  <label style={labelStyle}>CV / Resume</label>
                  <div className={`upload-zone ${cvUploaded ? "done" : ""}`} onClick={() => !cvUploaded && cvRef.current?.click()}>
                    <input ref={cvRef} type="file" accept=".pdf,.doc,.docx" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) setCvFile(f); }} />
                    {cvUploaded ? <div><div style={{ fontSize: "1.8rem", marginBottom: 6 }}>✅</div><p style={{ fontWeight: 600, color: "#7c3aed", fontSize: "0.9rem" }}>CV uploaded!</p></div>
                    : cvFile ? <div><div style={{ fontSize: "1.5rem", marginBottom: 6 }}>📄</div><p style={{ fontWeight: 600, color: "#0f172a", fontSize: "0.9rem", marginBottom: 8 }}>{cvFile.name}</p><button onClick={e => { e.stopPropagation(); handleUploadCV(); }} disabled={uploadingCV} style={{ background: "linear-gradient(135deg, #334155, #1e293b)", color: "#fff", border: "none", padding: "8px 20px", borderRadius: 8, fontWeight: 600, fontSize: "0.85rem", cursor: "pointer", fontFamily: "inherit" }}>{uploadingCV ? "Uploading..." : "Upload CV"}</button></div>
                    : <div><div style={{ fontSize: "1.8rem", marginBottom: 6 }}>📋</div><p style={{ fontWeight: 600, color: "#374151", fontSize: "0.9rem" }}>Click to select your CV</p><p style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: 4 }}>PDF or Word document</p></div>}
                  </div>
                </div>

                {/* Compliance */}
                <div>
                  <label style={labelStyle}>Compliance Documents</label>
                  <div className={`upload-zone ${complianceUploaded ? "done" : ""}`} onClick={() => !complianceUploaded && complianceRef.current?.click()}>
                    <input ref={complianceRef} type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) setComplianceFile(f); }} />
                    {complianceUploaded ? <div><div style={{ fontSize: "1.8rem", marginBottom: 6 }}>✅</div><p style={{ fontWeight: 600, color: "#7c3aed", fontSize: "0.9rem" }}>Document uploaded!</p></div>
                    : complianceFile ? <div><div style={{ fontSize: "1.5rem", marginBottom: 6 }}>📄</div><p style={{ fontWeight: 600, color: "#0f172a", fontSize: "0.9rem", marginBottom: 8 }}>{complianceFile.name}</p><button onClick={e => { e.stopPropagation(); handleUploadCompliance(); }} disabled={uploadingCompliance} style={{ background: "linear-gradient(135deg, #334155, #1e293b)", color: "#fff", border: "none", padding: "8px 20px", borderRadius: 8, fontWeight: 600, fontSize: "0.85rem", cursor: "pointer", fontFamily: "inherit" }}>{uploadingCompliance ? "Uploading..." : "Upload Document"}</button></div>
                    : <div><div style={{ fontSize: "1.8rem", marginBottom: 6 }}>🔒</div><p style={{ fontWeight: 600, color: "#374151", fontSize: "0.9rem" }}>Click to upload compliance doc</p><p style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: 4 }}>DBS, Right to Work, etc.</p></div>}
                  </div>
                </div>

                {error && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "10px 14px", color: "#dc2626", fontSize: "0.85rem" }}>{error}</div>}

                <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                  <button onClick={() => { setStep(2); setError(""); }} style={{ background: "#fff", color: "#334155", border: "1.5px solid #e2e8f0", padding: "13px 20px", borderRadius: 12, fontWeight: 600, fontSize: "0.88rem", cursor: "pointer", fontFamily: "inherit" }}>← Back</button>
                  <button className="qm-btn-primary" style={{ flex: 1, padding: "13px", borderRadius: 12 }} onClick={handleComplete} disabled={saving}>
                    {saving ? "Setting up your account..." : "🚀 Go to My Dashboard"}
                  </button>
                </div>
                <button onClick={handleComplete} disabled={saving} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "0.85rem", cursor: "pointer", fontFamily: "inherit", textAlign: "center" }}>
                  Skip for now — I'll upload documents later
                </button>
              </div>
            </div>
          )}
        </div>
        <p style={{ textAlign: "center", fontSize: "0.75rem", color: "#94a3b8", marginTop: 20 }}>Your data is secure and never shared without your permission.</p>
      </div>
    </div>
  );
}