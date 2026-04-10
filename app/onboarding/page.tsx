"use client";

import { useEffect, useState, useRef } from "react";
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
  });

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUserId(user.id);

      // Check if onboarding already completed
      const { data: doctorData } = await supabase
        .from("doctors")
        .select("onboarding_completed, full_name, email, phone, specialty, grade, gmc_number")
        .eq("user_id", user.id)
        .single();

      if (doctorData?.onboarding_completed) {
        router.push("/dashboard");
        return;
      }

      // Pre-fill email from auth
      setForm(prev => ({
        ...prev,
        email: user.email || "",
        full_name: doctorData?.full_name || "",
        phone: doctorData?.phone || "",
        specialty: doctorData?.specialty || "",
        grade: doctorData?.grade || "",
        gmc_number: doctorData?.gmc_number || "",
      }));

      setLoading(false);
    };
    init();
  }, [router]);

  const handleSaveStep1 = async () => {
    setError("");
    if (!form.full_name.trim()) { setError("Please enter your full name."); return; }
    if (!form.email.trim()) { setError("Please enter your email."); return; }
    setStep(2);
  };

  const handleSaveStep2 = async () => {
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
    const { error: storageError } = await supabase.storage.from("doctor-documents").upload(filePath, cvFile);
    if (!storageError) {
      await supabase.from("documents").insert({ user_id: userId, file_name: cvFile.name, folder: "cvs", storage_path: filePath });
      setCvUploaded(true);
    }
    setUploadingCV(false);
  };

  const handleUploadCompliance = async () => {
    if (!complianceFile) return;
    setUploadingCompliance(true);
    const filePath = `${userId}/compliance/${Date.now()}_${complianceFile.name}`;
    const { error: storageError } = await supabase.storage.from("doctor-documents").upload(filePath, complianceFile);
    if (!storageError) {
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
      tier: "basic",
      onboarding_completed: true,
    }, { onConflict: "user_id" });

    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }
    router.push("/dashboard");
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#f8faff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 40, height: 40, border: "3px solid #e0eaff", borderTop: "3px solid #1d4ed8", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
        <p style={{ color: "#94a3b8", fontSize: "0.9rem" }}>Loading...</p>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f8faff 0%, #fdf4ff 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif", padding: "32px 24px" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        .input-field { width: 100%; padding: 12px 14px; border: 1.5px solid #e0eaff; border-radius: 10px; font-size: 0.9rem; color: #0f172a; background: #fff; outline: none; font-family: 'DM Sans', sans-serif; transition: border-color 0.2s; }
        .input-field:focus { border-color: #1d4ed8; }
        .upload-zone { border: 2px dashed #bfdbfe; border-radius: 12px; padding: 24px; text-align: center; cursor: pointer; transition: all 0.2s; background: #f8faff; }
        .upload-zone:hover { border-color: #1d4ed8; background: #eff6ff; }
        .upload-zone.done { border-color: #22c55e; background: #f0fdf4; }
        label { display: block; font-size: 0.78rem; font-weight: 600; color: #64748b; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.06em; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        .fade-up { animation: fadeUp 0.4s ease both; }
      `}</style>

      <div style={{ width: "100%", maxWidth: 520 }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 32 }}>
          <div style={{ width: 30, height: 30, background: "#1d4ed8", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none"><path d="M9 2v14M2 9h14" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/></svg>
          </div>
          <span style={{ fontWeight: 700, fontSize: "1.1rem", color: "#1d4ed8" }}>MedHub</span>
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Step {step} of 3
            </span>
            <span style={{ fontSize: "0.78rem", color: "#94a3b8" }}>
              {step === 1 ? "Personal Details" : step === 2 ? "Professional Details" : "Upload Documents"}
            </span>
          </div>
          <div style={{ background: "#e0eaff", borderRadius: 100, height: 6, overflow: "hidden" }}>
            <div style={{ background: "#1d4ed8", height: "100%", width: `${(step / 3) * 100}%`, borderRadius: 100, transition: "width 0.4s ease" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
            {["Personal", "Professional", "Documents"].map((label, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div style={{ width: 20, height: 20, borderRadius: "50%", background: step > i + 1 ? "#22c55e" : step === i + 1 ? "#1d4ed8" : "#e0eaff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {step > i + 1 ? (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  ) : (
                    <span style={{ fontSize: "0.65rem", fontWeight: 700, color: step === i + 1 ? "#fff" : "#94a3b8" }}>{i + 1}</span>
                  )}
                </div>
                <span style={{ fontSize: "0.72rem", color: step === i + 1 ? "#1d4ed8" : step > i + 1 ? "#16a34a" : "#94a3b8", fontWeight: step === i + 1 ? 600 : 400 }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Card */}
        <div style={{ background: "#fff", borderRadius: 24, padding: "36px", border: "1px solid #e8f0fe", boxShadow: "0 8px 40px rgba(29,78,216,0.08)" }}>

          {/* STEP 1 — Personal Details */}
          {step === 1 && (
            <div className="fade-up">
              <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.6rem", color: "#0f172a", marginBottom: 6 }}>Welcome to MedHub! 👋</h1>
              <p style={{ color: "#64748b", fontSize: "0.88rem", marginBottom: 28 }}>Let's set up your profile. This takes less than 2 minutes.</p>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label>Full Name *</label>
                  <input className="input-field" placeholder="Dr. Jane Smith" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} />
                </div>
                <div>
                  <label>Email Address *</label>
                  <input className="input-field" type="email" placeholder="doctor@example.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                </div>
                <div>
                  <label>Phone Number</label>
                  <input className="input-field" type="tel" placeholder="+44 7700 000000" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                </div>

                {error && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "10px 14px", color: "#dc2626", fontSize: "0.85rem" }}>{error}</div>}

                <button
                  onClick={handleSaveStep1}
                  style={{ background: "#1d4ed8", color: "#fff", border: "none", padding: "13px", borderRadius: 10, fontWeight: 700, fontSize: "0.95rem", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 8 }}
                >
                  Continue → Professional Details
                </button>
              </div>
            </div>
          )}

          {/* STEP 2 — Professional Details */}
          {step === 2 && (
            <div className="fade-up">
              <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.6rem", color: "#0f172a", marginBottom: 6 }}>Your Professional Details</h1>
              <p style={{ color: "#64748b", fontSize: "0.88rem", marginBottom: 28 }}>This helps agencies find and match you to the right roles.</p>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label>Specialty *</label>
                  <select className="input-field" value={form.specialty} onChange={e => setForm({ ...form, specialty: e.target.value })}>
                    <option value="">Select your specialty</option>
                    {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label>Grade *</label>
                  <select className="input-field" value={form.grade} onChange={e => setForm({ ...form, grade: e.target.value })}>
                    <option value="">Select your grade</option>
                    {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label>GMC Number *</label>
                  <input className="input-field" placeholder="7-digit GMC number" value={form.gmc_number} onChange={e => setForm({ ...form, gmc_number: e.target.value })} />
                </div>

                {error && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "10px 14px", color: "#dc2626", fontSize: "0.85rem" }}>{error}</div>}

                <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                  <button onClick={() => { setStep(1); setError(""); }} style={{ background: "#fff", color: "#1d4ed8", border: "1.5px solid #bfdbfe", padding: "13px 20px", borderRadius: 10, fontWeight: 600, fontSize: "0.88rem", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                    ← Back
                  </button>
                  <button onClick={handleSaveStep2} style={{ flex: 1, background: "#1d4ed8", color: "#fff", border: "none", padding: "13px", borderRadius: 10, fontWeight: 700, fontSize: "0.95rem", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                    Continue → Upload Documents
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3 — Upload Documents */}
          {step === 3 && (
            <div className="fade-up">
              <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.6rem", color: "#0f172a", marginBottom: 6 }}>Upload Your Documents</h1>
              <p style={{ color: "#64748b", fontSize: "0.88rem", marginBottom: 8 }}>Upload your CV and compliance documents to get started. You can also do this later.</p>
              <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: "10px 14px", marginBottom: 24, fontSize: "0.82rem", color: "#1d4ed8" }}>
                💡 Agencies can only request access to your documents — they never see them without your approval.
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {/* CV Upload */}
                <div>
                  <label>CV / Resume</label>
                  <div className={`upload-zone ${cvUploaded ? "done" : ""}`} onClick={() => !cvUploaded && cvRef.current?.click()}>
                    <input ref={cvRef} type="file" accept=".pdf,.doc,.docx" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) setCvFile(f); }} />
                    {cvUploaded ? (
                      <div><div style={{ fontSize: "1.8rem", marginBottom: 6 }}>✅</div><p style={{ fontWeight: 600, color: "#16a34a", fontSize: "0.9rem" }}>CV uploaded!</p></div>
                    ) : cvFile ? (
                      <div>
                        <div style={{ fontSize: "1.5rem", marginBottom: 6 }}>📄</div>
                        <p style={{ fontWeight: 600, color: "#0f172a", fontSize: "0.9rem", marginBottom: 8 }}>{cvFile.name}</p>
                        <button onClick={e => { e.stopPropagation(); handleUploadCV(); }} disabled={uploadingCV} style={{ background: "#1d4ed8", color: "#fff", border: "none", padding: "8px 20px", borderRadius: 8, fontWeight: 600, fontSize: "0.85rem", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                          {uploadingCV ? "Uploading..." : "Upload CV"}
                        </button>
                      </div>
                    ) : (
                      <div><div style={{ fontSize: "1.8rem", marginBottom: 6 }}>📋</div><p style={{ fontWeight: 600, color: "#374151", fontSize: "0.9rem" }}>Click to select your CV</p><p style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: 4 }}>PDF or Word document</p></div>
                    )}
                  </div>
                </div>

                {/* Compliance Upload */}
                <div>
                  <label>Compliance Documents</label>
                  <div className={`upload-zone ${complianceUploaded ? "done" : ""}`} onClick={() => !complianceUploaded && complianceRef.current?.click()}>
                    <input ref={complianceRef} type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) setComplianceFile(f); }} />
                    {complianceUploaded ? (
                      <div><div style={{ fontSize: "1.8rem", marginBottom: 6 }}>✅</div><p style={{ fontWeight: 600, color: "#16a34a", fontSize: "0.9rem" }}>Compliance doc uploaded!</p></div>
                    ) : complianceFile ? (
                      <div>
                        <div style={{ fontSize: "1.5rem", marginBottom: 6 }}>📄</div>
                        <p style={{ fontWeight: 600, color: "#0f172a", fontSize: "0.9rem", marginBottom: 8 }}>{complianceFile.name}</p>
                        <button onClick={e => { e.stopPropagation(); handleUploadCompliance(); }} disabled={uploadingCompliance} style={{ background: "#1d4ed8", color: "#fff", border: "none", padding: "8px 20px", borderRadius: 8, fontWeight: 600, fontSize: "0.85rem", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                          {uploadingCompliance ? "Uploading..." : "Upload Document"}
                        </button>
                      </div>
                    ) : (
                      <div><div style={{ fontSize: "1.8rem", marginBottom: 6 }}>🔒</div><p style={{ fontWeight: 600, color: "#374151", fontSize: "0.9rem" }}>Click to upload compliance doc</p><p style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: 4 }}>DBS, Right to Work, etc. PDF, Word or image</p></div>
                    )}
                  </div>
                </div>

                {error && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "10px 14px", color: "#dc2626", fontSize: "0.85rem" }}>{error}</div>}

                <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                  <button onClick={() => { setStep(2); setError(""); }} style={{ background: "#fff", color: "#1d4ed8", border: "1.5px solid #bfdbfe", padding: "13px 20px", borderRadius: 10, fontWeight: 600, fontSize: "0.88rem", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                    ← Back
                  </button>
                  <button onClick={handleComplete} disabled={saving} style={{ flex: 1, background: "#1d4ed8", color: "#fff", border: "none", padding: "13px", borderRadius: 10, fontWeight: 700, fontSize: "0.95rem", cursor: saving ? "not-allowed" : "pointer", fontFamily: "'DM Sans', sans-serif", opacity: saving ? 0.7 : 1 }}>
                    {saving ? "Setting up your account..." : "🚀 Go to My Dashboard"}
                  </button>
                </div>

                <button onClick={handleComplete} disabled={saving} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "0.85rem", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", textAlign: "center", padding: "4px" }}>
                  Skip for now — I'll upload documents later
                </button>
              </div>
            </div>
          )}
        </div>

        <p style={{ textAlign: "center", fontSize: "0.78rem", color: "#94a3b8", marginTop: 20 }}>
          Your data is secure and never shared without your permission.
        </p>
      </div>
    </div>
  );
}