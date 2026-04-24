"use client";

import AutocompleteInput from "../components/AutocompleteInput";
import { notify } from "../lib/notify";
import NotificationBell from "../components/NotificationBell";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useRouter } from "next/navigation";
import { useRealtimeSync } from "../hooks/useRealtimeSync";

type ExternalDoctor = {
  id: string;
  full_name: string;
  email: string | null;
  specialty: string | null;
  grade: string | null;
  phone: string | null;
  gmc_number: string | null;
  preferred_location: string | null;
  notes: string | null;
  invite_sent: boolean;
  quiet_user_id: string | null;
};

type Agency = {
  id: string;
  agency_name: string;
  contact_person_name: string;
  contact_email: string;
  contact_phone: string;
  tier: "basic" | "pro" | "advanced";
  is_top_agency: boolean | null;
};

type Doctor = {
  user_id: string;
  full_name: string;
  email: string;
  specialty: string | null;
  grade: string | null;
  preferred_location: string | null;
  phone: string | null;
  gmc_number: string | null;
  tier: string;
};

type PlacedDoctor = {
  id: string;
  doctor_id: string;
  placed_at: string;
  invoice_sent: boolean;
  invoice_amount: number | null;
  notes: string;
  doctor_name?: string;
};

type Invoice = {
  id: string;
  doctor_id: string;
  amount: number;
  status: "pending" | "sent" | "paid";
  invoice_date: string;
  due_date: string;
  doctor_name?: string;
};

type Vacancy = {
  id: string;
  specialty: string;
  grade: string;
  location: string;
  vacancies: number;
  notes: string;
  active: boolean;
  created_at: string;
};

type DoctorMessage = {
  id: string;
  sender_id: string;
  receiver_agency_id: string;
  message: string;
  read: boolean;
  created_at: string;
  doctor_name?: string;
  doctor_specialty?: string;
  doctor_grade?: string;
};

type ConnectionRequest = {
  id: string;
  doctor_id: string;
  status: string;
  initiated_by: string;
  doctor_name?: string;
  doctor_specialty?: string;
  doctor_grade?: string;
  doctor_tier?: string;
};

type ShareRequest = {
  id: string;
  document_id: string;
  doctor_id: string;
  status: "pending" | "accepted" | "declined" | "revoked";
  file_name?: string;
  doctor_name?: string;
  storage_path?: string;
  module_name?: string | null;
  folder?: string | null;
};
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

export default function AgencyDashboardPage() {
  const router = useRouter();
  const [agency, setAgency] = useState<Agency | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [marketDoctors, setMarketDoctors] = useState<Doctor[]>([]);
  const [placedDoctors, setPlacedDoctors] = useState<PlacedDoctor[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [shareRequests, setShareRequests] = useState<ShareRequest[]>([]);
  const [connectionRequests, setConnectionRequests] = useState<ConnectionRequest[]>([]);
  const [spotsUsedThisWeek, setSpotsUsedThisWeek] = useState(0);
  const [outreachUsedThisWeek, setOutreachUsedThisWeek] = useState(0);
  const [loading, setLoading] = useState(true);
  const [agencyUserId, setAgencyUserId] = useState("");
  const [expandedRequest, setExpandedRequest] = useState<string | null>(null);
const [showSupportModal, setShowSupportModal] = useState(false);
const [supportSubject, setSupportSubject] = useState("");
const [supportMessage, setSupportMessage] = useState("");
const [sendingSupport, setSendingSupport] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview"|"leads"|"market"|"placed"|"invoices"|"vacancies"|"documents"|"billing"|"mydoctors"|"messages">("overview");
  const [externalDoctors, setExternalDoctors] = useState<ExternalDoctor[]>([]);
const [showExternalModal, setShowExternalModal] = useState(false);
const [newExternal, setNewExternal] = useState({ full_name: "", email: "", specialty: "", grade: "", phone: "", gmc_number: "", preferred_location: "", notes: "" });
const [savingExternal, setSavingExternal] = useState(false);
const [sendingInvite, setSendingInvite] = useState<string | null>(null);
const [doctorMessages, setDoctorMessages] = useState<DoctorMessage[]>([]);
const changeTab = (tab: typeof activeTab) => {
  setActiveTab(tab);
  localStorage.setItem("agency_active_tab", tab);
};
useEffect(() => {
  const saved = localStorage.getItem("agency_active_tab");
  if (saved) setActiveTab(saved as typeof activeTab);
}, []);

useEffect(() => {
  const saved = localStorage.getItem("agency_active_tab");
  if (saved) changeTab(saved as typeof activeTab);
}, []);
  const [showUpgradePopup, setShowUpgradePopup] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState("");
  const [upgradeRequired, setUpgradeRequired] = useState<"pro"|"advanced">("pro");
  const [showVacancyModal, setShowVacancyModal] = useState(false);
  const [newVacancy, setNewVacancy] = useState({ specialty: "", grade: "", location: "", vacancies: "1", notes: "", shift_date: "", shift_start: "09:00", shift_end: "17:00" });
  const [savingVacancy, setSavingVacancy] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [showDoctorModal, setShowDoctorModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageDoctor, setMessageDoctor] = useState<Doctor | null>(null);
  const [messageText, setMessageText] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [msg, setMsg] = useState("");
  useRealtimeSync({
  agencyId: agency?.id,
  onAgencyUpdate: ({ event, data }) => {
    if (event === "UPDATE") setAgency(prev => prev ? { ...prev, ...data } : prev);
  },
  onAnyVacancyUpdate: ({ event, data }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (event === "INSERT") setVacancies(prev => [data as any, ...prev]);
    if (event === "UPDATE") setVacancies(prev => prev.map(v => v.id === data.id ? { ...v, ...data } : v));
    if (event === "DELETE") setVacancies(prev => prev.filter(v => v.id !== data.id));
  },
  onAnyInvoiceUpdate: ({ event, data }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (event === "INSERT") setInvoices(prev => [data as any, ...prev]);
    if (event === "UPDATE") setInvoices(prev => prev.map(i => i.id === data.id ? { ...i, ...data } : i));
    if (event === "DELETE") setInvoices(prev => prev.filter(i => i.id !== data.id));
  },
  onAnyDocumentUpdate: ({ event, data }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (event === "INSERT") setShareRequests(prev => [data as any, ...prev]);
    if (event === "UPDATE") setShareRequests(prev => prev.map(s => s.id === data.id ? { ...s, ...data } : s));
    if (event === "DELETE") setShareRequests(prev => prev.filter(s => s.id !== data.id));
  },
  onAnyConnectionUpdate: ({ event, data }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (event === "INSERT") setConnectionRequests(prev => [data as any, ...prev]);
    if (event === "UPDATE") {
      setConnectionRequests(prev => prev.map(c => c.id === data.id ? { ...c, ...data } : c));
      setDoctors(prev => prev.map(d => d.user_id === data.doctor_id ? { ...d, ...data } : d));
    }
    if (event === "DELETE") {
      setConnectionRequests(prev => prev.filter(c => c.id !== data.id));
      setDoctors(prev => prev.filter(d => d.user_id !== data.doctor_id));
    }
  },
  onAnyExternalDoctorUpdate: ({ event, data }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (event === "INSERT") setExternalDoctors(prev => [data as any, ...prev]);
    if (event === "UPDATE") setExternalDoctors(prev => prev.map(d => d.id === data.id ? { ...d, ...data } : d));
    if (event === "DELETE") setExternalDoctors(prev => prev.filter(d => d.id !== data.id));
  },
  onAnyMessageUpdate: ({ event, data }) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (event === "INSERT") setDoctorMessages(prev => [data as any, ...prev]);
  if (event === "UPDATE") setDoctorMessages(prev => prev.map(m => m.id === data.id ? { ...m, ...data } : m));
  if (event === "DELETE") setDoctorMessages(prev => prev.filter(m => m.id !== data.id));
},
});

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/agency-login"); return; }
      setAgencyUserId(user.id);

      const { data: agencyUser } = await supabase
        .from("agency_users")
        .select("agency_id, agencies(*)")
        .eq("user_id", user.id)
        .single();

      if (!agencyUser) { router.push("/agency-login"); return; }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
const ag = (agencyUser as any).agencies;
      setAgency(ag);

      // Connected doctors (accepted)
      const { data: doctorLinks } = await supabase
        .from("doctor_agencies")
        .select("doctor_id, doctors(*)")
        .eq("agency_id", ag.id)
        .eq("status", "accepted");
      if (doctorLinks) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const docs = doctorLinks.map((l: any) => l.doctors).filter(Boolean) as Doctor[];
        setDoctors(docs);
      }

      // Pending connection requests from doctors
      const { data: connReqs } = await supabase
        .from("doctor_agencies")
        .select("*, doctors(full_name, specialty, grade, tier)")
        .eq("agency_id", ag.id)
        .eq("status", "pending")
        .eq("initiated_by", "doctor");
      if (connReqs) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mapped = connReqs.map((c: any) => ({
          ...c,
          doctor_name: Array.isArray(c.doctors) ? c.doctors[0]?.full_name : c.doctors?.full_name,
          doctor_specialty: Array.isArray(c.doctors) ? c.doctors[0]?.specialty : c.doctors?.specialty,
          doctor_grade: Array.isArray(c.doctors) ? c.doctors[0]?.grade : c.doctors?.grade,
          doctor_tier: Array.isArray(c.doctors) ? c.doctors[0]?.tier : c.doctors?.tier,
        }));
        setConnectionRequests(mapped);
      }

      // Market view — all doctors matching agency specialties/grades
      if (ag.required_specialties || ag.required_grades) {
        const { data: allDocs } = await supabase.from("doctors").select("*");
        if (allDocs) {
          const specialties = ag.required_specialties?.split(",").map((s: string) => s.trim().toLowerCase()) || [];
          const grades = ag.required_grades?.split(",").map((g: string) => g.trim().toLowerCase()) || [];
          const matched = allDocs.filter((d: Doctor) => {
            const specMatch = specialties.length === 0 || specialties.some((s: string) => d.specialty?.toLowerCase().includes(s) || s.includes(d.specialty?.toLowerCase() || ""));
const gradeMatch = grades.length === 0 || grades.some((g: string) => d.grade?.toLowerCase().includes(g) || g.includes(d.grade?.toLowerCase() || ""));
            return specMatch && gradeMatch;
          });
          // Pro doctors first
          matched.sort((a: Doctor, b: Doctor) => {
            const tierOrder = { advanced: 0, pro: 1, basic: 2 };
            return (tierOrder[b.tier as keyof typeof tierOrder] ?? 2) - (tierOrder[a.tier as keyof typeof tierOrder] ?? 2);
          });
          setMarketDoctors(matched);
        }
      }

      // Run all queries in parallel for faster loading
const [
  { data: placed },
  { data: inv },
  { data: vac },
] = await Promise.all([
  supabase.from("placed_doctors").select("*").eq("agency_id", ag.id).order("placed_at", { ascending: false }),
  supabase.from("invoices").select("*").eq("agency_id", ag.id).order("invoice_date", { ascending: false }),
  supabase.from("vacancy_posts").select("*").eq("agency_id", ag.id).order("created_at", { ascending: false }),
]);

if (placed) setPlacedDoctors(placed);
if (inv) setInvoices(inv);
if (vac) setVacancies(vac);

      const { data: shares } = await supabase
        .from("document_share_requests")
        .select("*, documents(file_name, storage_path, module_name, folder), doctors(full_name)")
        .eq("agency_id", ag.id)
        .neq("status", "revoked")
        .order("requested_at", { ascending: false });
      if (shares) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mapped = shares.map((s: any) => ({
          ...s,
          file_name: Array.isArray(s.documents) ? s.documents[0]?.file_name : s.documents?.file_name,
          storage_path: Array.isArray(s.documents) ? s.documents[0]?.storage_path : s.documents?.storage_path,
          module_name: Array.isArray(s.documents) ? s.documents[0]?.module_name : s.documents?.module_name,
          folder: Array.isArray(s.documents) ? s.documents[0]?.folder : s.documents?.folder,
          doctor_name: Array.isArray(s.doctors) ? s.doctors[0]?.full_name : s.doctors?.full_name,
        }));
        setShareRequests(mapped);
      }

      // Weekly spot usage
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekStartStr = weekStart.toISOString().split("T")[0];
      const { data: spotData } = await supabase.from("agency_spot_usage").select("spots_used").eq("agency_id", ag.id).eq("week_start", weekStartStr).single();
      if (spotData) setSpotsUsedThisWeek(spotData.spots_used);

      // Weekly outreach usage
      const { data: outreachData } = await supabase.from("agency_outreach_usage").select("messages_sent").eq("agency_id", ag.id).eq("week_start", weekStartStr).single();
      if (outreachData) setOutreachUsedThisWeek(outreachData.messages_sent);

      const { data: msgs } = await supabase
  .from("doctor_messages")
  .select("*")
  .eq("receiver_agency_id", ag.id)
  .order("created_at", { ascending: false });
if (msgs) {
  // Fetch doctor info for each message
  const senderIds = [...new Set(msgs.map((m: any) => m.sender_id))];
  const { data: doctorsData } = await supabase
    .from("doctors")
    .select("user_id, full_name, specialty, grade")
    .in("user_id", senderIds);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapped = msgs.map((m: any) => {
    const doc = doctorsData?.find((d: any) => d.user_id === m.sender_id);
    return {
      ...m,
      doctor_name: doc?.full_name || null,
      doctor_specialty: doc?.specialty || null,
      doctor_grade: doc?.grade || null,
    };
  });
  setDoctorMessages(mapped);
}
      const { data: extDocs } = await supabase
  .from("external_doctors")
  .select("*")
  .eq("agency_id", agency?.id)
  .order("created_at", { ascending: false });
if (extDocs) setExternalDoctors(extDocs);
      setLoading(false);
    };
    init();
  }, [router]);

  const handleSendSupport = async () => {
  if (!supportMessage.trim()) return;
  setSendingSupport(true);
  await supabase.from("support_messages").insert({
    user_id: agencyUserId,
    user_type: "agency",
    subject: supportSubject || "General enquiry",
    message: supportMessage,
    status: "open",
  });
  setSendingSupport(false);
  setShowSupportModal(false);
  setSupportSubject("");
  setSupportMessage("");
  setMsg("Support message sent! We'll get back to you within 24 hours.");
  setTimeout(() => setMsg(""), 5000);
};
  const handleSignOut = async () => { await supabase.auth.signOut(); router.push("/"); };

  const tier = agency?.tier || "basic";
  const isBase = tier === "basic";
  const isPro = tier === "pro" || tier === "advanced";
  const isAdvanced = tier === "advanced";

  const spotLimit = isAdvanced ? Infinity : isPro ? 2 : 1;
  const outreachLimit = isAdvanced ? Infinity : isPro ? 2 : 0;
  const spotsRemaining = spotLimit === Infinity ? "∞" : Math.max(0, spotLimit - spotsUsedThisWeek);
  const outreachRemaining = outreachLimit === Infinity ? "∞" : Math.max(0, outreachLimit - outreachUsedThisWeek);

  const handleUpgradeClick = (featureName: string, required: "pro" | "advanced") => {
    setUpgradeFeature(featureName);
    setUpgradeRequired(required);
    setShowUpgradePopup(true);
  };

  const handleAcceptDoctorConnection = async (connId: string) => {
    await supabase.from("doctor_agencies").update({ status: "accepted", responded_at: new Date().toISOString() }).eq("id", connId);
    // Notify doctor their connection was accepted
const acceptedConn = connectionRequests.find(r => r.id === connId);
if (acceptedConn?.doctor_id) {
  await notify(acceptedConn.doctor_id, "Connection Accepted! 🎉", `${agency?.agency_name} accepted your connection request.`, "success", "/dashboard");
}
    setConnectionRequests(prev => prev.filter(c => c.id !== connId));
    const { data: doctorLinks } = await supabase.from("doctor_agencies").select("doctor_id, doctors(*)").eq("agency_id", agency?.id).eq("status", "accepted");
    if (doctorLinks) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
const docs = doctorLinks.map((l: any) => l.doctors).filter(Boolean) as Doctor[];
      setDoctors(docs);
    }
    setMsg("Connection accepted!");
    setTimeout(() => setMsg(""), 2500);
  };

  const handleDeclineDoctorConnection = async (connId: string) => {
    await supabase.from("doctor_agencies").update({ status: "declined", responded_at: new Date().toISOString() }).eq("id", connId);
    // Notify doctor their connection was declined
const declinedConn = connectionRequests.find(r => r.id === connId);
if (declinedConn?.doctor_id) {
  await notify(declinedConn.doctor_id, "Connection Update", `${agency?.agency_name} was unable to connect at this time.`, "warning", "/dashboard");
}
    setConnectionRequests(prev => prev.filter(c => c.id !== connId));
    setMsg("Connection declined.");
    setTimeout(() => setMsg(""), 2500);
  };

  const handleDisconnectDoctor = async (doctorId: string) => {
    await supabase.from("doctor_agencies").delete().eq("agency_id", agency?.id).eq("doctor_id", doctorId);
    setDoctors(prev => prev.filter(d => d.user_id !== doctorId));
    setMsg("Doctor disconnected.");
    setTimeout(() => setMsg(""), 2500);
  };

  const handlePostVacancy = async () => {
    if (!newVacancy.specialty) return;
    if (spotsUsedThisWeek >= spotLimit) {
      setMsg("Weekly spot limit reached. Upgrade to post more.");
      setTimeout(() => setMsg(""), 3000);
      return;
    }
    setSavingVacancy(true);
    const { data, error } = await supabase.from("vacancy_posts").insert({
      agency_id: agency?.id,
      specialty: newVacancy.specialty,
      grade: newVacancy.grade,
      location: newVacancy.location,
      vacancies: parseInt(newVacancy.vacancies),
      notes: newVacancy.notes,
      active: true,
      shift_date: newVacancy.shift_date || null,
      shift_start: newVacancy.shift_start || null,
      shift_end: newVacancy.shift_end || null,
    }).select().single();
    if (!error && data) {
      setVacancies(prev => [data, ...prev]);
      // Update spot usage
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekStartStr = weekStart.toISOString().split("T")[0];
      await supabase.from("agency_spot_usage").upsert({
        agency_id: agency?.id,
        week_start: weekStartStr,
        spots_used: spotsUsedThisWeek + 1,
      }, { onConflict: "agency_id,week_start" });
      setSpotsUsedThisWeek(prev => prev + 1);
      setMsg("Vacancy posted!");
      setTimeout(() => setMsg(""), 3000);
    }
    setSavingVacancy(false);
    setShowVacancyModal(false);
    setNewVacancy({ specialty: "", grade: "", location: "", vacancies: "1", notes: "", shift_date: "", shift_start: "09:00", shift_end: "17:00" });
  };

  const handleToggleVacancy = async (id: string, active: boolean) => {
    await supabase.from("vacancy_posts").update({ active: !active }).eq("id", id);
    setVacancies(prev => prev.map(v => v.id === id ? { ...v, active: !active } : v));
  };

  const handleDeleteVacancy = async (id: string) => {
    await supabase.from("vacancy_posts").delete().eq("id", id);
    setVacancies(prev => prev.filter(v => v.id !== id));
    setMsg("Vacancy deleted.");
    setTimeout(() => setMsg(""), 2500);
  };

  const handleSendMessage = async () => {
    if (!messageDoctor || !messageText.trim()) return;
    if (outreachUsedThisWeek >= outreachLimit) {
      setMsg("Weekly outreach limit reached.");
      setTimeout(() => setMsg(""), 3000);
      return;
    }
    setSendingMessage(true);
    await supabase.from("agency_messages").insert({
      agency_id: agency?.id,
      doctor_id: messageDoctor.user_id,
      message: messageText,
    });
    // Notify doctor of new message
if (messageDoctor?.user_id) {
  await notify(messageDoctor.user_id, `New Message from ${agency?.agency_name}`, messageText, "info", "/dashboard");
}
    // Update outreach usage
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekStartStr = weekStart.toISOString().split("T")[0];
    await supabase.from("agency_outreach_usage").upsert({
      agency_id: agency?.id,
      week_start: weekStartStr,
      messages_sent: outreachUsedThisWeek + 1,
    }, { onConflict: "agency_id,week_start" });
    setOutreachUsedThisWeek(prev => prev + 1);
    setSendingMessage(false);
    setShowMessageModal(false);
    setMessageText("");
    setMsg("Message sent!");
    setTimeout(() => setMsg(""), 3000);
  };

  const handleRespondToShare = async (id: string, status: "accepted" | "declined") => {
    await supabase.from("document_share_requests").update({ status, responded_at: new Date().toISOString() }).eq("id", id);
    setShareRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    setMsg(status === "accepted" ? "Document accepted!" : "Document declined.");
    setTimeout(() => setMsg(""), 2500);
  };

  const handleDownloadSharedDoc = async (req: ShareRequest) => {
    if (!req.storage_path) return;
    const { data } = await supabase.storage.from("doctor-documents").createSignedUrl(req.storage_path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  const getTierBadge = () => {
    if (isAdvanced) return { label: "⚡ ADVANCED", bg: "linear-gradient(135deg, #0f172a, #334155)" };
    if (isPro) return { label: "💎 PRO", bg: "linear-gradient(135deg, #6d28d9, #4f46e5)" };
    return null;
  };
  const tierBadge = getTierBadge();

  const initials = agency?.agency_name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "AG";
  const pendingInvoices = invoices.filter(i => i.status === "pending" || i.status === "sent");
  const paidInvoices = invoices.filter(i => i.status === "paid");
  const totalRevenue = paidInvoices.reduce((sum, i) => sum + (i.amount || 0), 0);
  const pendingShares = shareRequests.filter(r => r.status === "pending");

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#f8faff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter, sans-serif" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 40, height: 40, border: "3px solid #e0eaff", borderTop: "3px solid #334155", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
        <p style={{ color: "#94a3b8", fontSize: "0.9rem" }}>Loading your dashboard...</p>
      </div>
    </div>
  );

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
        .btn-blue { background: #334155; color: #fff; border: none; padding: 10px 20px; border-radius: 10px; font-weight: 600; font-size: 0.88rem; cursor: pointer; font-family: Inter, sans-serif; transition: background 0.2s; }
        .btn-blue:hover { background: #1e40af; }
        .btn-blue:disabled { opacity: 0.6; cursor: not-allowed; }
        .btn-ghost { background: #fff; color: #334155; border: 1.5px solid #ddd6fe; padding: 10px 20px; border-radius: 10px; font-weight: 600; font-size: 0.88rem; cursor: pointer; font-family: Inter, sans-serif; transition: background 0.2s; }
        .btn-ghost:hover { background: #f5f3ff; }
        .btn-advanced { background: linear-gradient(135deg, #0f172a, #334155); color: #fff; border: none; padding: 10px 20px; border-radius: 10px; font-weight: 600; font-size: 0.88rem; cursor: pointer; font-family: Inter, sans-serif; }
        .doctor-row { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; border-radius: 12px; background: #f8faff; border: 1px solid #e2e8f0; margin-bottom: 10px; transition: box-shadow 0.15s; }
        .doctor-row:hover { box-shadow: 0 4px 12px rgba(29,78,216,0.08); }
        .status-badge { font-size: 0.72rem; font-weight: 700; padding: 3px 10px; border-radius: 100px; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        .fade-up { animation: fadeUp 0.5s ease both; }
        .modal-overlay { position: fixed; inset: 0; background: rgba(15,23,42,0.4); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 24px; }
        .modal { background: #fff; border-radius: 20px; padding: 28px; width: 100%; max-width: 480px; max-height: 90vh; overflow-y: auto; }
        label { display: block; font-size: 0.78rem; font-weight: 600; color: #64748b; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.06em; }
        @keyframes popIn { from { opacity: 0; transform: scale(0.85) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        .upgrade-popup { animation: popIn 0.2s ease both; }
        @media (max-width: 768px) { .sidebar { display: none !important; } .main-content { margin-left: 0 !important; } }
      `}</style>

      {/* UPGRADE POPUP */}
      {showUpgradePopup && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "rgba(15,23,42,0.3)" }} onClick={() => setShowUpgradePopup(false)}>
          <div className="upgrade-popup" style={{ background: "#fff", borderRadius: 20, padding: "32px", maxWidth: 400, width: "100%", border: `2px solid ${upgradeRequired === "advanced" ? "#334155" : "#d8b4fe"}`, boxShadow: "0 20px 60px rgba(0,0,0,0.15)", textAlign: "center" }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>{upgradeRequired === "advanced" ? "⚡" : "💎"}</div>
            <h3 style={{ fontFamily: "Inter, sans-serif", fontSize: "1.3rem", color: "#0f172a", marginBottom: 8 }}>{upgradeRequired === "advanced" ? "Advanced" : "Pro"} Feature</h3>
            <p style={{ fontSize: "0.88rem", color: "#64748b", marginBottom: 24 }}>
              <strong style={{ color: upgradeRequired === "advanced" ? "#334155" : "#7c3aed" }}>{upgradeFeature}</strong> requires the {upgradeRequired === "advanced" ? "Advanced" : "Pro"} plan.
            </p>
            <button onClick={() => { setShowUpgradePopup(false); changeTab("billing"); }} style={{ width: "100%", background: upgradeRequired === "advanced" ? "linear-gradient(135deg, #0f172a, #334155)" : "linear-gradient(135deg, #6d28d9, #4f46e5)", color: "#fff", border: "none", padding: "13px", borderRadius: 10, fontWeight: 700, fontSize: "0.95rem", cursor: "pointer", fontFamily: "Inter, sans-serif", marginBottom: 10 }}>
              {upgradeRequired === "advanced" ? "⚡ Upgrade to Advanced" : "💎 Upgrade to Pro"}
            </button>
            <button onClick={() => setShowUpgradePopup(false)} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "0.85rem", cursor: "pointer", fontFamily: "Inter, sans-serif" }}>Maybe later</button>
          </div>
        </div>
      )}

      {/* DOCTOR PROFILE MODAL */}
      {showDoctorModal && selectedDoctor && (
        <div className="modal-overlay qm-modal-overlay" onClick={() => setShowDoctorModal(false)}>
          <div className="modal qm-modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: "1.2rem", color: "#0f172a" }}>Doctor Profile</h2>
              <button onClick={() => setShowDoctorModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: "1.2rem" }}>✕</button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24, paddingBottom: 20, borderBottom: "1px solid #f1f5f9" }}>
              <div style={{ width: 52, height: 52, background: "#f5f3ff", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "1rem", color: "#334155" }}>
                {isAdvanced ? selectedDoctor.full_name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() : "DR"}
              </div>
              <div>
                {isAdvanced ? (
                  <p style={{ fontWeight: 700, fontSize: "1rem", color: "#0f172a" }}>{selectedDoctor.full_name}</p>
                ) : (
                  <p style={{ fontWeight: 700, fontSize: "1rem", color: "#0f172a", filter: "blur(5px)", userSelect: "none" }}>Doctor Name</p>
                )}
                <p style={{ fontSize: "0.82rem", color: "#94a3b8" }}>{selectedDoctor.specialty} · {selectedDoctor.grade}</p>
                {selectedDoctor.tier === "advanced" && <span style={{ fontSize: "0.7rem", background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "#fff", padding: "2px 8px", borderRadius: 100, fontWeight: 700 }}>⚡ Advanced</span>}
                {selectedDoctor.tier === "pro" && <span style={{ fontSize: "0.7rem", background: "linear-gradient(135deg, #6d28d9, #4f46e5)", color: "#fff", padding: "2px 8px", borderRadius: 100, fontWeight: 700 }}>💎 Pro</span>}
              </div>
            </div>

            {/* Summarized CV — all tiers */}
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: "0.78rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>Summarized CV</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                {[
                  { label: "Specialty", value: selectedDoctor.specialty },
                  { label: "Grade", value: selectedDoctor.grade },
                  { label: "Preferred Location", value: selectedDoctor.preferred_location },
                ].map(item => (
                  <div key={item.label}>
                    <p style={{ fontSize: "0.72rem", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>{item.label}</p>
                    <p style={{ fontSize: "0.88rem", color: "#0f172a", fontWeight: 500 }}>{item.value || "Not set"}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Full profile — Advanced only */}
            <div style={{ position: "relative" }}>
              <p style={{ fontSize: "0.78rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
                Full Profile {!isAdvanced && <span style={{ background: "linear-gradient(135deg, #0f172a, #334155)", color: "#fff", fontSize: "0.65rem", padding: "2px 7px", borderRadius: 100, marginLeft: 6 }}>⚡ ADVANCED</span>}
              </p>
              <div style={{ filter: isAdvanced ? "none" : "blur(5px)", pointerEvents: isAdvanced ? "auto" : "none" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  {[
                    { label: "Full Name", value: selectedDoctor.full_name },
                    { label: "Email", value: selectedDoctor.email },
                    { label: "Phone", value: selectedDoctor.phone },
                    { label: "GMC Number", value: selectedDoctor.gmc_number },
                  ].map(item => (
                    <div key={item.label}>
                      <p style={{ fontSize: "0.72rem", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>{item.label}</p>
                      <p style={{ fontSize: "0.88rem", color: "#0f172a", fontWeight: 500 }}>{item.value || "Not set"}</p>
                    </div>
                  ))}
                </div>
              </div>
              {!isAdvanced && (
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }} onClick={() => { setShowDoctorModal(false); handleUpgradeClick("Full Doctor Profile", "advanced"); }}>
                  <div style={{ background: "linear-gradient(135deg, #0f172a, #334155)", color: "#fff", borderRadius: 12, padding: "10px 20px", fontSize: "0.85rem", fontWeight: 700, boxShadow: "0 4px 20px rgba(29,78,216,0.3)" }}>⚡ Unlock with Advanced</div>
                </div>
              )}
            </div>

            {/* Documents shared by this doctor */}
            {shareRequests.filter(s => s.doctor_id === selectedDoctor.user_id && s.status === "accepted").length > 0 && (
              <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid #f1f5f9" }}>
                <p style={{ fontSize: "0.78rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>Shared Documents</p>
                {shareRequests.filter(s => s.doctor_id === selectedDoctor.user_id && s.status === "accepted").map(req => (
                  <div key={req.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "#f8faff", borderRadius: 10, marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span>📄</span>
                      <span style={{ fontSize: "0.85rem", color: "#0f172a" }}>{req.file_name}</span>
                    </div>
                    <button className="btn-ghost" style={{ padding: "4px 10px", fontSize: "0.75rem" }} onClick={() => handleDownloadSharedDoc(req)}>⬇</button>
                  </div>
                ))}
              </div>
            )}

            {/* Message button */}
            {(isPro || isAdvanced) && (
              <button
                className={isAdvanced ? "btn-advanced" : "btn-blue"}
                style={{ width: "100%", marginTop: 20 }}
                onClick={() => { setShowDoctorModal(false); setMessageDoctor(selectedDoctor); setShowMessageModal(true); }}
                disabled={!isAdvanced && outreachUsedThisWeek >= outreachLimit}
              >
                💬 {!isAdvanced && outreachUsedThisWeek >= outreachLimit ? `Outreach limit reached (${outreachLimit}/week)` : "Send Message"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* MESSAGE MODAL */}
      {showMessageModal && messageDoctor && (
        <div className="modal-overlay qm-modal-overlay" onClick={() => setShowMessageModal(false)}>
          <div className="modal qm-modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: "1.2rem", color: "#0f172a" }}>Message Doctor</h2>
              <button onClick={() => setShowMessageModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: "1.2rem" }}>✕</button>
            </div>
            {isPro && !isAdvanced && (
              <div style={{ background: "#f5f3ff", border: "1px solid #ddd6fe", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: "0.82rem", color: "#334155" }}>
                💬 Weekly Outreach: <strong>{outreachRemaining}</strong> messages remaining this week
              </div>
            )}
            <div style={{ marginBottom: 16, padding: "12px 14px", background: "#f8faff", borderRadius: 10, border: "1px solid #e2e8f0" }}>
              <p style={{ fontSize: "0.85rem", color: "#64748b" }}>To: <strong style={{ color: "#0f172a" }}>{isAdvanced ? messageDoctor.full_name : `${messageDoctor.specialty} · ${messageDoctor.grade} Doctor`}</strong></p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label>Message</label>
                <textarea className="input-field" rows={4} placeholder="Write your message to the doctor..." value={messageText} onChange={e => setMessageText(e.target.value)} style={{ resize: "vertical" }} />
              </div>
              <button className={isAdvanced ? "btn-advanced" : "btn-blue"} style={{ width: "100%" }} onClick={handleSendMessage} disabled={sendingMessage || !messageText.trim()}>
                {sendingMessage ? "Sending..." : "Send Message"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VACANCY MODAL */}
      {showVacancyModal && (
        <div className="modal-overlay qm-modal-overlay" onClick={() => setShowVacancyModal(false)}>
          <div className="modal qm-modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: "1.2rem", color: "#0f172a" }}>Post a Spot</h2>
              <button onClick={() => setShowVacancyModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: "1.2rem" }}>✕</button>
            </div>
            <div style={{ background: "#f5f3ff", border: "1px solid #ddd6fe", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: "0.82rem", color: "#334155" }}>
              📋 Weekly spots remaining: <strong>{spotsRemaining}</strong> {spotLimit !== Infinity ? `/ ${spotLimit}` : "(unlimited)"}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
  <label>Specialty *</label>
  <AutocompleteInput
    value={newVacancy.specialty}
    onChange={val => setNewVacancy({ ...newVacancy, specialty: val })}
    options={SPECIALTIES}
    placeholder="e.g. Emergency Medicine"
  />
</div>
              <div>
  <label>Grade</label>
  <AutocompleteInput
    value={newVacancy.grade}
    onChange={val => setNewVacancy({ ...newVacancy, grade: val })}
    options={GRADES}
    placeholder="e.g. Consultant, Registrar"
  />
</div>
              <div><label>Location</label><input className="input-field" placeholder="e.g. London, Manchester" value={newVacancy.location} onChange={e => setNewVacancy({ ...newVacancy, location: e.target.value })} /></div>
              <div><label>Number of Vacancies</label><input className="input-field" type="number" min="1" value={newVacancy.vacancies} onChange={e => setNewVacancy({ ...newVacancy, vacancies: e.target.value })} /></div>
              <div><label>Notes (optional)</label><input className="input-field" placeholder="Any additional details" value={newVacancy.notes} onChange={e => setNewVacancy({ ...newVacancy, notes: e.target.value })} /></div>
              <button className="btn-blue" style={{ width: "100%", marginTop: 4 }} onClick={handlePostVacancy} disabled={savingVacancy || !newVacancy.specialty || spotsUsedThisWeek >= spotLimit}>
                {savingVacancy ? "Posting..." : spotsUsedThisWeek >= spotLimit ? "Weekly limit reached" : "Post Spot"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SIDEBAR */}
      <div className="sidebar" style={{ position: "fixed", top: 0, left: 0, width: 240, height: "100vh", background: "#fff", borderRight: "1px solid #e2e8f0", display: "flex", flexDirection: "column", padding: "24px 16px", zIndex: 40, overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 36, padding: "0 6px" }}>
          <div style={{ width: 30, height: 30, background: "#334155", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none"><path d="M9 2v14M2 9h14" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/></svg>
          </div>
          <span style={{ fontWeight: 700, fontSize: "1rem", color: "#7c3aed", letterSpacing: "-0.02em" }}>Quiet<span style={{ color: "#334155" }}>.</span></span>
        </div>
        <nav style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
          {([
            { key: "overview", label: "Overview", icon: "⊞" },
            { key: "leads", label: "Doctor Leads", icon: "👨‍⚕️" },
            { key: "market", label: "Market View", icon: "🔍" },
            { key: "vacancies", label: "Post Spots", icon: "📋" },
            { key: "placed", label: "Placed Doctors", icon: "✅" },
            { key: "invoices", label: "Invoices", icon: "🧾" },
            { key: "documents", label: "Documents", icon: "📄" },
            { key: "messages", label: "Messages", icon: "💬" },
            { key: "mydoctors", label: "My Doctors", icon: "🩺" },
            { key: "billing", label: "Billing", icon: "💳" },
          ] as { key: "overview"|"leads"|"market"|"placed"|"invoices"|"vacancies"|"documents"|"billing"; label: string; icon: string }[]).map(item => (
            <button key={item.key} className={`sidebar-link ${activeTab === item.key ? "active" : ""}`} onClick={() => changeTab(item.key)}>
              <span>{item.icon}</span>{item.label}
              {item.key === "leads" && connectionRequests.length > 0 && (
                <span style={{ marginLeft: "auto", background: "#f59e0b", color: "#fff", fontSize: "0.7rem", fontWeight: 700, padding: "2px 7px", borderRadius: 100 }}>{connectionRequests.length}</span>
              )}
              {item.key === "invoices" && pendingInvoices.length > 0 && (
                <span style={{ marginLeft: "auto", background: "#f59e0b", color: "#fff", fontSize: "0.7rem", fontWeight: 700, padding: "2px 7px", borderRadius: 100 }}>{pendingInvoices.length}</span>
              )}
              {item.key === "documents" && pendingShares.length > 0 && (
                <span style={{ marginLeft: "auto", background: "#f59e0b", color: "#fff", fontSize: "0.7rem", fontWeight: 700, padding: "2px 7px", borderRadius: 100 }}>{pendingShares.length}</span>
              )}
              {item.key === "vacancies" && (
                <span style={{ marginLeft: "auto", fontSize: "0.7rem", fontWeight: 700, color: "#64748b" }}>{spotsRemaining}/{spotLimit === Infinity ? "∞" : spotLimit}</span>
              )}
            </button>
          ))}
        </nav>

        {/* Weekly usage */}
        <div style={{ background: "#f8faff", borderRadius: 12, padding: "12px 14px", marginBottom: 12, border: "1px solid #e2e8f0" }}>
          <p style={{ fontSize: "0.72rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>This Week</p>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: "0.78rem", color: "#64748b" }}>📋 Spots</span>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#0f172a" }}>{spotsUsedThisWeek}/{spotLimit === Infinity ? "∞" : spotLimit}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: "0.78rem", color: "#64748b" }}>💬 Outreach</span>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#0f172a" }}>{outreachUsedThisWeek}/{outreachLimit === Infinity ? "∞" : outreachLimit}</span>
          </div>
        </div>

        {tierBadge ? (
          <div style={{ margin: "0 0 12px", background: tierBadge.bg, borderRadius: 12, padding: "12px 14px" }}>
            <p style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.7)", marginBottom: 2 }}>You are on</p>
            <p style={{ fontSize: "0.88rem", fontWeight: 700, color: "#fff" }}>{tierBadge.label} Plan</p>
          </div>
        ) : (
          <button onClick={() => changeTab("billing")} style={{ margin: "0 0 12px", background: "linear-gradient(135deg, #6d28d9, #4f46e5)", border: "none", borderRadius: 12, padding: "12px 14px", cursor: "pointer", textAlign: "left", fontFamily: "Inter, sans-serif" }}>
            <p style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.7)", marginBottom: 2 }}>You are on</p>
            <p style={{ fontSize: "0.88rem", fontWeight: 700, color: "#fff" }}>Base Plan · Upgrade 💎</p>
          </button>
        )}
        <button className="sidebar-link" onClick={handleSignOut} style={{ color: "#ef4444" }}><span>🚪</span> Sign out</button>
      </div>

      {/* MAIN */}
      <div className="main-content" style={{ marginLeft: 240, padding: "32px 32px 64px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
          <div>
            <p style={{ fontSize: "0.82rem", color: "#94a3b8", marginBottom: 2 }}>Agency Dashboard</p>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h1 style={{ fontFamily: "Inter, sans-serif", fontSize: "1.6rem", color: "#0f172a" }}>
                {new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 18 ? "Good afternoon" : "Good evening"}, {isAdvanced && agency?.is_top_agency && "⚡ "}{agency?.agency_name} 👋
              </h1>
              {tierBadge && <span style={{ background: tierBadge.bg, color: "#fff", fontSize: "0.72rem", fontWeight: 700, padding: "3px 10px", borderRadius: 100 }}>{tierBadge.label}</span>}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {msg && <span style={{ fontSize: "0.82rem", color: "#16a34a", background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "6px 12px", borderRadius: 8 }}>{msg}</span>}
            <NotificationBell userId={agencyUserId} />
            <div style={{ width: 40, height: 40, background: "#334155", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: "0.85rem" }}>{initials}</div>
          </div>
        </div>

        {/* OVERVIEW */}
        {activeTab === "overview" && (
          <div className="fade-up">
            {/* Top Agency Banner */}
            {isAdvanced && agency?.is_top_agency && (
              <div style={{ background: "linear-gradient(135deg, #0f172a, #334155)", borderRadius: 14, padding: "16px 20px", marginBottom: 20, display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: "1.5rem" }}>⚡</span>
                <div>
                  <p style={{ fontWeight: 700, fontSize: "0.95rem", color: "#fff" }}>Top Agency Status Active</p>
                  <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.7)" }}>Your agency and jobs are pinned to the top of all doctor lists.</p>
                </div>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 16, marginBottom: 24 }}>
              {[
                { label: "Connected Doctors", value: doctors.length, icon: "👨‍⚕️", color: "#f5f3ff" },
                { label: "Placed Doctors", value: placedDoctors.length, icon: "✅", color: "#f0fdf4" },
                { label: "Active Spots", value: vacancies.filter(v => v.active).length, icon: "📋", color: "#fff7ed" },
                { label: "Pending Invoices", value: pendingInvoices.length, icon: "🧾", color: "#fffbeb" },
                { label: "Total Earned", value: `£${totalRevenue.toFixed(0)}`, icon: "💷", color: "#fdf4ff" },
              ].map((stat, i) => (
                <div key={i} className="card" style={{ background: stat.color, border: "none" }}>
                  <div style={{ fontSize: "1.3rem", marginBottom: 8 }}>{stat.icon}</div>
                  <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "#0f172a", lineHeight: 1 }}>{stat.value}</div>
                  <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: 4 }}>{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Weekly usage card */}
            <div className="card" style={{ marginBottom: 20 }}>
              <h3 style={{ fontWeight: 700, fontSize: "0.95rem", color: "#0f172a", marginBottom: 16 }}>Weekly Usage</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div style={{ background: "#fff7ed", borderRadius: 12, padding: "16px" }}>
                  <p style={{ fontSize: "0.78rem", color: "#94a3b8", marginBottom: 4 }}>SPOTS POSTED THIS WEEK</p>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                    <span style={{ fontSize: "2rem", fontWeight: 700, color: "#f97316" }}>{spotsUsedThisWeek}</span>
                    <span style={{ fontSize: "0.9rem", color: "#94a3b8" }}>/ {spotLimit === Infinity ? "∞" : spotLimit}</span>
                  </div>
                  <div style={{ marginTop: 8, background: "#fed7aa", borderRadius: 100, height: 6, overflow: "hidden" }}>
                    <div style={{ background: "#f97316", height: "100%", width: `${spotLimit === Infinity ? 0 : Math.min(100, (spotsUsedThisWeek / spotLimit) * 100)}%`, borderRadius: 100 }} />
                  </div>
                </div>
                <div style={{ background: "#f5f3ff", borderRadius: 12, padding: "16px" }}>
                  <p style={{ fontSize: "0.78rem", color: "#94a3b8", marginBottom: 4 }}>OUTREACH THIS WEEK</p>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                    <span style={{ fontSize: "2rem", fontWeight: 700, color: "#334155" }}>{outreachUsedThisWeek}</span>
                    <span style={{ fontSize: "0.9rem", color: "#94a3b8" }}>/ {outreachLimit === Infinity ? "∞" : outreachLimit}</span>
                  </div>
                  <div style={{ marginTop: 8, background: "#ddd6fe", borderRadius: 100, height: 6, overflow: "hidden" }}>
                    <div style={{ background: "#334155", height: "100%", width: `${outreachLimit === Infinity ? 0 : Math.min(100, (outreachUsedThisWeek / outreachLimit) * 100)}%`, borderRadius: 100 }} />
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <div className="card">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <h3 style={{ fontWeight: 700, fontSize: "0.95rem", color: "#0f172a" }}>Recent Leads</h3>
                  <button className="btn-ghost" style={{ padding: "6px 12px", fontSize: "0.78rem" }} onClick={() => changeTab("leads")}>View all</button>
                </div>
                {connectionRequests.length > 0 && (
                  <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: "8px 12px", marginBottom: 12, fontSize: "0.82rem", color: "#92400e", fontWeight: 600 }}>
                    🔔 {connectionRequests.length} pending connection{connectionRequests.length > 1 ? "s" : ""}
                  </div>
                )}
                {doctors.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "24px 0", color: "#94a3b8" }}><div style={{ fontSize: "1.8rem", marginBottom: 8 }}>👨‍⚕️</div><p style={{ fontSize: "0.85rem" }}>No connected doctors yet</p></div>
                ) : doctors.slice(0, 4).map(doc => (
                  <div key={doc.user_id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
                    <div style={{ width: 34, height: 34, background: "#f5f3ff", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.78rem", color: "#334155" }}>DR</div>
                    <div>
                      <p style={{ fontSize: "0.88rem", fontWeight: 600, color: "#0f172a" }}>{doc.specialty} · {doc.grade}</p>
                      <p style={{ fontSize: "0.75rem", color: "#94a3b8" }}>{doc.preferred_location || "No location"}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="card">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <h3 style={{ fontWeight: 700, fontSize: "0.95rem", color: "#0f172a" }}>Active Spots</h3>
                  <button className="btn-ghost" style={{ padding: "6px 12px", fontSize: "0.78rem" }} onClick={() => changeTab("vacancies")}>View all</button>
                </div>
                {vacancies.filter(v => v.active).length === 0 ? (
                  <div style={{ textAlign: "center", padding: "24px 0", color: "#94a3b8" }}><div style={{ fontSize: "1.8rem", marginBottom: 8 }}>📋</div><p style={{ fontSize: "0.85rem" }}>No active spots posted</p></div>
                ) : vacancies.filter(v => v.active).slice(0, 3).map(vac => (
                  <div key={vac.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
                    <div>
                      <p style={{ fontSize: "0.88rem", fontWeight: 600, color: "#0f172a" }}>{vac.specialty}</p>
                      <p style={{ fontSize: "0.75rem", color: "#94a3b8" }}>{vac.grade}{vac.location ? ` · ${vac.location}` : ""}</p>
                    </div>
                    <span style={{ fontSize: "0.72rem", background: "#f0fdf4", color: "#16a34a", fontWeight: 700, padding: "3px 8px", borderRadius: 100 }}>{vac.vacancies} open</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* DOCTOR LEADS */}
        {activeTab === "leads" && (
          <div className="fade-up">
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: "1.3rem", color: "#0f172a" }}>Doctor Leads</h2>
              <p style={{ fontSize: "0.85rem", color: "#94a3b8", marginTop: 4 }}>
                {isAdvanced ? "Full profile access — click any doctor to view name and contact details." :
                 isPro ? "Summarized CV visible. Upgrade to Advanced for full profiles." :
                 "Summarized CV visible. Pay to open a conversation or upgrade for outreach."}
              </p>
            </div>

            {/* Connection Requests */}
            {connectionRequests.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ fontWeight: 700, fontSize: "0.95rem", color: "#0f172a", marginBottom: 12 }}>
                  🔔 Connection Requests
                  <span style={{ marginLeft: 8, background: "#f59e0b", color: "#fff", fontSize: "0.7rem", fontWeight: 700, padding: "2px 8px", borderRadius: 100 }}>{connectionRequests.length}</span>
                </h3>
                {connectionRequests.map(req => (
                  <div key={req.id} style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 14, padding: "14px 18px", marginBottom: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 40, height: 40, background: "#fef9c3", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.85rem", color: "#92400e" }}>DR</div>
                        <div>
                          <p style={{ fontWeight: 700, fontSize: "0.9rem", color: "#0f172a" }}>{req.doctor_specialty} · {req.doctor_grade}</p>
                          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                            <p style={{ fontSize: "0.75rem", color: "#92400e" }}>Wants to connect</p>
                            {req.doctor_tier === "advanced" && <span style={{ fontSize: "0.65rem", background: "linear-gradient(135deg, #0f172a, #334155)", color: "#fff", padding: "1px 6px", borderRadius: 100, fontWeight: 700 }}>⚡ ADV</span>}
                            {req.doctor_tier === "pro" && <span style={{ fontSize: "0.65rem", background: "linear-gradient(135deg, #6d28d9, #4f46e5)", color: "#fff", padding: "1px 6px", borderRadius: 100, fontWeight: 700 }}>💎 PRO</span>}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          onClick={() => setExpandedRequest(expandedRequest === req.id ? null : req.id)}
                          style={{ background: "#fff", color: "#92400e", border: "1.5px solid #fde68a", padding: "7px 14px", borderRadius: 10, fontSize: "0.82rem", fontWeight: 600, cursor: "pointer", fontFamily: "Inter, sans-serif" }}
                        >
                          {expandedRequest === req.id ? "Hide Profile ▲" : "View Profile ▼"}
                        </button>
                        <button onClick={() => handleAcceptDoctorConnection(req.id)} style={{ background: "#f0fdf4", color: "#16a34a", border: "1.5px solid #bbf7d0", padding: "7px 14px", borderRadius: 10, fontSize: "0.82rem", fontWeight: 600, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>✓ Accept</button>
                        <button onClick={() => handleDeclineDoctorConnection(req.id)} style={{ background: "#fef2f2", color: "#dc2626", border: "1.5px solid #fecaca", padding: "7px 14px", borderRadius: 10, fontSize: "0.82rem", fontWeight: 600, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>✗ Decline</button>
                      </div>
                    </div>
                    {expandedRequest === req.id && (
                      <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #fde68a" }}>
                        <p style={{ fontSize: "0.78rem", fontWeight: 700, color: "#92400e", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Doctor Qualifications</p>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
                          {[
                            { label: "Specialty", value: req.doctor_specialty },
                            { label: "Grade", value: req.doctor_grade },
                            { label: "Tier", value: req.doctor_tier === "advanced" ? "⚡ Advanced" : req.doctor_tier === "pro" ? "💎 Pro" : "Base" },
                          ].filter(f => f.value).map((field, i) => (
                            <div key={i} style={{ background: "#fffde7", borderRadius: 10, padding: "10px 12px", border: "1px solid #fde68a" }}>
                              <p style={{ fontSize: "0.7rem", fontWeight: 700, color: "#92400e", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>{field.label}</p>
                              <p style={{ fontSize: "0.88rem", fontWeight: 600, color: "#0f172a" }}>{field.value}</p>
                            </div>
                          ))}
                        </div>
                        <p style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: 10 }}>Contact details are only shared after you accept the connection.</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Connected Doctors */}
            <h3 style={{ fontWeight: 700, fontSize: "0.95rem", color: "#0f172a", marginBottom: 12 }}>Connected Doctors ({doctors.length})</h3>
            {doctors.length === 0 ? (
              <div className="card" style={{ textAlign: "center", padding: "48px 24px" }}>
                <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>👨‍⚕️</div>
                <p style={{ fontWeight: 600, color: "#374151", marginBottom: 6 }}>No doctors connected yet</p>
                <p style={{ fontSize: "0.85rem", color: "#94a3b8" }}>Doctors matching your specialty requirements will connect with you.</p>
              </div>
            ) : doctors.map(doc => (
              <div key={doc.user_id} className="doctor-row">
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 44, height: 44, background: "#f5f3ff", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.9rem", color: "#334155", flexShrink: 0 }}>DR</div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                      {isAdvanced ? (
                        <p style={{ fontWeight: 700, fontSize: "0.95rem", color: "#0f172a" }}>{doc.full_name}</p>
                      ) : (
                        <p style={{ fontWeight: 700, fontSize: "0.95rem", color: "#0f172a", filter: isBase ? "none" : "none" }}>Doctor — {doc.specialty}</p>
                      )}
                      {doc.tier === "advanced" && <span style={{ fontSize: "0.65rem", background: "linear-gradient(135deg, #0f172a, #334155)", color: "#fff", padding: "1px 6px", borderRadius: 100, fontWeight: 700 }}>⚡</span>}
                      {doc.tier === "pro" && <span style={{ fontSize: "0.65rem", background: "linear-gradient(135deg, #6d28d9, #4f46e5)", color: "#fff", padding: "1px 6px", borderRadius: 100, fontWeight: 700 }}>💎</span>}
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {[doc.specialty, doc.grade, doc.preferred_location].filter(Boolean).map((val, i) => (
                        <span key={i} style={{ fontSize: "0.75rem", background: "#f1f5f9", color: "#64748b", padding: "2px 8px", borderRadius: 100 }}>{val}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn-ghost" style={{ padding: "7px 14px", fontSize: "0.82rem" }}
                    onClick={() => { setSelectedDoctor(doc); setShowDoctorModal(true); }}>
                    View CV
                  </button>
                  {(isPro || isAdvanced) && (
                    <button
                      className={isAdvanced ? "btn-advanced" : "btn-blue"}
                      style={{ padding: "7px 14px", fontSize: "0.82rem" }}
                      onClick={() => {
                        if (!isAdvanced && outreachUsedThisWeek >= outreachLimit) {
                          setMsg("Weekly outreach limit reached. Upgrade to Advanced for unlimited.");
                          setTimeout(() => setMsg(""), 3000);
                          return;
                        }
                        setMessageDoctor(doc);
                        setShowMessageModal(true);
                      }}
                    >
                      💬 {!isAdvanced && outreachUsedThisWeek >= outreachLimit ? "Limit" : "Message"}
                    </button>
                  )}
                  {isBase && (
                    <button className="btn-ghost" style={{ padding: "7px 14px", fontSize: "0.82rem" }} onClick={() => handleUpgradeClick("Doctor Outreach", "pro")}>
                      💬 Pay/Upgrade
                    </button>
                  )}
                  <button onClick={() => handleDisconnectDoctor(doc.user_id)} style={{ background: "#fef2f2", color: "#dc2626", border: "1.5px solid #fecaca", padding: "7px 12px", borderRadius: 10, fontSize: "0.82rem", fontWeight: 600, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
                    Disconnect
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* MARKET VIEW */}
        {activeTab === "market" && (
          <div className="fade-up">
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: "1.3rem", color: "#0f172a" }}>Market View</h2>
              <p style={{ fontSize: "0.85rem", color: "#94a3b8", marginTop: 4 }}>
                Active UK doctors matching your specialty requirements.
                {isAdvanced ? " Advanced — full profiles visible, unlimited outreach." :
                 isPro ? " Pro — summarized CV, 2 outreach/week." :
                 " Base — blurred profiles. Upgrade to connect proactively."}
              </p>
            </div>

            {isAdvanced && agency?.is_top_agency && (
              <div style={{ background: "linear-gradient(135deg, #0f172a, #334155)", borderRadius: 12, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
                <span>⚡</span>
                <p style={{ fontSize: "0.85rem", color: "#fff", fontWeight: 600 }}>Top Agency Status — your agency appears first to all matching doctors</p>
              </div>
            )}

            {marketDoctors.length === 0 ? (
              <div className="card" style={{ textAlign: "center", padding: "48px 24px" }}>
                <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>🔍</div>
                <p style={{ fontWeight: 600, color: "#374151", marginBottom: 6 }}>No matching doctors found</p>
                <p style={{ fontSize: "0.85rem", color: "#94a3b8" }}>Update your required specialties and grades to see matching doctors.</p>
              </div>
            ) : marketDoctors.map((doc, i) => (
              <div key={doc.user_id} className="doctor-row" style={{ position: "relative" }}>
                {/* Pro doctors first indicator */}
                {(doc.tier === "advanced" || doc.tier === "pro") && i === 0 && (
                  <div style={{ position: "absolute", top: -8, left: 16, fontSize: "0.65rem", fontWeight: 700, background: doc.tier === "advanced" ? "linear-gradient(135deg, #0f172a, #334155)" : "linear-gradient(135deg, #6d28d9, #4f46e5)", color: "#fff", padding: "2px 8px", borderRadius: 100 }}>
                    {doc.tier === "advanced" ? "⚡ Priority Doctor" : "💎 Pro Doctor"}
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 44, height: 44, background: isAdvanced ? "#f5f3ff" : "#f1f5f9", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.9rem", color: isAdvanced ? "#334155" : "#94a3b8", flexShrink: 0, filter: isBase ? "blur(3px)" : "none" }}>
                    {isAdvanced ? doc.full_name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() : "DR"}
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {isAdvanced ? (
                        <p style={{ fontWeight: 700, fontSize: "0.95rem", color: "#0f172a" }}>{doc.full_name}</p>
                      ) : isBase ? (
                        <p style={{ fontWeight: 700, fontSize: "0.95rem", color: "#0f172a", filter: "blur(5px)", userSelect: "none" }}>Doctor Name</p>
                      ) : (
                        <p style={{ fontWeight: 700, fontSize: "0.95rem", color: "#0f172a" }}>{doc.specialty} · {doc.grade} Doctor</p>
                      )}
                      {doc.tier === "advanced" && <span style={{ fontSize: "0.65rem", background: "linear-gradient(135deg, #0f172a, #334155)", color: "#fff", padding: "1px 6px", borderRadius: 100, fontWeight: 700 }}>⚡</span>}
                      {doc.tier === "pro" && <span style={{ fontSize: "0.65rem", background: "linear-gradient(135deg, #6d28d9, #4f46e5)", color: "#fff", padding: "1px 6px", borderRadius: 100, fontWeight: 700 }}>💎</span>}
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 3 }}>
                      <span style={{ fontSize: "0.75rem", background: "#f1f5f9", color: "#64748b", padding: "2px 8px", borderRadius: 100 }}>{doc.specialty}</span>
                      <span style={{ fontSize: "0.75rem", background: "#f1f5f9", color: "#64748b", padding: "2px 8px", borderRadius: 100 }}>{doc.grade}</span>
                      {doc.preferred_location && <span style={{ fontSize: "0.75rem", background: "#f1f5f9", color: "#64748b", padding: "2px 8px", borderRadius: 100 }}>📍 {doc.preferred_location}</span>}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {isBase ? (
                    <button style={{ background: "linear-gradient(135deg, #6d28d9, #4f46e5)", color: "#fff", border: "none", padding: "7px 14px", borderRadius: 10, fontSize: "0.82rem", fontWeight: 600, cursor: "pointer", fontFamily: "Inter, sans-serif" }} onClick={() => handleUpgradeClick("Market View & Outreach", "pro")}>
                      💎 Upgrade
                    </button>
                  ) : (
                    <>
                      <button className="btn-ghost" style={{ padding: "7px 14px", fontSize: "0.82rem" }} onClick={() => { setSelectedDoctor(doc); setShowDoctorModal(true); }}>View CV</button>
                      <button
                        className={isAdvanced ? "btn-advanced" : "btn-blue"}
                        style={{ padding: "7px 14px", fontSize: "0.82rem" }}
                        onClick={() => {
                          if (!isAdvanced && outreachUsedThisWeek >= outreachLimit) {
                            setMsg("Weekly outreach limit reached.");
                            setTimeout(() => setMsg(""), 3000);
                            return;
                          }
                          setMessageDoctor(doc);
                          setShowMessageModal(true);
                        }}
                        disabled={!isAdvanced && outreachUsedThisWeek >= outreachLimit}
                      >
                        💬 {isAdvanced ? "Message" : `Message ${!isAdvanced && outreachUsedThisWeek >= outreachLimit ? "(limit)" : `(${outreachRemaining} left)`}`}
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* POST SPOTS */}
        {activeTab === "vacancies" && (
          <div className="fade-up">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: "1.3rem", color: "#0f172a" }}>Post Spots</h2>
                <p style={{ fontSize: "0.85rem", color: "#94a3b8", marginTop: 4 }}>
                  {isAdvanced ? "Unlimited spots — post as many shifts as needed." :
                   isPro ? "2 spots per week — visible on matching doctor calendars." :
                   "1 spot per week — post one live shift to matching doctors."}
                </p>
              </div>
              <button
                className={isAdvanced ? "btn-advanced" : "btn-blue"}
                onClick={() => spotsUsedThisWeek < spotLimit ? setShowVacancyModal(true) : setMsg("Weekly limit reached. Upgrade for more spots.")}
              >
                + Post Spot {spotLimit !== Infinity && `(${spotsRemaining} left)`}
              </button>
            </div>

            {/* Weekly spot progress */}
            <div className="card" style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <h3 style={{ fontWeight: 700, fontSize: "0.88rem", color: "#0f172a" }}>This Week's Spots</h3>
                <span style={{ fontSize: "0.82rem", color: "#94a3b8" }}>Resets every Monday</span>
              </div>
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                {Array.from({ length: spotLimit === Infinity ? 5 : spotLimit }).map((_, i) => (
                  <div key={i} style={{ flex: 1, height: 8, borderRadius: 100, background: i < spotsUsedThisWeek ? "#f97316" : "#e2e8f0" }} />
                ))}
                {spotLimit === Infinity && <span style={{ fontSize: "0.78rem", color: "#94a3b8" }}>Unlimited ∞</span>}
              </div>
              <p style={{ fontSize: "0.78rem", color: "#64748b" }}>{spotsUsedThisWeek} of {spotLimit === Infinity ? "unlimited" : spotLimit} spots used this week</p>
            </div>

            {vacancies.length === 0 ? (
              <div className="card" style={{ textAlign: "center", padding: "48px 24px" }}>
                <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>📋</div>
                <p style={{ fontWeight: 600, color: "#374151", marginBottom: 6 }}>No spots posted yet</p>
                <p style={{ fontSize: "0.85rem", color: "#94a3b8", marginBottom: 20 }}>Posted spots appear on matching doctors' calendars.</p>
                <button className="btn-blue" onClick={() => setShowVacancyModal(true)}>Post your first spot</button>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
                {vacancies.map(vac => (
                  <div key={vac.id} className="card">
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                      <span className="status-badge" style={{ background: vac.active ? "#f0fdf4" : "#f1f5f9", color: vac.active ? "#16a34a" : "#94a3b8" }}>{vac.active ? "🟢 Active" : "⭕ Inactive"}</span>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => handleToggleVacancy(vac.id, vac.active)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.78rem", color: "#94a3b8", fontFamily: "Inter, sans-serif" }}>{vac.active ? "Deactivate" : "Activate"}</button>
                        <button onClick={() => handleDeleteVacancy(vac.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.78rem", color: "#dc2626", fontFamily: "Inter, sans-serif" }}>Delete</button>
                      </div>
                    </div>
                    <h3 style={{ fontWeight: 700, fontSize: "1rem", color: "#0f172a", marginBottom: 8 }}>{vac.specialty}</h3>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                      {[vac.grade, vac.location].filter(Boolean).map((v, i) => <span key={i} style={{ fontSize: "0.75rem", background: "#f1f5f9", color: "#64748b", padding: "2px 8px", borderRadius: 100 }}>{v}</span>)}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: "1.3rem", fontWeight: 700, color: "#f97316" }}>{vac.vacancies}</span>
                      <span style={{ fontSize: "0.78rem", color: "#94a3b8" }}>open spot{vac.vacancies > 1 ? "s" : ""}</span>
                    </div>
                    {vac.notes && <p style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: 8 }}>{vac.notes}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PLACED DOCTORS */}
        {activeTab === "placed" && (
          <div className="fade-up">
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: "1.3rem", color: "#0f172a" }}>Placed Doctors</h2>
              <p style={{ fontSize: "0.85rem", color: "#94a3b8", marginTop: 4 }}>Doctors successfully placed through quiet.</p>
            </div>
            {placedDoctors.length === 0 ? (
              <div className="card" style={{ textAlign: "center", padding: "48px 24px" }}>
                <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>✅</div>
                <p style={{ fontWeight: 600, color: "#374151", marginBottom: 6 }}>No placed doctors yet</p>
                <p style={{ fontSize: "0.85rem", color: "#94a3b8" }}>Placed doctors and referral invoices will appear here.</p>
              </div>
            ) : (
              <div className="card">
                {placedDoctors.map((pd, i) => (
                  <div key={pd.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0", borderBottom: i < placedDoctors.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 40, height: 40, background: "#f0fdf4", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem" }}>✅</div>
                      <div>
                        <p style={{ fontWeight: 600, fontSize: "0.9rem", color: "#0f172a" }}>{pd.doctor_name || "Doctor"}</p>
                        <p style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Placed {pd.placed_at}{pd.invoice_amount ? ` · £${pd.invoice_amount} invoice` : ""}</p>
                      </div>
                    </div>
                    <span className="status-badge" style={{ background: pd.invoice_sent ? "#f0fdf4" : "#fffbeb", color: pd.invoice_sent ? "#16a34a" : "#92400e" }}>{pd.invoice_sent ? "Invoice sent" : "Invoice pending"}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* INVOICES */}
        {activeTab === "invoices" && (
          <div className="fade-up">
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: "1.3rem", color: "#0f172a" }}>Invoices</h2>
              <p style={{ fontSize: "0.85rem", color: "#94a3b8", marginTop: 4 }}>Referral fee invoices from quiet.</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 20 }}>
              {[
                { label: "Pending", value: pendingInvoices.length, color: "#fffbeb", textColor: "#92400e" },
                { label: "Paid", value: paidInvoices.length, color: "#f0fdf4", textColor: "#16a34a" },
                { label: "Total Earned", value: `£${totalRevenue.toFixed(0)}`, color: "#f5f3ff", textColor: "#334155" },
              ].map((s, i) => (
                <div key={i} className="card" style={{ background: s.color, border: "none", textAlign: "center" }}>
                  <div style={{ fontSize: "1.5rem", fontWeight: 700, color: s.textColor }}>{s.value}</div>
                  <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>
            {invoices.length === 0 ? (
              <div className="card" style={{ textAlign: "center", padding: "48px 24px" }}>
                <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>🧾</div>
                <p style={{ fontWeight: 600, color: "#374151" }}>No invoices yet</p>
              </div>
            ) : (
              <div className="card">
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 12, padding: "0 0 10px", borderBottom: "1px solid #f1f5f9", marginBottom: 4 }}>
                  {["Doctor", "Amount", "Date", "Status"].map(h => <p key={h} style={{ fontSize: "0.72rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</p>)}
                </div>
                {invoices.map((inv, i) => (
                  <div key={inv.id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 12, padding: "12px 0", borderBottom: i < invoices.length - 1 ? "1px solid #f1f5f9" : "none", alignItems: "center" }}>
                    <p style={{ fontSize: "0.88rem", fontWeight: 600, color: "#0f172a" }}>{inv.doctor_name || "Doctor"}</p>
                    <p style={{ fontSize: "0.88rem", color: "#0f172a" }}>£{inv.amount}</p>
                    <p style={{ fontSize: "0.82rem", color: "#94a3b8" }}>{inv.invoice_date}</p>
                    <span className="status-badge" style={{ background: inv.status === "paid" ? "#f0fdf4" : inv.status === "sent" ? "#f5f3ff" : "#fffbeb", color: inv.status === "paid" ? "#16a34a" : inv.status === "sent" ? "#334155" : "#92400e", display: "inline-block" }}>{inv.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* DOCUMENTS */}
        {activeTab === "documents" && (
          <div className="fade-up">
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: "1.3rem", color: "#0f172a" }}>Shared Documents</h2>
              <p style={{ fontSize: "0.85rem", color: "#94a3b8", marginTop: 4 }}>Documents shared by doctors — review and accept or decline.</p>
            </div>
            {pendingShares.length > 0 && (
              <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 12, padding: "12px 16px", marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: "1.1rem" }}>⏳</span>
                <p style={{ fontSize: "0.88rem", color: "#92400e", fontWeight: 600 }}>{pendingShares.length} pending document request{pendingShares.length > 1 ? "s" : ""} awaiting review</p>
              </div>
            )}
            {shareRequests.length === 0 ? (
              <div className="card" style={{ textAlign: "center", padding: "48px 24px" }}>
                <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>📄</div>
                <p style={{ fontWeight: 600, color: "#374151", marginBottom: 6 }}>No documents shared yet</p>
                <p style={{ fontSize: "0.85rem", color: "#94a3b8" }}>When doctors share documents they will appear here.</p>
              </div>
            ) : (
              <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                {shareRequests.map((req, i) => (
                  <div key={req.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: i < shareRequests.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 40, height: 40, background: "#f5f3ff", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", flexShrink: 0 }}>📄</div>
                      <div>
                        <p style={{ fontSize: "0.9rem", fontWeight: 600, color: "#0f172a" }}>{req.file_name || "Document"}</p>
                        {req.module_name && (
                          <span style={{ fontSize: "0.7rem", fontWeight: 700, background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0", padding: "1px 7px", borderRadius: 100, display: "inline-block", marginBottom: 2 }}>🎓 {req.module_name}</span>
                        )}
                        {req.folder === "mandatory_training" && !req.module_name && (
                          <span style={{ fontSize: "0.7rem", fontWeight: 700, background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0", padding: "1px 7px", borderRadius: 100, display: "inline-block", marginBottom: 2 }}>🎓 Mandatory Training</span>
                        )}
                        <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 3 }}>
                          <p style={{ fontSize: "0.75rem", color: "#94a3b8" }}>From {req.doctor_name || "Doctor"}</p>
                          <span className="status-badge" style={{ background: req.status === "accepted" ? "#f0fdf4" : req.status === "declined" ? "#fef2f2" : "#fffbeb", color: req.status === "accepted" ? "#16a34a" : req.status === "declined" ? "#dc2626" : "#92400e" }}>
                            {req.status === "accepted" ? "✓ Accepted" : req.status === "declined" ? "✗ Declined" : "⏳ Pending"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      {req.status === "accepted" && <button className="btn-ghost" style={{ padding: "6px 14px", fontSize: "0.82rem" }} onClick={() => handleDownloadSharedDoc(req)}>⬇ Download</button>}
                      {req.status === "pending" && (
                        <>
                          <button onClick={() => handleRespondToShare(req.id, "accepted")} style={{ background: "#f0fdf4", color: "#16a34a", border: "1.5px solid #bbf7d0", padding: "6px 14px", borderRadius: 10, fontSize: "0.82rem", fontWeight: 600, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>✓ Accept</button>
                          <button onClick={() => handleRespondToShare(req.id, "declined")} style={{ background: "#fef2f2", color: "#dc2626", border: "1.5px solid #fecaca", padding: "6px 14px", borderRadius: 10, fontSize: "0.82rem", fontWeight: 600, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>✗ Decline</button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* MY DOCTORS */}
{/* MESSAGES */}
{activeTab === "messages" && (
  <div className="fade-up">
    <div style={{ marginBottom: 20 }}>
      <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: "1.3rem", fontWeight: 700, color: "#0f172a" }}>💬 Messages</h2>
      <p style={{ fontSize: "0.85rem", color: "#94a3b8", marginTop: 4 }}>Messages from doctors about your spots and vacancies.</p>
    </div>

    {/* Stats */}
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 20 }}>
      {[
        { label: "Total", value: doctorMessages.length, color: "#f8f9fc" },
        { label: "Unread", value: doctorMessages.filter(m => !m.read).length, color: "#fef2f2" },
        { label: "Read", value: doctorMessages.filter(m => m.read).length, color: "#f0fdf4" },
      ].map((s, i) => (
        <div key={i} className="card" style={{ background: s.color, border: "none", padding: "14px 16px", textAlign: "center" }}>
          <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "#0f172a" }}>{s.value}</div>
          <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: 2 }}>{s.label}</div>
        </div>
      ))}
    </div>

    {doctorMessages.length === 0 ? (
      <div className="card" style={{ textAlign: "center", padding: "48px 24px" }}>
        <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>💬</div>
        <p style={{ fontWeight: 600, color: "#374151", marginBottom: 6 }}>No messages yet</p>
        <p style={{ fontSize: "0.85rem", color: "#94a3b8" }}>When doctors message you about spots, they will appear here.</p>
      </div>
    ) : (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {doctorMessages.map(msg => (
          <div
            key={msg.id}
            className="card"
            style={{ background: msg.read ? "#fff" : "#f5f3ff", border: `1.5px solid ${msg.read ? "#e2e8f0" : "#ddd6fe"}`, cursor: "pointer" }}
            onClick={async () => {
              if (!msg.read) {
                await supabase.from("doctor_messages").update({ read: true }).eq("id", msg.id);
                setDoctorMessages(prev => prev.map(m => m.id === msg.id ? { ...m, read: true } : m));
              }
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 40, height: 40, background: msg.read ? "#f1f5f9" : "#ede9fe", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.85rem", color: msg.read ? "#64748b" : "#7c3aed", flexShrink: 0 }}>
                  DR
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <p style={{ fontWeight: 700, fontSize: "0.9rem", color: "#0f172a" }}>
                      {msg.doctor_specialty} · {msg.doctor_grade} Doctor
                    </p>
                    {!msg.read && <span style={{ width: 8, height: 8, background: "#7c3aed", borderRadius: "50%", display: "inline-block" }} />}
                  </div>
                  <p style={{ fontSize: "0.85rem", color: "#374151", lineHeight: 1.6 }}>{msg.message}</p>
                  <p style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: 4 }}>
                    {new Date(msg.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
)}
{activeTab === "mydoctors" && (
  <div className="fade-up">
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
      <div>
        <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: "1.3rem", fontWeight: 700, color: "#0f172a" }}>🩺 My Doctors</h2>
        <p style={{ fontSize: "0.85rem", color: "#94a3b8", marginTop: 4 }}>Manage all your doctors in one place — including those not yet on Quiet.</p>
      </div>
      <button
        onClick={() => setShowExternalModal(true)}
        style={{ background: "linear-gradient(135deg, #1e293b, #334155)", color: "#fff", border: "none", padding: "10px 18px", borderRadius: 12, fontWeight: 700, fontSize: "0.85rem", cursor: "pointer", fontFamily: "inherit" }}
      >
        + Add Doctor
      </button>
    </div>

    {/* Stats */}
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 20 }}>
      {[
        { label: "Total Doctors", value: doctors.length + externalDoctors.length, color: "#f8f9fc" },
        { label: "On Quiet", value: doctors.length, color: "#f5f3ff" },
        { label: "External", value: externalDoctors.length, color: "#f0fdf4" },
        { label: "Invited", value: externalDoctors.filter(d => d.invite_sent).length, color: "#fffbeb" },
        { label: "Not Invited", value: externalDoctors.filter(d => !d.invite_sent && !d.quiet_user_id).length, color: "#fef2f2" },
      ].map((s, i) => (
        <div key={i} className="card" style={{ background: s.color, border: "none", padding: "14px 16px", textAlign: "center" }}>
          <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "#0f172a" }}>{s.value}</div>
          <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: 2 }}>{s.label}</div>
        </div>
      ))}
    </div>

    {/* Quiet Doctors */}
    {doctors.length > 0 && (
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontWeight: 700, fontSize: "0.95rem", color: "#0f172a", marginBottom: 12 }}>
          ✅ On Quiet ({doctors.length})
        </h3>
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {doctors.map((doc, i) => (
            <div key={doc.user_id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: i < doctors.length - 1 ? "1px solid #f1f5f9" : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 38, height: 38, background: "#f5f3ff", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.8rem", color: "#334155" }}>
                  {doc.full_name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "DR"}
                </div>
                <div>
                  <p style={{ fontWeight: 600, fontSize: "0.9rem", color: "#0f172a" }}>{doc.full_name}</p>
                  <div style={{ display: "flex", gap: 6, marginTop: 2 }}>
                    {[doc.specialty, doc.grade, doc.preferred_location].filter(Boolean).map((v, i) => (
                      <span key={i} style={{ fontSize: "0.72rem", background: "#f1f5f9", color: "#64748b", padding: "1px 7px", borderRadius: 100 }}>{v}</span>
                    ))}
                  </div>
                </div>
              </div>
              <span style={{ fontSize: "0.72rem", background: "#f0fdf4", color: "#16a34a", fontWeight: 700, padding: "3px 10px", borderRadius: 100 }}>✓ On Quiet</span>
            </div>
          ))}
        </div>
      </div>
    )}

    {/* External Doctors */}
    <div>
      <h3 style={{ fontWeight: 700, fontSize: "0.95rem", color: "#0f172a", marginBottom: 12 }}>
        👤 External Doctors ({externalDoctors.length})
      </h3>
      {externalDoctors.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "48px 24px" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>🩺</div>
          <p style={{ fontWeight: 600, color: "#374151", marginBottom: 6 }}>No external doctors yet</p>
          <p style={{ fontSize: "0.85rem", color: "#94a3b8", marginBottom: 20 }}>Add doctors you work with who aren't on Quiet yet.</p>
          <button onClick={() => setShowExternalModal(true)} style={{ background: "linear-gradient(135deg, #1e293b, #334155)", color: "#fff", border: "none", padding: "10px 20px", borderRadius: 10, fontWeight: 700, fontSize: "0.85rem", cursor: "pointer", fontFamily: "inherit" }}>
            + Add Doctor
          </button>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {externalDoctors.map((doc, i) => (
            <div key={doc.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: i < externalDoctors.length - 1 ? "1px solid #f1f5f9" : "none", flexWrap: "wrap", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 38, height: 38, background: "#f1f5f9", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.8rem", color: "#94a3b8" }}>
                  {doc.full_name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "DR"}
                </div>
                <div>
                  <p style={{ fontWeight: 600, fontSize: "0.9rem", color: "#0f172a" }}>{doc.full_name}</p>
                  <div style={{ display: "flex", gap: 6, marginTop: 2, flexWrap: "wrap" }}>
                    {[doc.specialty, doc.grade, doc.preferred_location].filter(Boolean).map((v, j) => (
                      <span key={j} style={{ fontSize: "0.72rem", background: "#f1f5f9", color: "#64748b", padding: "1px 7px", borderRadius: 100 }}>{v}</span>
                    ))}
                    {doc.email && <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>{doc.email}</span>}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {doc.quiet_user_id ? (
                  <span style={{ fontSize: "0.72rem", background: "#f0fdf4", color: "#16a34a", fontWeight: 700, padding: "3px 10px", borderRadius: 100 }}>✓ On Quiet</span>
                ) : doc.invite_sent ? (
                  <span style={{ fontSize: "0.72rem", background: "#fffbeb", color: "#92400e", fontWeight: 700, padding: "3px 10px", borderRadius: 100 }}>⏳ Invite Sent</span>
                ) : (
                  <button
                    disabled={sendingInvite === doc.id || !doc.email}
                    onClick={async () => {
                      if (!doc.email) return;
                      setSendingInvite(doc.id);
                      await supabase.from("external_doctors").update({ invite_sent: true, invite_sent_at: new Date().toISOString() }).eq("id", doc.id);
                      await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-email`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}` },
                        body: JSON.stringify({ type: "invite_doctor", data: { email: doc.email, full_name: doc.full_name, agency_name: agency?.agency_name } }),
                      });
                      setExternalDoctors(prev => prev.map(d => d.id === doc.id ? { ...d, invite_sent: true } : d));
                      setSendingInvite(null);
                    }}
                    style={{ fontSize: "0.78rem", background: "#f5f3ff", color: "#7c3aed", border: "1.5px solid #ddd6fe", padding: "5px 12px", borderRadius: 8, fontWeight: 600, cursor: doc.email ? "pointer" : "not-allowed", fontFamily: "inherit", opacity: doc.email ? 1 : 0.5 }}
                  >
                    {sendingInvite === doc.id ? "Sending..." : "✉ Invite to Quiet"}
                  </button>
                )}
                <button
                  onClick={async () => {
                    if (!confirm(`Delete ${doc.full_name}?`)) return;
                    await supabase.from("external_doctors").delete().eq("id", doc.id);
                    setExternalDoctors(prev => prev.filter(d => d.id !== doc.id));
                  }}
                  style={{ fontSize: "0.78rem", background: "#fef2f2", color: "#dc2626", border: "1.5px solid #fecaca", padding: "5px 10px", borderRadius: 8, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
                >
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
)}

{/* ADD EXTERNAL DOCTOR MODAL */}
{showExternalModal && (
  <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 24 }} onClick={() => setShowExternalModal(false)}>
    <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 20, padding: 32, width: "100%", maxWidth: 480, boxShadow: "0 20px 60px rgba(0,0,0,0.2)", maxHeight: "90vh", overflowY: "auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: "1.2rem", fontWeight: 700, color: "#0f172a" }}>Add External Doctor</h2>
        <button onClick={() => setShowExternalModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: "1.2rem" }}>✕</button>
      </div>
      <div style={{ background: "#f5f3ff", border: "1px solid #ddd6fe", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: "0.82rem", color: "#334155" }}>
        💡 If the doctor's email matches an existing Quiet account, they will be linked automatically.
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {[
          { label: "Full Name *", key: "full_name", placeholder: "Dr. Jane Smith" },
          { label: "Email", key: "email", placeholder: "doctor@example.com" },
          { label: "Specialty", key: "specialty", placeholder: "e.g. Emergency Medicine" },
          { label: "Grade", key: "grade", placeholder: "e.g. Consultant, Registrar" },
          { label: "Phone", key: "phone", placeholder: "+44 7700 000000" },
          { label: "GMC Number", key: "gmc_number", placeholder: "e.g. 1234567" },
          { label: "Preferred Location", key: "preferred_location", placeholder: "e.g. London" },
          { label: "Notes", key: "notes", placeholder: "Any additional notes..." },
        ].map(field => (
          <div key={field.key}>
            <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>{field.label}</label>
            <input
              className="input-field"
              placeholder={field.placeholder}
              value={newExternal[field.key as keyof typeof newExternal]}
              onChange={e => setNewExternal(prev => ({ ...prev, [field.key]: e.target.value }))}
            />
          </div>
        ))}
        <button
          disabled={savingExternal || !newExternal.full_name}
          onClick={async () => {
            setSavingExternal(true);
            let quiet_user_id = null;
            if (newExternal.email) {
              const { data: existingDoctor } = await supabase.from("doctors").select("user_id").eq("email", newExternal.email).single();
              if (existingDoctor) quiet_user_id = existingDoctor.user_id;
            }
            const { data: inserted } = await supabase.from("external_doctors").insert({
              agency_id: agency?.id,
              ...newExternal,
              quiet_user_id,
            }).select().single();
            if (inserted) {
              setExternalDoctors(prev => [inserted, ...prev]);
              setShowExternalModal(false);
              setNewExternal({ full_name: "", email: "", specialty: "", grade: "", phone: "", gmc_number: "", preferred_location: "", notes: "" });
            }
            setSavingExternal(false);
          }}
          style={{ background: "linear-gradient(135deg, #1e293b, #334155)", color: "#fff", border: "none", padding: "13px", borderRadius: 12, fontWeight: 700, fontSize: "0.9rem", cursor: "pointer", fontFamily: "inherit", opacity: savingExternal || !newExternal.full_name ? 0.6 : 1 }}
        >
          {savingExternal ? "Saving..." : "Add Doctor"}
        </button>
      </div>
    </div>
  </div>
)}
        {/* BILLING */}
        {activeTab === "billing" && (
          <div className="fade-up">
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: "1.3rem", fontWeight: 700, color: "#0f172a" }}>Billing & Subscription</h2>
              <p style={{ fontSize: "0.85rem", color: "#94a3b8", marginTop: 4 }}>Your current plan and available upgrades.</p>
            </div>

            {/* Current plan */}
            <div className="card" style={{ marginBottom: 24, background: "linear-gradient(135deg, #f8f9fc, #f5f3ff)", border: "1.5px solid #ddd6fe" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 48, height: 48, background: isAdvanced ? "linear-gradient(135deg, #1e293b, #334155)" : isPro ? "linear-gradient(135deg, #7c3aed, #6d28d9)" : "#f1f5f9", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem" }}>
                    {isAdvanced ? "⚡" : isPro ? "💎" : "🏥"}
                  </div>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: "1rem", color: "#0f172a" }}>
                      {isAdvanced ? "Advanced Plan" : isPro ? "Pro Plan" : "Base Plan (Free)"}
                    </p>
                    <p style={{ fontSize: "0.82rem", color: "#64748b" }}>
                      {isAdvanced ? "£800/month · No referral fees" : isPro ? "£275/month · £200 referral fee" : "Free · £500 referral fee per placement"}
                    </p>
                  </div>
                </div>
                {!isAdvanced && (
                  <span style={{ fontSize: "0.78rem", background: "#f5f3ff", color: "#7c3aed", border: "1px solid #ddd6fe", padding: "4px 12px", borderRadius: 100, fontWeight: 600 }}>
                    Upgrade available ↓
                  </span>
                )}
              </div>
            </div>

            {/* Pricing cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 24 }}>

              {/* Base */}
              <div style={{ background: "#fff", borderRadius: 16, border: `2px solid ${!isPro && !isAdvanced ? "#7c3aed" : "#e2e8f0"}`, padding: "24px", position: "relative" }}>
                {!isPro && !isAdvanced && (
                  <div style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", background: "#7c3aed", color: "#fff", fontSize: "0.68rem", fontWeight: 700, padding: "3px 12px", borderRadius: 100, whiteSpace: "nowrap" }}>CURRENT PLAN</div>
                )}
                <p style={{ fontSize: "0.78rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Base</p>
                <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 4 }}>
                  <span style={{ fontSize: "2rem", fontWeight: 800, color: "#0f172a" }}>Free</span>
                </div>
                <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "6px 10px", fontSize: "0.75rem", color: "#dc2626", fontWeight: 600, marginBottom: 16 }}>
                  £500 referral fee per placement
                </div>
                {["1 spot/week", "Summarised CV", "Passive leads", "Blurred profiles"].map((f, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0" }}>
                    <span style={{ color: "#16a34a", fontWeight: 700, fontSize: "0.85rem" }}>✓</span>
                    <span style={{ fontSize: "0.82rem", color: "#374151" }}>{f}</span>
                  </div>
                ))}
              </div>

              {/* Pro */}
              <div style={{ background: "#fff", borderRadius: 16, border: `2px solid ${isPro && !isAdvanced ? "#7c3aed" : "#e2e8f0"}`, padding: "24px", position: "relative" }}>
                {isPro && !isAdvanced && (
                  <div style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", background: "#7c3aed", color: "#fff", fontSize: "0.68rem", fontWeight: 700, padding: "3px 12px", borderRadius: 100, whiteSpace: "nowrap" }}>CURRENT PLAN</div>
                )}
                <p style={{ fontSize: "0.78rem", fontWeight: 700, color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Pro</p>
                <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 4 }}>
                  <span style={{ fontSize: "2rem", fontWeight: 800, color: "#0f172a" }}>£275</span>
                  <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>/month</span>
                </div>
                <p style={{ fontSize: "0.78rem", color: "#94a3b8", marginBottom: 4 }}>or £2,750/year</p>
                <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "6px 10px", fontSize: "0.75rem", color: "#dc2626", fontWeight: 600, marginBottom: 16 }}>
                  £200 referral fee per placement
                </div>
                {["2 spots/week", "2 outreach/week", "Registration Pathways", "Newsletter access"].map((f, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0" }}>
                    <span style={{ color: "#7c3aed", fontWeight: 700, fontSize: "0.85rem" }}>✓</span>
                    <span style={{ fontSize: "0.82rem", color: "#374151" }}>{f}</span>
                  </div>
                ))}
                {isBase && (
                  <button disabled style={{ width: "100%", marginTop: 16, background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "#fff", border: "none", padding: "11px", borderRadius: 10, fontWeight: 700, fontSize: "0.85rem", cursor: "not-allowed", fontFamily: "inherit", opacity: 0.7 }}>
                    💳 Upgrade to Pro — Coming Soon
                  </button>
                )}
              </div>

              {/* Advanced */}
              <div style={{ background: isAdvanced ? "linear-gradient(135deg, #f8f9fc, #f1f0f8)" : "#fff", borderRadius: 16, border: `2px solid ${isAdvanced ? "#334155" : "#e2e8f0"}`, padding: "24px", position: "relative" }}>
                {isAdvanced && (
                  <div style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", background: "linear-gradient(135deg, #1e293b, #334155)", color: "#fff", fontSize: "0.68rem", fontWeight: 700, padding: "3px 12px", borderRadius: 100, whiteSpace: "nowrap" }}>CURRENT PLAN</div>
                )}
                <p style={{ fontSize: "0.78rem", fontWeight: 700, color: "#334155", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Advanced</p>
                <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 4 }}>
                  <span style={{ fontSize: "2rem", fontWeight: 800, color: "#0f172a" }}>£800</span>
                  <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>/month</span>
                </div>
                <p style={{ fontSize: "0.78rem", color: "#94a3b8", marginBottom: 4 }}>or £8,000/year</p>
                <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "6px 10px", fontSize: "0.75rem", color: "#16a34a", fontWeight: 600, marginBottom: 16 }}>
                  ✅ No referral fee
                </div>
                {["Unlimited spots", "Full name access", "Unlimited outreach", "Top Agency Status", "2x email blasts/month", "API integration"].map((f, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0" }}>
                    <span style={{ color: "#334155", fontWeight: 700, fontSize: "0.85rem" }}>✓</span>
                    <span style={{ fontSize: "0.82rem", color: "#374151" }}>{f}</span>
                  </div>
                ))}
                {!isAdvanced && (
                  <button disabled style={{ width: "100%", marginTop: 16, background: "linear-gradient(135deg, #1e293b, #334155)", color: "#fff", border: "none", padding: "11px", borderRadius: 10, fontWeight: 700, fontSize: "0.85rem", cursor: "not-allowed", fontFamily: "inherit", opacity: 0.7 }}>
                    💳 Upgrade to Advanced — Coming Soon
                  </button>
                )}
              </div>

              {/* Enterprise */}
              <div style={{ background: "linear-gradient(135deg, #f8f9fc, #f1f0f8)", borderRadius: 16, border: "1.5px dashed #ddd6fe", padding: "24px" }}>
                <p style={{ fontSize: "0.78rem", fontWeight: 700, color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Enterprise</p>
                <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 4 }}>
                  <span style={{ fontSize: "2rem", fontWeight: 800, color: "#0f172a" }}>Custom</span>
                </div>
                <p style={{ fontSize: "0.78rem", color: "#94a3b8", marginBottom: 16 }}>Tailored for large agencies and NHS trusts</p>
                {["Everything in Advanced", "Dedicated account manager", "Custom integrations", "SLA guarantee", "Volume pricing"].map((f, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0" }}>
                    <span style={{ color: "#7c3aed", fontWeight: 700, fontSize: "0.85rem" }}>✓</span>
                    <span style={{ fontSize: "0.82rem", color: "#374151" }}>{f}</span>
                  </div>
                ))}
                <a href="mailto:hello@quietmedical.co.uk" style={{ display: "block", textAlign: "center", marginTop: 16, background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "#fff", border: "none", padding: "11px", borderRadius: 10, fontWeight: 700, fontSize: "0.85rem", textDecoration: "none" }}>
                  Contact Sales
                </a>
              </div>
            </div>

            <div className="card" style={{ background: "#fffbeb", border: "1px solid #fde68a" }}>
              <p style={{ fontSize: "0.85rem", color: "#92400e", fontWeight: 600, marginBottom: 4 }}>💳 Online payments coming soon</p>
              <p style={{ fontSize: "0.82rem", color: "#92400e" }}>To upgrade your plan, please contact us at <a href="mailto:hello@quietmedical.co.uk" style={{ color: "#7c3aed", fontWeight: 600 }}>hello@quietmedical.co.uk</a> and we'll upgrade your account manually.</p>
            </div>
          </div>
        )}
            <div className="card" style={{ marginBottom: 20 }}>
              <h3 style={{ fontWeight: 700, fontSize: "1rem", color: "#0f172a", marginBottom: 16 }}>Current Plan</h3>
              <div style={{ background: tierBadge ? "linear-gradient(135deg, #fdf4ff, #f5f3ff)" : "#f8faff", border: `1.5px solid ${tierBadge ? "#d8b4fe" : "#e2e8f0"}`, borderRadius: 14, padding: "20px 24px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: "1.5rem" }}>{isAdvanced ? "⚡" : isPro ? "💎" : "🏥"}</span>
                  <p style={{ fontWeight: 700, fontSize: "1rem", color: "#0f172a" }}>{isAdvanced ? "Advanced Plan" : isPro ? "Pro Plan" : "Base Plan"}</p>
                </div>
                <p style={{ fontSize: "0.85rem", color: "#64748b" }}>
                  {isAdvanced ? "Unlimited spots · Unlimited outreach · Full profiles · Top Agency Status · API integration" :
                   isPro ? "2 spots/week · 2 outreach/week · Summarized CVs · Newsletter inclusion" :
                   "1 spot/week · No outreach · Summarized CVs · Passive leads only"}
                </p>
              </div>
            </div>

            {!isAdvanced && (
              <div style={{ background: "#fff", borderRadius: 20, border: "1px solid #e2e8f0", overflow: "hidden" }}>
                <div style={{ display: "grid", gridTemplateColumns: isBase ? "1fr 1fr" : "1fr", gap: 0 }}>
                  {/* PRO */}
                  {(isBase || isPro) && (
                    <div style={{ borderRight: isBase ? "1px solid #e2e8f0" : "none" }}>
                      <div style={{ background: "linear-gradient(135deg, #6d28d9, #4f46e5)", padding: "24px 28px" }}>
                        <div style={{ fontSize: "1.8rem", marginBottom: 8 }}>💎</div>
                        <h3 style={{ fontFamily: "Inter, sans-serif", fontSize: "1.3rem", color: "#fff", marginBottom: 4 }}>Pro</h3>
                        <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.82rem" }}>Grow your pipeline</p>
                      </div>
                      <div style={{ padding: "24px 28px" }}>
                        {["Everything in Base", "2 spots/week on doctor calendars", "2 outreach messages/week", "Agency visible in Registration Pathways", "Monthly newsletter inclusion", "Shift Booking Engine"].map((f, i) => (
                          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0", borderBottom: i < 5 ? "1px solid #f1f5f9" : "none" }}>
                            <span style={{ color: "#6d28d9" }}>✓</span>
                            <span style={{ fontSize: "0.82rem", color: "#374151" }}>{f}</span>
                          </div>
                        ))}
                        <div style={{ background: "#fdf4ff", border: "1.5px dashed #d8b4fe", borderRadius: 10, padding: "12px", textAlign: "center", margin: "16px 0 12px" }}>
                          <p style={{ fontSize: "0.72rem", fontWeight: 700, color: "#7c3aed" }}>💳 Coming Soon</p>
                        </div>
                        <button disabled style={{ width: "100%", background: "linear-gradient(135deg, #6d28d9, #4f46e5)", color: "#fff", border: "none", padding: "12px", borderRadius: 10, fontWeight: 700, fontSize: "0.85rem", cursor: "not-allowed", fontFamily: "Inter, sans-serif", opacity: 0.6 }}>Upgrade to Pro</button>
                      </div>
                    </div>
                  )}

                  {/* ADVANCED */}
                  <div>
                    <div style={{ background: "linear-gradient(135deg, #0f172a, #334155)", padding: "24px 28px" }}>
                      <div style={{ fontSize: "1.8rem", marginBottom: 8 }}>⚡</div>
                      <h3 style={{ fontFamily: "Inter, sans-serif", fontSize: "1.3rem", color: "#fff", marginBottom: 4 }}>Advanced</h3>
                      <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.82rem" }}>Full recruitment power</p>
                    </div>
                    <div style={{ padding: "24px 28px" }}>
                      {["Everything in Pro", "Unlimited spots posted weekly", "Full name access on doctor profiles", "Unlimited outreach messages", "Top Agency Status — pinned to top", "2x email blast campaigns/month", "Full API / CRM Integration"].map((f, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0", borderBottom: i < 6 ? "1px solid #f1f5f9" : "none" }}>
                          <span style={{ color: "#334155" }}>✓</span>
                          <span style={{ fontSize: "0.82rem", color: "#374151" }}>{f}</span>
                        </div>
                      ))}
                      <div style={{ background: "#f0f9ff", border: "1.5px dashed #bae6fd", borderRadius: 10, padding: "12px", textAlign: "center", margin: "16px 0 12px" }}>
                        <p style={{ fontSize: "0.72rem", fontWeight: 700, color: "#0369a1" }}>💳 Coming Soon</p>
                      </div>
                      <button disabled style={{ width: "100%", background: "linear-gradient(135deg, #0f172a, #334155)", color: "#fff", border: "none", padding: "12px", borderRadius: 10, fontWeight: 700, fontSize: "0.85rem", cursor: "not-allowed", fontFamily: "Inter, sans-serif", opacity: 0.6 }}>Upgrade to Advanced</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {isAdvanced && (
              <div className="card">
                <h3 style={{ fontWeight: 700, fontSize: "0.95rem", color: "#0f172a", marginBottom: 16 }}>Subscription Details</h3>
                <p style={{ fontSize: "0.85rem", color: "#64748b" }}>You are on the Advanced plan. Contact us to manage your subscription.</p>
              </div>
            )}
          </div>

      {/* BOTTOM NAV — Mobile/Tablet */}
      <div className="qm-bottom-nav">
        {([
          { key: "overview", label: "Home", icon: "⊞" },
          { key: "leads", label: "Leads", icon: "👨‍⚕️" },
          { key: "market", label: "Market", icon: "🔍" },
          { key: "vacancies", label: "Spots", icon: "📋" },
          { key: "documents", label: "Docs", icon: "📄" },
          { key: "billing", label: "Billing", icon: "💳" },
        ] as { key: "overview"|"leads"|"market"|"placed"|"invoices"|"vacancies"|"documents"|"billing"; label: string; icon: string }[]).map(item => (
          <button
            key={item.key}
            className={`qm-bottom-nav-item ${activeTab === item.key ? "active" : ""}`}
            onClick={() => changeTab(item.key)}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      {/* SUPPORT MODAL */}
      {showSupportModal && (
        <div className="modal-overlay qm-modal-overlay" onClick={() => setShowSupportModal(false)}>
          <div className="modal qm-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: "1.2rem", fontWeight: 700, color: "#0f172a" }}>💬 Contact Support</h2>
                <p style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: 2 }}>We usually reply within 24 hours</p>
              </div>
              <button onClick={() => setShowSupportModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: "1.2rem" }}>✕</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Subject</label>
                <select className="input-field" value={supportSubject} onChange={e => setSupportSubject(e.target.value)}>
                  <option value="">Select a topic</option>
                  <option value="Posting shifts">Posting shifts</option>
                  <option value="Doctor leads">Doctor leads</option>
                  <option value="Billing question">Billing question</option>
                  <option value="Account issue">Account issue</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Message *</label>
                <textarea
                  className="input-field"
                  rows={5}
                  placeholder="Describe your issue or question in detail..."
                  value={supportMessage}
                  onChange={e => setSupportMessage(e.target.value)}
                  style={{ resize: "vertical" }}
                />
              </div>
              <button
                className="qm-btn-primary"
                style={{ width: "100%", padding: "13px", borderRadius: 12 }}
                onClick={handleSendSupport}
                disabled={sendingSupport || !supportMessage.trim()}
              >
                {sendingSupport ? "Sending..." : "Send Message →"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING SUPPORT BUTTON */}
      <button
        onClick={() => setShowSupportModal(true)}
        style={{ position: "fixed", bottom: 80, right: 20, background: "linear-gradient(135deg, #1e293b, #334155)", color: "#fff", border: "none", borderRadius: 100, padding: "10px 18px", fontWeight: 600, fontSize: "0.82rem", cursor: "pointer", fontFamily: "inherit", boxShadow: "0 4px 16px rgba(51,65,85,0.3)", display: "flex", alignItems: "center", gap: 6, zIndex: 40 }}
      >
        💬 <span>Help</span>
      </button>
    </div>
  );
}