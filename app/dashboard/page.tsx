"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "../lib/supabase";
import { useRouter } from "next/navigation";

type Doctor = {
  full_name: string;
  email: string;
  grade: string | null;
  specialty: string | null;
  phone: string | null;
  gmc_number: string | null;
  preferred_location: string | null;
  tier: "basic" | "pro" | "advanced";
};

type Document = {
  id: string;
  file_name: string;
  folder: string;
  uploaded_at: string;
  storage_path: string;
};

type Expiry = {
  document_id: string;
  expiry_date: string;
};

type Shift = {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  type: "shift" | "availability";
  notes: string;
  agency_id: string | null;
  agency_name?: string;
};

type Agency = {
  id: string;
  agency_name: string;
  required_specialties: string | null;
  required_grades: string | null;
  pay_range: string | null;
  review_score: number | null;
  location_tags: string | null;
};

type ShareRequest = {
  id: string;
  document_id: string;
  agency_id: string;
  status: "pending" | "accepted" | "declined" | "revoked";
  agency_name?: string;
};

type Connection = {
  id: string;
  agency_id: string;
  doctor_id: string;
  status: "pending" | "accepted" | "declined";
  initiated_by: "doctor" | "agency";
  connected_at: string;
  agency_name?: string;
  agency_email?: string;
};

type Appraisal = {
  id: string;
  appraisal_date: string | null;
  next_review_date: string | null;
  appraiser_name: string | null;
  status: "pending" | "in_progress" | "completed";
  notes: string | null;
  created_at: string;
};

type InsuranceClaim = {
  id: string;
  claim_type: string | null;
  description: string | null;
  status: "open" | "in_progress" | "resolved" | "closed";
  amount: number | null;
  insurer_name: string | null;
  policy_number: string | null;
  incident_date: string | null;
  created_at: string;
};

type Vacancy = {
  id: string;
  agency_id: string;
  specialty: string;
  grade: string;
  location: string;
  vacancies: number;
  notes: string;
  active: boolean;
  created_at: string;
  agency_name?: string;
  pay_range?: string | null;
};

const FOLDERS = [
  { key: "cvs", label: "CVs", icon: "📋" },
  { key: "compliance", label: "Compliance", icon: "🔒" },
  { key: "tax", label: "Tax Documents", icon: "🧾" },
  { key: "appraisal", label: "Medical Appraisals", icon: "📝" },
  { key: "insurance", label: "Insurance", icon: "🛡️" },
];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const BMA_RATES = [
  { grade: "Consultant", rate: "£109,725 - £145,000", banding: "Standard" },
  { grade: "Registrar", rate: "£55,329 - £83,149", banding: "Standard" },
  { grade: "Middle Grade", rate: "£51,017 - £58,398", banding: "Standard" },
  { grade: "SHO", rate: "£40,257 - £53,398", banding: "Standard" },
  { grade: "Junior Doctor", rate: "£32,398 - £40,257", banding: "Standard" },
];

async function triggerEmail(type: string, data: Record<string, string | null | undefined>) {
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SUPABASE_ANON_KEY}` },
      body: JSON.stringify({ type, data }),
    });
  } catch (e) { console.error("Email trigger failed:", e); }
}

export default function DashboardPage() {
  const router = useRouter();
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [userId, setUserId] = useState<string>("");
  const [documents, setDocuments] = useState<Document[]>([]);
  const [expiries, setExpiries] = useState<Expiry[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [shareRequests, setShareRequests] = useState<ShareRequest[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [matchingAgencies, setMatchingAgencies] = useState<Agency[]>([]);
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [appraisals, setAppraisals] = useState<Appraisal[]>([]);
  const [insuranceClaims, setInsuranceClaims] = useState<InsuranceClaim[]>([]);
  const [chatLimitToday, setChatLimitToday] = useState(0);
  const [profileMatches, setProfileMatches] = useState<{ agency_id: string; agency_name: string; matched_at: string }[]>([]);
const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
const [availabilityDate, setAvailabilityDate] = useState(new Date().toISOString().split("T")[0]);
const [availabilityStart, setAvailabilityStart] = useState("09:00");
const [availabilityEnd, setAvailabilityEnd] = useState("17:00");
const [addingAvailability, setAddingAvailability] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview"|"workfeed"|"documents"|"calendar"|"agencies"|"appraisal"|"insurance"|"profile">("overview");
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<Partial<Doctor>>({});
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [filterAgencyId, setFilterAgencyId] = useState("");
  const [showUpgradePopup, setShowUpgradePopup] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState("");
  const [upgradeRequired, setUpgradeRequired] = useState<"pro"|"advanced">("pro");
  const [showUpgradePage, setShowUpgradePage] = useState(false);
  const [upgradeTarget, setUpgradeTarget] = useState<"pro"|"advanced">("pro");

  // Upload state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFolder, setUploadFolder] = useState("cvs");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadExpiry, setUploadExpiry] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Send state
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendingDoc, setSendingDoc] = useState<Document | null>(null);
  const [sendToAgencies, setSendToAgencies] = useState<string[]>([]);
  const [sending, setSending] = useState(false);

  // Chat state
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatAgency, setChatAgency] = useState<Agency | null>(null);
  const [chatMessage, setChatMessage] = useState("");
  const [sendingChat, setSendingChat] = useState(false);

  // Appraisal state
  const [showAppraisalModal, setShowAppraisalModal] = useState(false);
  const [newAppraisal, setNewAppraisal] = useState({ appraisal_date: "", next_review_date: "", appraiser_name: "", status: "pending", notes: "" });
  const [savingAppraisal, setSavingAppraisal] = useState(false);
  const appraisalFileRef = useRef<HTMLInputElement>(null);
  const [appraisalFile, setAppraisalFile] = useState<File | null>(null);

  // Insurance state
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [newClaim, setNewClaim] = useState({ claim_type: "", description: "", insurer_name: "", policy_number: "", incident_date: "", amount: "", status: "open" });
  const [savingClaim, setSavingClaim] = useState(false);
  const [showSupportForm, setShowSupportForm] = useState(false);
  const [supportMsg, setSupportMsg] = useState("");

  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [newShift, setNewShift] = useState({ type: "availability", start_time: "09:00", end_time: "17:00", agency_id: "", notes: "" });
  const [addingShift, setAddingShift] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUserId(user.id);

      const { data: doctorData } = await supabase.from("doctors").select("*").eq("user_id", user.id).single();
if (doctorData) {
  // Redirect to onboarding if not completed
  if (!doctorData.onboarding_completed) {
    router.push("/onboarding");
    return;
  }
  setDoctor(doctorData);
  setEditData(doctorData);
} else {
  // No doctor record yet — send to onboarding
  router.push("/onboarding");
  return;
}

      const { data: docs } = await supabase.from("documents").select("*").eq("user_id", user.id).order("uploaded_at", { ascending: false });
      if (docs) setDocuments(docs);

      const { data: exp } = await supabase.from("document_expiry").select("*").eq("doctor_id", user.id);
      if (exp) setExpiries(exp);

      const { data: agencyLinks } = await supabase
        .from("doctor_agencies")
        .select("agency_id, agencies(id, agency_name, required_specialties, required_grades, pay_range, review_score, location_tags)")
        .eq("doctor_id", user.id)
        .eq("status", "accepted");
      if (agencyLinks) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
const ag = agencyLinks.map((l: any) => l.agencies).filter(Boolean) as Agency[];
        setAgencies(ag);
      }

      const { data: allConns } = await supabase
        .from("doctor_agencies")
        .select("*, agencies(agency_name, contact_email)")
        .eq("doctor_id", user.id);
      if (allConns) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mapped = allConns.map((c: any) => ({
          ...c,
          agency_name: Array.isArray(c.agencies) ? c.agencies[0]?.agency_name : c.agencies?.agency_name,
          agency_email: Array.isArray(c.agencies) ? c.agencies[0]?.contact_email : c.agencies?.contact_email,
        }));
        setConnections(mapped);
      }

      const { data: sh } = await supabase.from("shifts").select("*").eq("doctor_id", user.id).order("date", { ascending: true });
      if (sh) setShifts(sh);

      const { data: shares } = await supabase.from("document_share_requests").select("*, agencies(agency_name)").eq("doctor_id", user.id);
      if (shares) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mapped = shares.map((s: any) => ({
          ...s,
          agency_name: Array.isArray(s.agencies) ? s.agencies[0]?.agency_name : s.agencies?.agency_name,
        }));
        setShareRequests(mapped);
      }

      if (doctorData) {
        const { data: allAgencies } = await supabase.from("agencies").select("id, agency_name, required_specialties, required_grades, pay_range, review_score, location_tags");
        if (allAgencies && doctorData.specialty && doctorData.grade) {
          const matched = allAgencies.filter((ag: Agency) => {
            const specialties = ag.required_specialties?.split(",").map((s: string) => s.trim().toLowerCase()) || [];
            const grades = ag.required_grades?.split(",").map((g: string) => g.trim().toLowerCase()) || [];
            const doctorSpecialty = doctorData.specialty?.toLowerCase() || "";
            const doctorGrade = doctorData.grade?.toLowerCase() || "";
            const specialtyMatch = specialties.length === 0 || specialties.some((s: string) => doctorSpecialty.includes(s) || s.includes(doctorSpecialty));
            const gradeMatch = grades.length === 0 || grades.some((g: string) => doctorGrade.includes(g) || g.includes(doctorGrade));
            return specialtyMatch && gradeMatch;
          });
          setMatchingAgencies(matched);
        }

        // Load vacancies for matching agencies
        const { data: vacs } = await supabase
          .from("vacancy_posts")
          .select("*, agencies(agency_name, pay_range)")
          .eq("active", true)
          .order("created_at", { ascending: false });
        if (vacs && doctorData.specialty && doctorData.grade) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const filtered = vacs.filter((v: any) => {
            const specMatch = !v.specialty || v.specialty.toLowerCase().includes(doctorData.specialty?.toLowerCase() || "") || doctorData.specialty?.toLowerCase().includes(v.specialty.toLowerCase());
            const gradeMatch = !v.grade || v.grade.toLowerCase().includes(doctorData.grade?.toLowerCase() || "") || doctorData.grade?.toLowerCase().includes(v.grade.toLowerCase());
            return specMatch && gradeMatch;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          }).map((v: any) => ({
            ...v,
            agency_name: Array.isArray(v.agencies) ? v.agencies[0]?.agency_name : v.agencies?.agency_name,
            pay_range: Array.isArray(v.agencies) ? v.agencies[0]?.pay_range : v.agencies?.pay_range,
          }));
          setVacancies(filtered);
        }
      }

      const { data: appr } = await supabase.from("appraisals").select("*").eq("doctor_id", user.id).order("created_at", { ascending: false });
      if (appr) setAppraisals(appr);

      const { data: claims } = await supabase.from("insurance_claims").select("*").eq("doctor_id", user.id).order("created_at", { ascending: false });
      if (claims) setInsuranceClaims(claims);

      // Load today's chat count
      const todayStr = new Date().toISOString().split("T")[0];
      const { data: chatLimit } = await supabase.from("doctor_chat_limits").select("count").eq("doctor_id", user.id).eq("chat_date", todayStr).single();
      if (chatLimit) setChatLimitToday(chatLimit.count);

      // Load profile matches
const { data: matches } = await supabase
  .from("profile_matches")
  .select("agency_id, matched_at, agencies(agency_name)")
  .eq("doctor_id", user.id)
  .order("matched_at", { ascending: false });
if (matches) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapped = matches.map((m: any) => ({
    agency_id: m.agency_id,
    agency_name: Array.isArray(m.agencies) ? m.agencies[0]?.agency_name : m.agencies?.agency_name,
    matched_at: m.matched_at,
  }));
  setProfileMatches(mapped);
}
      setLoading(false);
    };
    init();
  }, [router]);

  const handleSignOut = async () => { await supabase.auth.signOut(); router.push("/"); };

  const tier = doctor?.tier || "basic";
  const isBase = tier === "basic";
  const isPro = tier === "pro" || tier === "advanced";
  const isAdvanced = tier === "advanced";

  const handleUpgradeClick = (featureName: string, required: "pro" | "advanced") => {
    if (required === "pro" && (isPro || isAdvanced)) return false;
    if (required === "advanced" && isAdvanced) return false;
    setUpgradeFeature(featureName);
    setUpgradeRequired(required);
    setShowUpgradePopup(true);
    return true;
  };

  const canChat = isPro || isAdvanced;
  const chatLimitReached = isPro && !isAdvanced && chatLimitToday >= 2;

  const handleSendChat = async () => {
    if (!chatAgency || !chatMessage.trim()) return;
    setSendingChat(true);

    await supabase.from("doctor_messages").insert({
      sender_id: userId,
      receiver_agency_id: chatAgency.id,
      message: chatMessage,
    });

    if (isPro && !isAdvanced) {
      const todayStr = new Date().toISOString().split("T")[0];
      await supabase.from("doctor_chat_limits").upsert({
        doctor_id: userId,
        chat_date: todayStr,
        count: chatLimitToday + 1,
      }, { onConflict: "doctor_id,chat_date" });
      setChatLimitToday(prev => prev + 1);
    }

    setSendingChat(false);
    setShowChatModal(false);
    setChatMessage("");
    setSaveMsg("Message sent!");
    setTimeout(() => setSaveMsg(""), 3000);
  };

  const handleGrabVacancy = async (vacancyId: string) => {
    if (!isAdvanced) { handleUpgradeClick("Instant Grab", "advanced"); return; }
    const { error } = await supabase.from("vacancy_grabs").insert({ doctor_id: userId, vacancy_id: vacancyId, status: "pending" });
    if (!error) { setSaveMsg("Vacancy grabbed! Agency will be notified."); setTimeout(() => setSaveMsg(""), 3000); }
  };

  const handleSendConnectionRequest = async (agencyId: string) => {
    if (isBase) { handleUpgradeClick("Proactive Agency Connection", "pro"); return; }
    const { data, error } = await supabase.from("doctor_agencies").insert({
      doctor_id: userId, agency_id: agencyId, status: "pending", initiated_by: "doctor", connected_at: new Date().toISOString(),
    }).select("*, agencies(agency_name, contact_email)").single();
    if (!error && data) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const d = data as any;
      const agencyInfo = Array.isArray(d.agencies) ? d.agencies[0] : d.agencies;
      setConnections(prev => [...prev, { ...d, agency_name: agencyInfo?.agency_name, agency_email: agencyInfo?.contact_email }]);
      await triggerEmail("connection_request", { agency_email: agencyInfo?.contact_email, agency_name: agencyInfo?.agency_name, doctor_name: doctor?.full_name, doctor_specialty: doctor?.specialty, doctor_grade: doctor?.grade });
      setSaveMsg("Connection request sent!");
      setTimeout(() => setSaveMsg(""), 3000);
    }
  };

  const handleAcceptConnection = async (connId: string, agencyId: string) => {
    await supabase.from("doctor_agencies").update({ status: "accepted", responded_at: new Date().toISOString() }).eq("id", connId);
    setConnections(prev => prev.map(c => c.id === connId ? { ...c, status: "accepted" } : c));
    const conn = connections.find(c => c.id === connId);
    if (conn) setAgencies(prev => [...prev, { id: agencyId, agency_name: conn.agency_name || "", required_specialties: null, required_grades: null, pay_range: null, review_score: null, location_tags: null }]);
    setSaveMsg("Connection accepted!");
    setTimeout(() => setSaveMsg(""), 3000);
  };

  const handleDeclineConnection = async (connId: string) => {
    await supabase.from("doctor_agencies").update({ status: "declined", responded_at: new Date().toISOString() }).eq("id", connId);
    setConnections(prev => prev.map(c => c.id === connId ? { ...c, status: "declined" } : c));
  };

  const handleDisconnect = async (connId: string, agencyId: string) => {
    await supabase.from("doctor_agencies").delete().eq("id", connId);
    setConnections(prev => prev.filter(c => c.id !== connId));
    setAgencies(prev => prev.filter(a => a.id !== agencyId));
    setSaveMsg("Disconnected.");
    setTimeout(() => setSaveMsg(""), 2500);
  };

  const getConnectionStatus = (agencyId: string) => connections.find(c => c.agency_id === agencyId);

  const handleUpload = async () => {
    if (!uploadFile) { setUploadError("Please select a file."); return; }
    setUploading(true);
    setUploadError("");
    const filePath = `${userId}/${uploadFolder}/${Date.now()}_${uploadFile.name}`;
    const { error: storageError } = await supabase.storage.from("doctor-documents").upload(filePath, uploadFile);
    if (storageError) { setUploadError(storageError.message); setUploading(false); return; }
    const { data: docData, error: dbError } = await supabase.from("documents").insert({ user_id: userId, file_name: uploadFile.name, folder: uploadFolder, storage_path: filePath }).select().single();
    if (dbError) { setUploadError(dbError.message); setUploading(false); return; }
    if (uploadExpiry && docData) {
      await supabase.from("document_expiry").insert({ document_id: docData.id, doctor_id: userId, expiry_date: uploadExpiry });
      setExpiries(prev => [...prev, { document_id: docData.id, expiry_date: uploadExpiry }]);
    }
    setDocuments(prev => [docData, ...prev]);
    setUploading(false);
    setShowUploadModal(false);
    setUploadFile(null);
    setUploadExpiry("");
    setUploadFolder("cvs");
    setSaveMsg("Document uploaded!");
    setTimeout(() => setSaveMsg(""), 3000);
  };

  const handleDownload = async (doc: Document) => {
    const { data } = await supabase.storage.from("doctor-documents").createSignedUrl(doc.storage_path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  const handleDeleteDoc = async (doc: Document) => {
    await supabase.storage.from("doctor-documents").remove([doc.storage_path]);
    await supabase.from("document_expiry").delete().eq("document_id", doc.id);
    await supabase.from("document_share_requests").delete().eq("document_id", doc.id);
    await supabase.from("documents").delete().eq("id", doc.id);
    setDocuments(prev => prev.filter(d => d.id !== doc.id));
    setExpiries(prev => prev.filter(e => e.document_id !== doc.id));
    setShareRequests(prev => prev.filter(s => s.document_id !== doc.id));
  };

  const openSendModal = (doc: Document) => { setSendingDoc(doc); setSendToAgencies([]); setShowSendModal(true); };

  const handleSendDocument = async () => {
    if (!sendingDoc || sendToAgencies.length === 0) return;
    setSending(true);
    for (const agencyId of sendToAgencies) {
      const existing = shareRequests.find(s => s.document_id === sendingDoc.id && s.agency_id === agencyId && s.status !== "revoked");
      if (existing) continue;
      const { data } = await supabase.from("document_share_requests").upsert({
        document_id: sendingDoc.id, doctor_id: userId, agency_id: agencyId, status: "pending", requested_at: new Date().toISOString(),
      }, { onConflict: "document_id,agency_id" }).select("*, agencies(agency_name, contact_email)").single();
      if (data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const d = data as any;
        const agencyInfo = Array.isArray(d.agencies) ? d.agencies[0] : d.agencies;
        setShareRequests(prev => { const filtered = prev.filter(s => !(s.document_id === sendingDoc.id && s.agency_id === agencyId)); return [...filtered, { ...d, agency_name: agencyInfo?.agency_name } as ShareRequest]; });
        await triggerEmail("document_share", { agency_email: agencyInfo?.contact_email, agency_name: agencyInfo?.agency_name, doctor_name: doctor?.full_name, file_name: sendingDoc.file_name });
      }
    }
    setSending(false);
    setShowSendModal(false);
    setSendToAgencies([]);
    setSaveMsg(`Document sent to ${sendToAgencies.length} agency${sendToAgencies.length > 1 ? "s" : ""}!`);
    setTimeout(() => setSaveMsg(""), 3000);
  };

  const handleRevokeShare = async (shareId: string) => {
    await supabase.from("document_share_requests").update({ status: "revoked" }).eq("id", shareId);
    setShareRequests(prev => prev.map(s => s.id === shareId ? { ...s, status: "revoked" } : s));
    setSaveMsg("Access revoked.");
    setTimeout(() => setSaveMsg(""), 2500);
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    const { error } = await supabase.from("doctors").update(editData).eq("user_id", userId);
    if (!error) { setDoctor({ ...doctor, ...editData } as Doctor); setEditMode(false); setSaveMsg("Profile saved!"); setTimeout(() => setSaveMsg(""), 3000); }
    setSaving(false);
  };

  const handleAddAvailability = async () => {
  if (!availabilityDate) return;
  setAddingAvailability(true);
  const { data, error } = await supabase.from("shifts").insert({
    doctor_id: userId,
    date: availabilityDate,
    start_time: availabilityStart,
    end_time: availabilityEnd,
    type: "availability",
    notes: "Available for locum",
  }).select().single();
  if (!error && data) {
    setShifts(prev => [...prev, data]);
    setSaveMsg("Availability added!");
    setTimeout(() => setSaveMsg(""), 3000);
  }
  setAddingAvailability(false);
  setShowAvailabilityModal(false);
};
const handleExportCalendar = () => {
  const upcomingShifts = shifts.filter(s => s.type === "shift");
  if (upcomingShifts.length === 0) {
    setSaveMsg("No shifts to export yet.");
    setTimeout(() => setSaveMsg(""), 3000);
    return;
  }

  const icsLines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Quiet//Quiet Medical//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  upcomingShifts.forEach(shift => {
    const dateStr = shift.date.replace(/-/g, "");
    const startTime = shift.start_time?.replace(":", "") || "0900";
    const endTime = shift.end_time?.replace(":", "") || "1700";
    const uid = `${shift.id}@quiet.medical`;
    const summary = shift.agency_name ? `Locum Shift — ${shift.agency_name}` : "Locum Shift";

    icsLines.push("BEGIN:VEVENT");
    icsLines.push(`UID:${uid}`);
    icsLines.push(`DTSTART:${dateStr}T${startTime}00`);
    icsLines.push(`DTEND:${dateStr}T${endTime}00`);
    icsLines.push(`SUMMARY:${summary}`);
    icsLines.push(`DESCRIPTION:Logged via Quiet — quietmedical.co.uk`);
    icsLines.push("END:VEVENT");
  });

  // Add availability
  shifts.filter(s => s.type === "availability").forEach(shift => {
    const dateStr = shift.date.replace(/-/g, "");
    const startTime = shift.start_time?.replace(":", "") || "0900";
    const endTime = shift.end_time?.replace(":", "") || "1700";
    icsLines.push("BEGIN:VEVENT");
    icsLines.push(`UID:avail-${shift.id}@quiet.medical`);
    icsLines.push(`DTSTART:${dateStr}T${startTime}00`);
    icsLines.push(`DTEND:${dateStr}T${endTime}00`);
    icsLines.push("SUMMARY:Available for Locum");
    icsLines.push("DESCRIPTION:Availability logged via Quiet");
    icsLines.push("END:VEVENT");
  });

  icsLines.push("END:VCALENDAR");

  const blob = new Blob([icsLines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "quiet-shifts.ics";
  a.click();
  URL.revokeObjectURL(url);
  setSaveMsg("Calendar exported! Open the file to import into Google, Apple or Outlook.");
  setTimeout(() => setSaveMsg(""), 5000);
};

const handleSyncGoogleCalendar = (shift: Shift) => {
  const dateStr = shift.date.replace(/-/g, "");
  const startTime = shift.start_time?.replace(":", "") || "0900";
  const endTime = shift.end_time?.replace(":", "") || "1700";
  const title = encodeURIComponent(shift.type === "availability" ? "Available for Locum — Quiet" : `Locum Shift${shift.agency_name ? ` — ${shift.agency_name}` : ""}`);
  const details = encodeURIComponent("Logged via Quiet — quietmedical.co.uk");
  const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dateStr}T${startTime}00/${dateStr}T${endTime}00&details=${details}`;
  window.open(url, "_blank");
};  
const handleAddShift = async () => {
    if (!selectedDate) return;
    setAddingShift(true);
    const { data, error } = await supabase.from("shifts").insert({
      doctor_id: userId, date: selectedDate, start_time: newShift.start_time, end_time: newShift.end_time, type: newShift.type, agency_id: newShift.agency_id || null, notes: newShift.notes,
    }).select().single();
    if (!error && data) { const agencyName = agencies.find(a => a.id === newShift.agency_id)?.agency_name; setShifts(prev => [...prev, { ...data, agency_name: agencyName }]); }
    setAddingShift(false);
    setShowShiftModal(false);
    setNewShift({ type: "availability", start_time: "09:00", end_time: "17:00", agency_id: "", notes: "" });
  };

  const handleSaveAppraisal = async () => {
    setSavingAppraisal(true);
    const { data, error } = await supabase.from("appraisals").insert({
      doctor_id: userId, appraisal_date: newAppraisal.appraisal_date || null, next_review_date: newAppraisal.next_review_date || null, appraiser_name: newAppraisal.appraiser_name || null, status: newAppraisal.status, notes: newAppraisal.notes || null,
    }).select().single();
    if (!error && data) {
      setAppraisals(prev => [data, ...prev]);
      if (appraisalFile) {
        const filePath = `${userId}/appraisal/${Date.now()}_${appraisalFile.name}`;
        await supabase.storage.from("doctor-documents").upload(filePath, appraisalFile);
        const { data: docData } = await supabase.from("documents").insert({ user_id: userId, file_name: appraisalFile.name, folder: "appraisal", storage_path: filePath }).select().single();
        if (docData) setDocuments(prev => [docData, ...prev]);
      }
      setSaveMsg("Appraisal saved!");
      setTimeout(() => setSaveMsg(""), 3000);
    }
    setSavingAppraisal(false);
    setShowAppraisalModal(false);
    setNewAppraisal({ appraisal_date: "", next_review_date: "", appraiser_name: "", status: "pending", notes: "" });
    setAppraisalFile(null);
  };

  const handleSaveClaim = async () => {
    setSavingClaim(true);
    const { data, error } = await supabase.from("insurance_claims").insert({
      doctor_id: userId, claim_type: newClaim.claim_type || null, description: newClaim.description || null, insurer_name: newClaim.insurer_name || null, policy_number: newClaim.policy_number || null, incident_date: newClaim.incident_date || null, amount: newClaim.amount ? parseFloat(newClaim.amount) : null, status: newClaim.status,
    }).select().single();
    if (!error && data) { setInsuranceClaims(prev => [data, ...prev]); setSaveMsg("Claim logged!"); setTimeout(() => setSaveMsg(""), 3000); }
    setSavingClaim(false);
    setShowClaimModal(false);
    setNewClaim({ claim_type: "", description: "", insurer_name: "", policy_number: "", incident_date: "", amount: "", status: "open" });
  };

  const folderDocs = (folder: string) => documents.filter(d => d.folder === folder);
  const getExpiryForDoc = (docId: string) => expiries.find(e => e.document_id === docId);
  const getSharesForDoc = (docId: string) => shareRequests.filter(s => s.document_id === docId && s.status !== "revoked");

  const getExpiryAlerts = () => {
    const alerts: { file_name: string; days: number; urgent: boolean }[] = [];
    expiries.forEach(exp => {
      const doc = documents.find(d => d.id === exp.document_id);
      if (!doc) return;
      const days = Math.ceil((new Date(exp.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (days <= 30) alerts.push({ file_name: doc.file_name, days, urgent: days <= 7 });
    });
    return alerts.sort((a, b) => a.days - b.days);
  };

  const getShiftsForDate = (dateStr: string) => shifts.filter(s => s.date === dateStr);
  const getVacanciesForDate = (dateStr: string) => vacancies.filter(v => {
    const vDate = new Date(v.created_at).toISOString().split("T")[0];
    return vDate === dateStr;
  });
  const getMonthShifts = (agencyId = "") => shifts.filter(s => { const d = new Date(s.date); return d.getFullYear() === calYear && d.getMonth() === calMonth && s.type === "shift" && (agencyId === "" || s.agency_id === agencyId); });
  const calcHours = (shiftList: Shift[]) => shiftList.reduce((total, s) => { if (!s.start_time || !s.end_time) return total; const [sh, sm] = s.start_time.split(":").map(Number); const [eh, em] = s.end_time.split(":").map(Number); return total + ((eh * 60 + em) - (sh * 60 + sm)) / 60; }, 0);
  const getMonthHours = (agencyId = "") => calcHours(getMonthShifts(agencyId));
  const getYearHours = (agencyId = "") => calcHours(shifts.filter(s => new Date(s.date).getFullYear() === calYear && s.type === "shift" && (agencyId === "" || s.agency_id === agencyId)));
  const getUpcomingShifts = () => { const todayStr = today.toISOString().split("T")[0]; return shifts.filter(s => s.date >= todayStr && s.type === "shift").slice(0, 5); };

  const firstName = doctor?.full_name?.split(" ").find(w => !["dr", "dr."].includes(w.toLowerCase())) || doctor?.full_name || "Doctor";
  const initials = doctor?.full_name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "DR";
  const alerts = isPro ? getExpiryAlerts() : [];
  const daysInMonth = getDaysInMonth(calYear, calMonth);
  const firstDay = getFirstDayOfMonth(calYear, calMonth);
  const pendingIncomingConnections = connections.filter(c => c.status === "pending" && c.initiated_by === "agency");

  const getTierBadge = () => {
    if (isAdvanced) return { label: "⚡ ADVANCED", bg: "linear-gradient(135deg, #0f172a, #334155)" };
    if (isPro) return { label: "💎 PRO", bg: "linear-gradient(135deg, #6d28d9, #4f46e5)" };
    return null;
  };
  const tierBadge = getTierBadge();

  const getStatusColor = (status: string) => {
    const map: Record<string, { bg: string; color: string }> = {
      pending: { bg: "#fffbeb", color: "#92400e" },
      in_progress: { bg: "#f5f3ff", color: "#334155" },
      completed: { bg: "#f0fdf4", color: "#16a34a" },
      open: { bg: "#fff1f2", color: "#dc2626" },
      resolved: { bg: "#f0fdf4", color: "#16a34a" },
      closed: { bg: "#f1f5f9", color: "#64748b" },
    };
    return map[status] || { bg: "#f1f5f9", color: "#64748b" };
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#f8faff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter, sans-serif" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 40, height: 40, border: "3px solid #e0eaff", borderTop: "3px solid #334155", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
        <p style={{ color: "#94a3b8", fontSize: "0.9rem" }}>Loading your dashboard...</p>
      </div>
    </div>
  );

  if (showUpgradePage) return (
    <div style={{ minHeight: "100vh", background: "#f8faff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter, sans-serif", padding: 24 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'); * { box-sizing: border-box; margin: 0; padding: 0; }`}</style>
      <div style={{ width: "100%", maxWidth: 600 }}>
        <button onClick={() => setShowUpgradePage(false)} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontFamily: "Inter, sans-serif", fontSize: "0.88rem", marginBottom: 24, display: "flex", alignItems: "center", gap: 6 }}>← Back to dashboard</button>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {/* PRO */}
          <div style={{ background: "#fff", borderRadius: 24, border: upgradeTarget === "pro" ? "2px solid #6d28d9" : "1px solid #e2e8f0", overflow: "hidden" }}>
            <div style={{ background: "linear-gradient(135deg, #6d28d9, #4f46e5)", padding: "28px 24px", textAlign: "center" }}>
              <div style={{ fontSize: "2rem", marginBottom: 8 }}>💎</div>
              <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: "1.4rem", color: "#fff", marginBottom: 4 }}>Pro</h2>
              <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.85rem" }}>Full control over your locum career</p>
            </div>
            <div style={{ padding: "20px 24px" }}>
              {["Full Work Feed", "Proactive Chat (2/day)", "Live Vacancy Calendar", "Smart Expiry Alerts", "BMA Rate Benchmarking", "Agency Reviews", "Medical Appraisal Tracking"].map((f, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0", borderBottom: i < 6 ? "1px solid #f1f5f9" : "none" }}>
                  <span style={{ color: "#6d28d9" }}>✓</span>
                  <span style={{ fontSize: "0.85rem", color: "#374151" }}>{f}</span>
                </div>
              ))}
              <div style={{ background: "#fdf4ff", border: "1.5px dashed #d8b4fe", borderRadius: 10, padding: "14px", textAlign: "center", margin: "16px 0 12px" }}>
                <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "#7c3aed", marginBottom: 4 }}>💳 Coming Soon</p>
                <p style={{ fontSize: "0.78rem", color: "#64748b" }}>Stripe payment coming</p>
              </div>
              <button disabled style={{ width: "100%", background: "linear-gradient(135deg, #6d28d9, #4f46e5)", color: "#fff", border: "none", padding: "12px", borderRadius: 10, fontWeight: 700, fontSize: "0.88rem", cursor: "not-allowed", fontFamily: "Inter, sans-serif", opacity: 0.6 }}>Upgrade to Pro</button>
            </div>
          </div>

          {/* ADVANCED */}
          <div style={{ background: "#fff", borderRadius: 24, border: upgradeTarget === "advanced" ? "2px solid #334155" : "1px solid #e2e8f0", overflow: "hidden" }}>
            <div style={{ background: "linear-gradient(135deg, #0f172a, #334155)", padding: "28px 24px", textAlign: "center" }}>
              <div style={{ fontSize: "2rem", marginBottom: 8 }}>⚡</div>
              <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: "1.4rem", color: "#fff", marginBottom: 4 }}>Advanced</h2>
              <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.85rem" }}>Priority access & unlimited reach</p>
            </div>
            <div style={{ padding: "20px 24px" }}>
              {["Everything in Pro", "Priority Feed & Top of List", "Unlimited Chat", "Instant Grab", "Universal Passport", "Recruiter SLA (24hr)", "Designated Body / RO Link"].map((f, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0", borderBottom: i < 6 ? "1px solid #f1f5f9" : "none" }}>
                  <span style={{ color: "#334155" }}>✓</span>
                  <span style={{ fontSize: "0.85rem", color: "#374151" }}>{f}</span>
                </div>
              ))}
              <div style={{ background: "#f0f9ff", border: "1.5px dashed #bae6fd", borderRadius: 10, padding: "14px", textAlign: "center", margin: "16px 0 12px" }}>
                <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "#0369a1", marginBottom: 4 }}>💳 Coming Soon</p>
                <p style={{ fontSize: "0.78rem", color: "#64748b" }}>Stripe payment coming</p>
              </div>
              <button disabled style={{ width: "100%", background: "linear-gradient(135deg, #0f172a, #334155)", color: "#fff", border: "none", padding: "12px", borderRadius: 10, fontWeight: 700, fontSize: "0.88rem", cursor: "not-allowed", fontFamily: "Inter, sans-serif", opacity: 0.6 }}>Upgrade to Advanced</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f8f9fc", fontFamily: "Inter, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .sidebar-link { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-radius: 10px; font-size: 0.9rem; font-weight: 500; color: #64748b; cursor: pointer; transition: all 0.15s; border: none; background: none; width: 100%; text-align: left; font-family: Inter, sans-serif; }
        .sidebar-link:hover { background: #f5f3ff; color: #334155; }
        .sidebar-link.active { background: #334155; color: #fff; }
        .card { background: #fff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 24px; }
        .input-field { width: 100%; padding: 10px 14px; border: 1.5px solid #e0eaff; border-radius: 10px; font-size: 0.9rem; color: #0f172a; background: #fff; outline: none; font-family: Inter, sans-serif; transition: border-color 0.2s; }
        .input-field:focus { border-color: #334155; }
        .btn-blue { background: #334155; color: #fff; border: none; padding: 10px 20px; border-radius: 10px; font-weight: 600; font-size: 0.88rem; cursor: pointer; font-family: Inter, sans-serif; transition: background 0.2s; }
        .btn-blue:hover { opacity: 0.9; }
        .btn-blue:disabled { opacity: 0.6; cursor: not-allowed; }
        .btn-ghost { background: #fff; color: #334155; border: 1.5px solid #ddd6fe; padding: 10px 20px; border-radius: 10px; font-weight: 600; font-size: 0.88rem; cursor: pointer; font-family: Inter, sans-serif; transition: background 0.2s; }
        .btn-ghost:hover { background: #f5f3ff; }
        .btn-advanced { background: linear-gradient(135deg, #0f172a, #334155); color: #fff; border: none; padding: 10px 20px; border-radius: 10px; font-weight: 600; font-size: 0.88rem; cursor: pointer; font-family: Inter, sans-serif; }
        .doc-row { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; border-radius: 12px; background: #f8faff; border: 1px solid #e2e8f0; margin-bottom: 10px; transition: box-shadow 0.15s; }
        .doc-row:hover { box-shadow: 0 4px 12px rgba(29,78,216,0.08); }
        .cal-day { min-height: 72px; border-radius: 10px; padding: 6px; cursor: pointer; transition: background 0.15s; border: 1.5px solid transparent; }
        .cal-day:hover { background: #f5f3ff; border-color: #ddd6fe; }
        .cal-day.today { border-color: #334155; background: #f5f3ff; }
        .cal-day.selected { background: #334155 !important; border-color: #334155; }
        .cal-day.selected span { color: #fff !important; }
        .shift-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; margin: 1px; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        .fade-up { animation: fadeUp 0.5s ease both; }
        .fade-up-2 { animation: fadeUp 0.5s 0.08s ease both; }
        .fade-up-3 { animation: fadeUp 0.5s 0.16s ease both; }
        .modal-overlay { position: fixed; inset: 0; background: rgba(15,23,42,0.4); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 24px; }
        .modal { background: #fff; border-radius: 20px; padding: 28px; width: 100%; max-width: 480px; max-height: 90vh; overflow-y: auto; }
        label { display: block; font-size: 0.78rem; font-weight: 600; color: #64748b; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.06em; }
        @keyframes popIn { from { opacity: 0; transform: scale(0.85) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        .upgrade-popup { animation: popIn 0.2s ease both; }
        .upload-zone { border: 2px dashed #ddd6fe; border-radius: 12px; padding: 28px; text-align: center; cursor: pointer; transition: all 0.2s; background: #f8faff; }
        .upload-zone:hover { border-color: #334155; background: #f5f3ff; }
        .upload-zone.has-file { border-color: #22c55e; background: #f0fdf4; }
        .agency-select-row { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; border-radius: 10px; border: 1.5px solid #e0eaff; margin-bottom: 8px; cursor: pointer; transition: all 0.15s; }
        .agency-select-row:hover { border-color: #334155; background: #f8faff; }
        .agency-select-row.selected { border-color: #334155; background: #f5f3ff; }
        .agency-card { background: #f8faff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 18px 20px; transition: box-shadow 0.15s; margin-bottom: 12px; }
        .agency-card:hover { box-shadow: 0 4px 16px rgba(29,78,216,0.08); }
        .vacancy-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 18px 20px; margin-bottom: 12px; transition: box-shadow 0.15s; }
        .vacancy-card:hover { box-shadow: 0 4px 16px rgba(29,78,216,0.08); }
        .claim-card { background: #f8faff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 18px 20px; margin-bottom: 12px; }
        @media (max-width: 768px) { .sidebar { display: none !important; } .main-content { margin-left: 0 !important; } }
      `}</style>

      {/* UPGRADE POPUP */}
      {showUpgradePopup && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }} onClick={() => setShowUpgradePopup(false)}>
          <div className="upgrade-popup" style={{ background: "#fff", borderRadius: 20, padding: "28px 32px", maxWidth: 400, width: "100%", border: `2px solid ${upgradeRequired === "advanced" ? "#334155" : "#d8b4fe"}`, boxShadow: "0 20px 60px rgba(0,0,0,0.15)", textAlign: "center" }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: "2.2rem", marginBottom: 12 }}>{upgradeRequired === "advanced" ? "⚡" : "💎"}</div>
            <h3 style={{ fontFamily: "Inter, sans-serif", fontSize: "1.3rem", color: "#0f172a", marginBottom: 8 }}>{upgradeRequired === "advanced" ? "Advanced" : "Pro"} Feature</h3>
            <p style={{ fontSize: "0.88rem", color: "#64748b", marginBottom: 20 }}><strong style={{ color: upgradeRequired === "advanced" ? "#334155" : "#7c3aed" }}>{upgradeFeature}</strong> requires the {upgradeRequired === "advanced" ? "Advanced" : "Pro"} plan.</p>
            <button onClick={() => { setShowUpgradePopup(false); setUpgradeTarget(upgradeRequired); setShowUpgradePage(true); }} style={{ width: "100%", background: upgradeRequired === "advanced" ? "linear-gradient(135deg, #0f172a, #334155)" : "linear-gradient(135deg, #6d28d9, #4f46e5)", color: "#fff", border: "none", padding: "12px", borderRadius: 10, fontWeight: 700, fontSize: "0.9rem", cursor: "pointer", fontFamily: "Inter, sans-serif", marginBottom: 10 }}>
              {upgradeRequired === "advanced" ? "⚡ Upgrade to Advanced" : "💎 Upgrade to Pro"}
            </button>
            <button onClick={() => setShowUpgradePopup(false)} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "0.85rem", cursor: "pointer", fontFamily: "Inter, sans-serif" }}>Maybe later</button>
          </div>
        </div>
      )}

      {/* UPLOAD MODAL */}
      {showUploadModal && (
        <div className="modal-overlay qm-modal-overlay" onClick={() => setShowUploadModal(false)}>
          <div className="modal qm-modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: "1.2rem", color: "#0f172a" }}>Upload Document</h2>
              <button onClick={() => setShowUploadModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: "1.2rem" }}>✕</button>
            </div>
            {uploadError && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", padding: "10px 14px", borderRadius: 10, fontSize: "0.85rem", marginBottom: 16 }}>{uploadError}</div>}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div><label>Folder</label><select className="input-field" value={uploadFolder} onChange={e => setUploadFolder(e.target.value)}>{FOLDERS.map(f => <option key={f.key} value={f.key}>{f.icon} {f.label}</option>)}</select></div>
              <div>
                <label>File</label>
                <div className={`upload-zone ${uploadFile ? "has-file" : ""}`} onClick={() => fileInputRef.current?.click()}>
                  <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" style={{ display: "none" }} onChange={e => { const file = e.target.files?.[0]; if (file) setUploadFile(file); }} />
                  {uploadFile ? <div><div style={{ fontSize: "1.8rem", marginBottom: 8 }}>✅</div><p style={{ fontWeight: 600, fontSize: "0.9rem", color: "#16a34a" }}>{uploadFile.name}</p><p style={{ fontSize: "0.78rem", color: "#64748b", marginTop: 4 }}>{(uploadFile.size / 1024).toFixed(0)} KB</p></div>
                  : <div><div style={{ fontSize: "1.8rem", marginBottom: 8 }}>📄</div><p style={{ fontWeight: 600, fontSize: "0.9rem", color: "#374151" }}>Click to select a file</p><p style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: 4 }}>PDF, Word, JPG, PNG</p></div>}
                </div>
              </div>
              <div><label>Expiry Date (optional)</label><input className="input-field" type="date" value={uploadExpiry} min={new Date().toISOString().split("T")[0]} onChange={e => setUploadExpiry(e.target.value)} /></div>
              <button className="btn-blue" style={{ width: "100%", marginTop: 4, padding: "12px" }} onClick={handleUpload} disabled={uploading || !uploadFile}>{uploading ? "Uploading..." : "Upload Document"}</button>
            </div>
          </div>
        </div>
      )}

      {/* SEND MODAL */}
      {showSendModal && sendingDoc && (
        <div className="modal-overlay qm-modal-overlay" onClick={() => setShowSendModal(false)}>
          <div className="modal qm-modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: "1.2rem", color: "#0f172a" }}>Send Document</h2>
              <button onClick={() => setShowSendModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: "1.2rem" }}>✕</button>
            </div>
            <p style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: 20 }}>Sending: <strong style={{ color: "#0f172a" }}>{sendingDoc.file_name}</strong></p>
            {agencies.length === 0 ? (
              <div style={{ textAlign: "center", padding: "32px 0", color: "#94a3b8" }}>
                <div style={{ fontSize: "2rem", marginBottom: 8 }}>🏥</div>
                <p style={{ fontSize: "0.88rem" }}>No connected agencies yet.</p>
                <button className="btn-blue" style={{ marginTop: 12 }} onClick={() => { setShowSendModal(false); setActiveTab("agencies"); }}>Find Agencies</button>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <label style={{ margin: 0 }}>Select Agencies</label>
                  <button style={{ background: "none", border: "none", color: "#334155", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer", fontFamily: "Inter, sans-serif" }}
                    onClick={() => { const available = agencies.filter(ag => !shareRequests.find(s => s.document_id === sendingDoc.id && s.agency_id === ag.id && s.status !== "revoked")); if (sendToAgencies.length === available.length) setSendToAgencies([]); else setSendToAgencies(available.map(a => a.id)); }}>
                    {sendToAgencies.length === agencies.filter(ag => !shareRequests.find(s => s.document_id === sendingDoc.id && s.agency_id === ag.id && s.status !== "revoked")).length ? "Deselect All" : "Select All"}
                  </button>
                </div>
                <div style={{ marginBottom: 20 }}>
                  {agencies.map(ag => {
                    const existingShare = shareRequests.find(s => s.document_id === sendingDoc.id && s.agency_id === ag.id && s.status !== "revoked");
                    const isSelected = sendToAgencies.includes(ag.id);
                    if (existingShare) return (
                      <div key={ag.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderRadius: 10, border: "1.5px solid #e0eaff", marginBottom: 8, background: "#f8faff" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span>🏥</span>
                          <div>
                            <p style={{ fontSize: "0.88rem", fontWeight: 600, color: "#0f172a" }}>{ag.agency_name}</p>
                            <span style={{ fontSize: "0.72rem", fontWeight: 700, padding: "2px 8px", borderRadius: 100, background: existingShare.status === "accepted" ? "#f0fdf4" : existingShare.status === "declined" ? "#fef2f2" : "#fffbeb", color: existingShare.status === "accepted" ? "#16a34a" : existingShare.status === "declined" ? "#dc2626" : "#92400e" }}>
                              {existingShare.status === "accepted" ? "✓ Accepted" : existingShare.status === "declined" ? "✗ Declined" : "⏳ Pending"}
                            </span>
                          </div>
                        </div>
                        <button onClick={() => handleRevokeShare(existingShare.id)} style={{ background: "#fef2f2", color: "#dc2626", border: "1.5px solid #fecaca", padding: "5px 12px", borderRadius: 8, fontSize: "0.78rem", cursor: "pointer", fontFamily: "Inter, sans-serif", fontWeight: 600 }}>Revoke</button>
                      </div>
                    );
                    return (
                      <div key={ag.id} className={`agency-select-row ${isSelected ? "selected" : ""}`} onClick={() => setSendToAgencies(prev => prev.includes(ag.id) ? prev.filter(x => x !== ag.id) : [...prev, ag.id])}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}><span>🏥</span><span style={{ fontSize: "0.88rem", fontWeight: 600, color: "#0f172a" }}>{ag.agency_name}</span></div>
                        <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${isSelected ? "#334155" : "#e0eaff"}`, background: isSelected ? "#334155" : "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {isSelected && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {sendToAgencies.length > 0 && <button className="btn-blue" style={{ width: "100%", padding: "12px" }} onClick={handleSendDocument} disabled={sending}>{sending ? "Sending..." : `Send to ${sendToAgencies.length} Agency${sendToAgencies.length > 1 ? "s" : ""}`}</button>}
              </>
            )}
          </div>
        </div>
      )}

      {/* CHAT MODAL */}
      {showChatModal && chatAgency && (
        <div className="modal-overlay qm-modal-overlay" onClick={() => setShowChatModal(false)}>
          <div className="modal qm-modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: "1.2rem", color: "#0f172a" }}>Message {chatAgency.agency_name}</h2>
              <button onClick={() => setShowChatModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: "1.2rem" }}>✕</button>
            </div>
            {isPro && !isAdvanced && (
              <div style={{ background: "#f5f3ff", border: "1px solid #ddd6fe", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: "0.82rem", color: "#334155" }}>
                💬 Pro Chat Limit: <strong>{2 - chatLimitToday}</strong> messages remaining today
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label>Your Message</label>
                <textarea className="input-field" rows={4} placeholder="Write your message to the agency..." value={chatMessage} onChange={e => setChatMessage(e.target.value)} style={{ resize: "vertical" }} />
              </div>
              <button className="btn-blue" style={{ width: "100%" }} onClick={handleSendChat} disabled={sendingChat || !chatMessage.trim() || chatLimitReached}>
                {sendingChat ? "Sending..." : chatLimitReached ? "Daily limit reached" : "Send Message"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* APPRAISAL MODAL */}
      {showAppraisalModal && (
        <div className="modal-overlay qm-modal-overlay" onClick={() => setShowAppraisalModal(false)}>
          <div className="modal qm-modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: "1.2rem", color: "#0f172a" }}>Log Appraisal</h2>
              <button onClick={() => setShowAppraisalModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: "1.2rem" }}>✕</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div><label>Appraisal Date</label><input className="input-field" type="date" value={newAppraisal.appraisal_date} onChange={e => setNewAppraisal({ ...newAppraisal, appraisal_date: e.target.value })} /></div>
              <div><label>Next Review Date</label><input className="input-field" type="date" value={newAppraisal.next_review_date} onChange={e => setNewAppraisal({ ...newAppraisal, next_review_date: e.target.value })} /></div>
              <div><label>Appraiser Name</label><input className="input-field" placeholder="e.g. Dr. Jane Smith" value={newAppraisal.appraiser_name} onChange={e => setNewAppraisal({ ...newAppraisal, appraiser_name: e.target.value })} /></div>
              <div><label>Status</label><select className="input-field" value={newAppraisal.status} onChange={e => setNewAppraisal({ ...newAppraisal, status: e.target.value })}><option value="pending">Pending</option><option value="in_progress">In Progress</option><option value="completed">Completed</option></select></div>
              <div><label>Notes</label><textarea className="input-field" rows={3} placeholder="Notes about this appraisal..." value={newAppraisal.notes} onChange={e => setNewAppraisal({ ...newAppraisal, notes: e.target.value })} style={{ resize: "vertical" }} /></div>
              <div>
                <label>Attach Document (optional)</label>
                <div className={`upload-zone ${appraisalFile ? "has-file" : ""}`} onClick={() => appraisalFileRef.current?.click()} style={{ padding: "16px" }}>
                  <input ref={appraisalFileRef} type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" style={{ display: "none" }} onChange={e => { const file = e.target.files?.[0]; if (file) setAppraisalFile(file); }} />
                  {appraisalFile ? <p style={{ fontSize: "0.85rem", color: "#16a34a", fontWeight: 600 }}>✅ {appraisalFile.name}</p> : <p style={{ fontSize: "0.85rem", color: "#94a3b8" }}>📄 Click to attach</p>}
                </div>
              </div>
              <button className="btn-blue" style={{ width: "100%" }} onClick={handleSaveAppraisal} disabled={savingAppraisal}>{savingAppraisal ? "Saving..." : "Save Appraisal"}</button>
            </div>
          </div>
        </div>
      )}

      {/* CLAIM MODAL */}
      {showClaimModal && (
        <div className="modal-overlay qm-modal-overlay" onClick={() => setShowClaimModal(false)}>
          <div className="modal qm-modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: "1.2rem", color: "#0f172a" }}>Log Insurance Claim</h2>
              <button onClick={() => setShowClaimModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: "1.2rem" }}>✕</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div><label>Claim Type</label><input className="input-field" placeholder="e.g. Indemnity, Liability" value={newClaim.claim_type} onChange={e => setNewClaim({ ...newClaim, claim_type: e.target.value })} /></div>
              <div><label>Insurer Name</label><input className="input-field" placeholder="e.g. MDU, MPS, MDDUS" value={newClaim.insurer_name} onChange={e => setNewClaim({ ...newClaim, insurer_name: e.target.value })} /></div>
              <div><label>Policy Number</label><input className="input-field" placeholder="Your policy number" value={newClaim.policy_number} onChange={e => setNewClaim({ ...newClaim, policy_number: e.target.value })} /></div>
              <div><label>Incident Date</label><input className="input-field" type="date" value={newClaim.incident_date} onChange={e => setNewClaim({ ...newClaim, incident_date: e.target.value })} /></div>
              <div><label>Amount (£)</label><input className="input-field" type="number" placeholder="0.00" value={newClaim.amount} onChange={e => setNewClaim({ ...newClaim, amount: e.target.value })} /></div>
              <div><label>Status</label><select className="input-field" value={newClaim.status} onChange={e => setNewClaim({ ...newClaim, status: e.target.value })}><option value="open">Open</option><option value="in_progress">In Progress</option><option value="resolved">Resolved</option><option value="closed">Closed</option></select></div>
              <div><label>Description</label><textarea className="input-field" rows={3} placeholder="Brief description..." value={newClaim.description} onChange={e => setNewClaim({ ...newClaim, description: e.target.value })} style={{ resize: "vertical" }} /></div>
              <button className="btn-blue" style={{ width: "100%" }} onClick={handleSaveClaim} disabled={savingClaim}>{savingClaim ? "Saving..." : "Log Claim"}</button>
            </div>
          </div>
        </div>
      )}

      {/* AVAILABILITY MODAL */}
{showAvailabilityModal && (
  <div className="modal-overlay qm-modal-overlay" onClick={() => setShowAvailabilityModal(false)}>
    <div className="modal qm-modal" onClick={e => e.stopPropagation()}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: "1.2rem", fontWeight: 700, color: "#0f172a" }}>Add Availability</h2>
        <button onClick={() => setShowAvailabilityModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: "1.2rem" }}>✕</button>
      </div>
      <div style={{ background: "#f5f3ff", border: "1px solid #ddd6fe", borderRadius: 10, padding: "10px 14px", marginBottom: 20, fontSize: "0.82rem", color: "#7c3aed" }}>
        📅 Let agencies know when you're available for locum shifts.
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Date</label>
          <input
            className="input-field"
            type="date"
            value={availabilityDate}
            min={new Date().toISOString().split("T")[0]}
            onChange={e => setAvailabilityDate(e.target.value)}
          />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>From</label>
            <input className="input-field" type="time" value={availabilityStart} onChange={e => setAvailabilityStart(e.target.value)} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>To</label>
            <input className="input-field" type="time" value={availabilityEnd} onChange={e => setAvailabilityEnd(e.target.value)} />
          </div>
        </div>
        <button
          className="btn-blue"
          style={{ width: "100%", padding: "13px", marginTop: 4 }}
          onClick={handleAddAvailability}
          disabled={addingAvailability}
        >
          {addingAvailability ? "Adding..." : "Add Availability"}
        </button>
      </div>
    </div>
  </div>
)}
      {/* SHIFT MODAL */}
      {showShiftModal && selectedDate && (
        <div className="modal-overlay qm-modal-overlay" onClick={() => setShowShiftModal(false)}>
          <div className="modal qm-modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: "1.2rem", color: "#0f172a" }}>
                {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
              </h2>
              <button onClick={() => setShowShiftModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: "1.2rem" }}>✕</button>
            </div>
            {getShiftsForDate(selectedDate).length > 0 && (
              <div style={{ marginBottom: 16 }}>
                {getShiftsForDate(selectedDate).map(s => (
                  <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: s.type === "shift" ? "#f5f3ff" : "#f0fdf4", borderRadius: 10, marginBottom: 6 }}>
                    <span className="shift-dot" style={{ background: s.type === "shift" ? "#334155" : "#22c55e", width: 10, height: 10, flexShrink: 0 }} />
                    <div>
                      <p style={{ fontSize: "0.85rem", fontWeight: 600, color: "#0f172a", textTransform: "capitalize" }}>{s.type}{s.agency_name ? ` — ${s.agency_name}` : ""}</p>
                      <p style={{ fontSize: "0.75rem", color: "#64748b" }}>{s.start_time?.slice(0,5)} – {s.end_time?.slice(0,5)}{s.notes ? ` · ${s.notes}` : ""}</p>
                    </div>
                  </div>
                ))}
                <div style={{ borderTop: "1px solid #f1f5f9", margin: "16px 0" }} />
              </div>
            )}
            {isPro && getVacanciesForDate(selectedDate).length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: "0.78rem", fontWeight: 700, color: "#64748b", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>Open Spots</p>
                {getVacanciesForDate(selectedDate).map(v => (
                  <div key={v.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "#f0fdf4", borderRadius: 10, marginBottom: 6 }}>
                    <div>
                      <p style={{ fontSize: "0.85rem", fontWeight: 600, color: "#0f172a" }}>{v.specialty} · {v.grade}</p>
                      <p style={{ fontSize: "0.75rem", color: "#64748b" }}>{v.agency_name}{v.location ? ` · ${v.location}` : ""}</p>
                    </div>
                    {isAdvanced ? (
                      <button className="btn-advanced" style={{ padding: "5px 12px", fontSize: "0.78rem" }} onClick={() => handleGrabVacancy(v.id)}>⚡ Grab</button>
                    ) : (
                      <button className="btn-blue" style={{ padding: "5px 12px", fontSize: "0.78rem" }} onClick={() => handleUpgradeClick("Instant Grab", "advanced")}>⚡ Grab</button>
                    )}
                  </div>
                ))}
                <div style={{ borderTop: "1px solid #f1f5f9", margin: "16px 0" }} />
              </div>
            )}
            <p style={{ fontSize: "0.82rem", fontWeight: 700, color: "#64748b", marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.06em" }}>Add Entry</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div><label>Type</label><select className="input-field" value={newShift.type} onChange={e => setNewShift({ ...newShift, type: e.target.value })}><option value="availability">Available for Locum</option><option value="shift">Shift Worked</option></select></div>
              {newShift.type === "shift" && <div><label>Agency</label><select className="input-field" value={newShift.agency_id} onChange={e => setNewShift({ ...newShift, agency_id: e.target.value })}><option value="">Select agency (optional)</option>{agencies.map(ag => <option key={ag.id} value={ag.id}>{ag.agency_name}</option>)}</select></div>}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><label>Start Time</label><input className="input-field" type="time" value={newShift.start_time} onChange={e => setNewShift({ ...newShift, start_time: e.target.value })} /></div>
                <div><label>End Time</label><input className="input-field" type="time" value={newShift.end_time} onChange={e => setNewShift({ ...newShift, end_time: e.target.value })} /></div>
              </div>
              <div><label>Notes (optional)</label><input className="input-field" placeholder="e.g. Night shift, A&E" value={newShift.notes} onChange={e => setNewShift({ ...newShift, notes: e.target.value })} /></div>
              <button className="btn-blue" style={{ width: "100%", marginTop: 4 }} onClick={handleAddShift} disabled={addingShift}>{addingShift ? "Saving..." : "Save Entry"}</button>
            </div>
          </div>
        </div>
      )}

      {/* SIDEBAR */}
      <div className="qm-sidebar sidebar" style={{ position: "fixed", top: 0, left: 0, width: 240, height: "100vh", background: "#fff", borderRight: "1px solid #e2e8f0", display: "flex", flexDirection: "column", padding: "24px 16px", zIndex: 40, overflowY: "auto" }}>
        <div style={{ alignItems: "center", gap: 8, marginBottom: 36, padding: "0 6px" }}>
  <div style={{ width: 30, height: 30, background: "linear-gradient(135deg, #7c3aed, #6d28d9)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(51,65,85,0.25)" }}>
    <span style={{ color: "#fff", fontWeight: 800, fontSize: "0.95rem" }}>Q</span>
  </div>
  <span style={{ fontWeight: 700, fontSize: "1rem", color: "#7c3aed", letterSpacing: "-0.02em" }}>Quiet<span style={{ color: "#334155" }}>.</span></span>
</div>
        <nav style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
          {([
            { key: "overview", label: "Overview", icon: "⊞" },
            { key: "workfeed", label: "Work Feed", icon: "📰", minTier: "pro" },
            { key: "documents", label: "Document Vault", icon: "📄" },
            { key: "calendar", label: "My Calendar", icon: "🗓️" },
            { key: "agencies", label: "My Agencies", icon: "🏥" },
            { key: "appraisal", label: "Appraisal", icon: "📝", minTier: "pro" },
            { key: "insurance", label: "Insurance", icon: "🛡️" },
            { key: "profile", label: "My Profile", icon: "👤" },
          ] as { key: "overview"|"workfeed"|"documents"|"calendar"|"agencies"|"appraisal"|"insurance"|"profile"; label: string; icon: string; minTier?: string }[]).map(item => {
            const locked = item.minTier === "pro" && isBase;
            const lockedAdv = item.minTier === "advanced" && !isAdvanced;
            return (
              <button key={item.key} className={`sidebar-link ${activeTab === item.key ? "active" : ""}`}
                onClick={() => {
                  if (locked) { handleUpgradeClick(item.label, "pro"); return; }
                  if (lockedAdv) { handleUpgradeClick(item.label, "advanced"); return; }
                  setActiveTab(item.key);
                }}>
                <span>{item.icon}</span>{item.label}
                {locked && <span style={{ marginLeft: "auto", background: "linear-gradient(135deg, #6d28d9, #4f46e5)", color: "#fff", fontSize: "0.62rem", fontWeight: 700, padding: "2px 6px", borderRadius: 100 }}>PRO</span>}
                {item.key === "documents" && alerts.length > 0 && <span style={{ marginLeft: "auto", background: alerts.some(a => a.urgent) ? "#ef4444" : "#f59e0b", color: "#fff", fontSize: "0.7rem", fontWeight: 700, padding: "2px 7px", borderRadius: 100 }}>{alerts.length}</span>}
                {item.key === "agencies" && pendingIncomingConnections.length > 0 && <span style={{ marginLeft: "auto", background: "#f59e0b", color: "#fff", fontSize: "0.7rem", fontWeight: 700, padding: "2px 7px", borderRadius: 100 }}>{pendingIncomingConnections.length}</span>}
                {item.key === "workfeed" && isAdvanced && <span style={{ marginLeft: "auto", background: "linear-gradient(135deg, #0f172a, #334155)", color: "#fff", fontSize: "0.62rem", fontWeight: 700, padding: "2px 6px", borderRadius: 100 }}>⚡</span>}
              </button>
            );
          })}
        </nav>
        {tierBadge ? (
          <div style={{ margin: "0 0 12px", background: tierBadge.bg, borderRadius: 12, padding: "12px 14px" }}>
            <p style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.7)", marginBottom: 2 }}>You are on</p>
            <p style={{ fontSize: "0.88rem", fontWeight: 700, color: "#fff" }}>{tierBadge.label} Plan</p>
          </div>
        ) : (
          <button onClick={() => { setUpgradeTarget("pro"); setShowUpgradePage(true); }} style={{ margin: "0 0 12px", background: "linear-gradient(135deg, #6d28d9, #4f46e5)", border: "none", borderRadius: 12, padding: "12px 14px", cursor: "pointer", textAlign: "left", fontFamily: "Inter, sans-serif" }}>
            <p style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.7)", marginBottom: 2 }}>You are on</p>
            <p style={{ fontSize: "0.88rem", fontWeight: 700, color: "#fff" }}>Base Plan · Upgrade 💎</p>
          </button>
        )}
        <button className="sidebar-link" onClick={handleSignOut} style={{ color: "#ef4444" }}><span>🚪</span> Sign out</button>
      </div>

      {/* MAIN */}
      <div className="qm-main-content main-content" style={{ marginLeft: 240, padding: "32px 32px 64px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <p style={{ fontSize: "0.82rem", color: "#94a3b8", marginBottom: 2 }}>Welcome back</p>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h1 style={{ fontFamily: "Inter, sans-serif", fontSize: "1.6rem", color: "#0f172a" }}>Good day, Dr. {firstName} 👋</h1>
              {tierBadge && <span style={{ background: tierBadge.bg, color: "#fff", fontSize: "0.72rem", fontWeight: 700, padding: "3px 10px", borderRadius: 100 }}>{tierBadge.label}</span>}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {saveMsg && <span style={{ fontSize: "0.82rem", color: "#16a34a", background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "6px 12px", borderRadius: 8 }}>{saveMsg}</span>}
            <div style={{ width: 40, height: 40, background: "#334155", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: "0.85rem" }}>{initials}</div>
          </div>
        </div>

        {isPro && alerts.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            {alerts.map((alert, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 12, marginBottom: 8, background: alert.urgent ? "#fef2f2" : "#fffbeb", border: `1px solid ${alert.urgent ? "#fecaca" : "#fde68a"}` }}>
                <span style={{ fontSize: "1.1rem" }}>{alert.urgent ? "🚨" : "⚠️"}</span>
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 600, fontSize: "0.88rem", color: alert.urgent ? "#dc2626" : "#92400e" }}>{alert.urgent ? "URGENT: " : "Expiring soon: "}</span>
                  <span style={{ fontSize: "0.88rem", color: alert.urgent ? "#dc2626" : "#92400e" }}><strong>{alert.file_name}</strong> expires in <strong>{alert.days} day{alert.days !== 1 ? "s" : ""}</strong></span>
                </div>
                <button className="btn-ghost" style={{ padding: "4px 12px", fontSize: "0.78rem" }} onClick={() => setActiveTab("documents")}>View</button>
              </div>
            ))}
          </div>
        )}
{/* OVERVIEW */}
        {activeTab === "overview" && (
  <div>
    {/* Stats */}
    <div className="fade-up" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 16, marginBottom: 24 }}>
      {[
        { label: "Documents", value: documents.length, icon: "📄", color: "#f5f3ff" },
        { label: "Hours This Month", value: getMonthHours().toFixed(1) + "h", icon: "⏱️", color: "#f0fdf4" },
        { label: "Hours This Year", value: getYearHours().toFixed(1) + "h", icon: "📅", color: "#fefce8" },
        { label: "Connected Agencies", value: agencies.length, icon: "🏥", color: "#f8f9fc" },
        { label: "Matched Agencies", value: profileMatches.length, icon: "✨", color: "#fdf4ff" },
      ].map((stat, i) => (
        <div key={i} className="card" style={{ background: stat.color, border: "none" }}>
          <div style={{ fontSize: "1.3rem", marginBottom: 8 }}>{stat.icon}</div>
          <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "#0f172a", lineHeight: 1 }}>{stat.value}</div>
          <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: 4 }}>{stat.label}</div>
        </div>
      ))}
    </div>

    {/* Agency Carousel — all tiers */}
    {matchingAgencies.length > 0 && (
      <div className="fade-up card" style={{ marginBottom: 20, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <h2 style={{ fontWeight: 700, fontSize: "0.95rem", color: "#0f172a" }}>🏥 Agencies hiring in your specialty</h2>
            <p style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: 2 }}>These agencies are looking for doctors matching your profile</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8, scrollbarWidth: "none" }}>
          {matchingAgencies.map((ag, i) => (
            <div key={ag.id} style={{ flexShrink: 0, background: "linear-gradient(135deg, #f8f9fc, #f5f3ff)", border: "1px solid #e2e8f0", borderRadius: 14, padding: "14px 18px", minWidth: 160, cursor: "pointer", transition: "all 0.2s" }}
              onClick={() => setActiveTab("agencies")}
            >
              <div style={{ width: 40, height: 40, background: "linear-gradient(135deg, #7c3aed, #6d28d9)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10, fontSize: "1.1rem" }}>🏥</div>
              <p style={{ fontWeight: 700, fontSize: "0.85rem", color: "#0f172a", marginBottom: 4 }}>
                {isPro ? ag.agency_name : `Agency ${i + 1}`}
              </p>
              {ag.location_tags && <p style={{ fontSize: "0.72rem", color: "#94a3b8" }}>📍 {ag.location_tags}</p>}
              {ag.pay_range && isPro && <p style={{ fontSize: "0.72rem", color: "#16a34a", marginTop: 2 }}>💷 {ag.pay_range}</p>}
              {!isPro && <p style={{ fontSize: "0.68rem", color: "#7c3aed", fontWeight: 600, marginTop: 4 }}>💎 Upgrade to connect</p>}
            </div>
          ))}
        </div>
        {!isPro && (
          <div style={{ marginTop: 12, background: "#f5f3ff", border: "1px solid #ddd6fe", borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <p style={{ fontSize: "0.82rem", color: "#7c3aed", fontWeight: 500 }}>💎 Upgrade to Pro to see agency names and connect proactively</p>
            <button onClick={() => { setUpgradeTarget("pro"); setShowUpgradePage(true); }} style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "#fff", border: "none", padding: "6px 14px", borderRadius: 8, fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", marginLeft: 12 }}>Upgrade</button>
          </div>
        )}
      </div>
    )}

    {/* Profile Matches — all tiers */}
    {profileMatches.length > 0 && (
      <div className="fade-up card" style={{ marginBottom: 20, background: "linear-gradient(135deg, #fdf4ff, #f5f3ff)", border: "1.5px solid #ddd6fe" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <div style={{ width: 36, height: 36, background: "linear-gradient(135deg, #7c3aed, #6d28d9)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem" }}>✨</div>
          <div>
            <h2 style={{ fontWeight: 700, fontSize: "0.95rem", color: "#0f172a" }}>Your profile has been matched!</h2>
            <p style={{ fontSize: "0.78rem", color: "#64748b" }}>{profileMatches.length} {profileMatches.length === 1 ? "agency has" : "agencies have"} received your profile as a suggestion</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {profileMatches.map((match, i) => (
            <div key={match.agency_id} style={{ display: "flex", alignItems: "center", gap: 6, background: "#fff", border: "1px solid #ddd6fe", borderRadius: 100, padding: "5px 12px" }}>
              <div style={{ width: 24, height: 24, background: "linear-gradient(135deg, #7c3aed, #6d28d9)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem" }}>🏥</div>
              <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#0f172a" }}>
                {isPro ? match.agency_name : `Agency ${i + 1}`}
              </span>
            </div>
          ))}
        </div>
        {!isPro && (
          <p style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: 12 }}>💎 Upgrade to Pro to see agency names and connect with them directly</p>
        )}
      </div>
    )}

    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20, marginBottom: 20 }}>
      {/* Upcoming Shifts */}
      <div className="fade-up-2 card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 style={{ fontWeight: 700, fontSize: "1rem", color: "#0f172a" }}>Upcoming Shifts</h2>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => setShowAvailabilityModal(true)}
              style={{ background: "#f5f3ff", color: "#7c3aed", border: "1.5px solid #ddd6fe", padding: "6px 12px", borderRadius: 8, fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}
            >
              + Add Availability
            </button>
            <button className="btn-ghost" style={{ padding: "6px 12px", fontSize: "0.78rem" }} onClick={() => setActiveTab("calendar")}>Calendar</button>
          </div>
        </div>
        {getUpcomingShifts().length === 0 ? (
          <div style={{ textAlign: "center", padding: "20px 0", color: "#94a3b8" }}>
            <div style={{ fontSize: "1.8rem", marginBottom: 8 }}>🗓️</div>
            <p style={{ fontSize: "0.85rem", marginBottom: 12 }}>No upcoming shifts logged</p>
            <button
              onClick={() => setShowAvailabilityModal(true)}
              style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 8, fontSize: "0.82rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
            >
              + Add your availability
            </button>
          </div>
        ) : getUpcomingShifts().map(shift => (
          <div key={shift.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
            <div style={{ width: 40, height: 40, background: shift.type === "availability" ? "#f5f3ff" : "#eff6ff", borderRadius: 10, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontSize: "0.62rem", fontWeight: 700, color: shift.type === "availability" ? "#7c3aed" : "#334155", textTransform: "uppercase" }}>{MONTHS[new Date(shift.date + "T12:00:00").getMonth()].slice(0, 3)}</span>
              <span style={{ fontSize: "0.95rem", fontWeight: 700, color: shift.type === "availability" ? "#7c3aed" : "#334155", lineHeight: 1 }}>{new Date(shift.date + "T12:00:00").getDate()}</span>
            </div>
            <div>
              <p style={{ fontSize: "0.88rem", fontWeight: 600, color: "#0f172a" }}>{shift.type === "availability" ? "Available for Locum" : shift.agency_name || "Shift"}</p>
              <p style={{ fontSize: "0.75rem", color: "#94a3b8" }}>{shift.start_time?.slice(0,5)} – {shift.end_time?.slice(0,5)}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Top Matching Agencies */}
      <div className="fade-up-2 card" style={{ position: "relative", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <h2 style={{ fontWeight: 700, fontSize: "1rem", color: "#0f172a" }}>Top Matching Agencies</h2>
          {isBase && <span style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "#fff", fontSize: "0.65rem", fontWeight: 700, padding: "2px 7px", borderRadius: 100 }}>💎 PRO</span>}
        </div>
        <div style={{ position: "relative" }} onClick={() => isBase && handleUpgradeClick("Top Matching Agencies", "pro")}>
          <div style={{ filter: isBase ? "blur(3px)" : "none", pointerEvents: isBase ? "none" : "auto" }}>
            {matchingAgencies.length === 0 ? (
              <div style={{ textAlign: "center", padding: "24px 0", color: "#94a3b8" }}><p style={{ fontSize: "0.85rem" }}>No matching agencies yet</p></div>
            ) : matchingAgencies.slice(0, 5).map((ag, i) => (
              <div key={ag.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: i < Math.min(matchingAgencies.length, 5) - 1 ? "1px solid #f1f5f9" : "none" }}>
                <div>
                  <p style={{ fontSize: "0.88rem", fontWeight: 600, color: "#0f172a" }}>{ag.agency_name}</p>
                  <div style={{ display: "flex", gap: 6, marginTop: 3, flexWrap: "wrap" }}>
                    {ag.pay_range && <span style={{ fontSize: "0.72rem", background: "#f0fdf4", color: "#16a34a", padding: "2px 7px", borderRadius: 100 }}>💷 {ag.pay_range}</span>}
                    {ag.review_score && <span style={{ fontSize: "0.72rem", background: "#fffbeb", color: "#92400e", padding: "2px 7px", borderRadius: 100 }}>⭐ {ag.review_score}</span>}
                    {ag.location_tags && <span style={{ fontSize: "0.72rem", background: "#f5f3ff", color: "#7c3aed", padding: "2px 7px", borderRadius: 100 }}>📍 {ag.location_tags}</span>}
                  </div>
                </div>
                <button className="btn-blue" style={{ padding: "5px 12px", fontSize: "0.78rem" }} onClick={() => setActiveTab("agencies")}>View →</button>
              </div>
            ))}
          </div>
          {isBase && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <div style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "#fff", borderRadius: 12, padding: "10px 18px", fontSize: "0.85rem", fontWeight: 700, boxShadow: "0 4px 20px rgba(124,58,237,0.3)" }}>💎 Unlock with Pro</div>
            </div>
          )}
        </div>
      </div>
    </div>

    {/* Profile Summary */}
    <div className="fade-up-3 card" style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h2 style={{ fontWeight: 700, fontSize: "1rem", color: "#0f172a" }}>Profile Summary</h2>
        <button className="btn-ghost" style={{ padding: "6px 12px", fontSize: "0.78rem" }} onClick={() => setActiveTab("profile")}>Edit</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        {[
          { label: "Specialty", value: doctor?.specialty },
          { label: "Grade", value: doctor?.grade },
          { label: "GMC Number", value: doctor?.gmc_number },
          { label: "Preferred Location", value: doctor?.preferred_location },
        ].map((item, i) => (
          <div key={i}>
            <p style={{ fontSize: "0.72rem", color: "#94a3b8", marginBottom: 2, textTransform: "uppercase", letterSpacing: "0.06em" }}>{item.label}</p>
            <p style={{ fontSize: "0.88rem", color: item.value ? "#0f172a" : "#cbd5e1", fontWeight: 500 }}>{item.value || "Not set"}</p>
          </div>
        ))}
      </div>
      {(!doctor?.specialty || !doctor?.grade) && (
        <div style={{ marginTop: 16, background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: "10px 14px", fontSize: "0.85rem", color: "#92400e" }}>
          ⚠️ Set your <strong>Specialty</strong> and <strong>Grade</strong> to get matched with agencies.
        </div>
      )}
    </div>

    {/* Base plan upgrade prompt */}
    {isBase && (
      <div className="fade-up-3 card" style={{ marginBottom: 20, background: "linear-gradient(135deg, #fdf4ff, #f5f3ff)", border: "1.5px solid #ddd6fe" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <h2 style={{ fontWeight: 700, fontSize: "1rem", color: "#7c3aed" }}>You&apos;re on the Base Plan</h2>
            <p style={{ fontSize: "0.82rem", color: "#64748b", marginTop: 2 }}>Upgrade to unlock the full Quiet experience</p>
          </div>
          <button onClick={() => { setUpgradeTarget("pro"); setShowUpgradePage(true); }} style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "#fff", border: "none", padding: "10px 20px", borderRadius: 10, fontWeight: 700, fontSize: "0.85rem", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>View Plans</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
          {[
            { label: "Work Feed", tier: "Pro", icon: "📰" },
            { label: "Proactive Chat", tier: "Pro", icon: "💬" },
            { label: "Vacancy Calendar", tier: "Pro", icon: "📅" },
            { label: "BMA Rate Benchmarking", tier: "Pro", icon: "💷" },
            { label: "Priority Feed", tier: "Advanced", icon: "⚡" },
            { label: "Instant Grab", tier: "Advanced", icon: "🎯" },
          ].map((f, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: "#fff", borderRadius: 8, border: "1px solid #e2e8f0" }}>
              <span>{f.icon}</span>
              <span style={{ fontSize: "0.78rem", color: "#374151", flex: 1 }}>{f.label}</span>
              <span style={{ fontSize: "0.68rem", fontWeight: 700, background: f.tier === "Advanced" ? "linear-gradient(135deg, #1e293b, #334155)" : "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "#fff", padding: "2px 6px", borderRadius: 100 }}>{f.tier}</span>
            </div>
          ))}
        </div>
      </div>
    )}

    {/* Referral Card */}
    <div className="fade-up-3 card" style={{ background: "linear-gradient(135deg, #f0fdf4, #f5f3ff)", border: "1.5px solid #ddd6fe" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <div>
          <h2 style={{ fontWeight: 700, fontSize: "1rem", color: "#0f172a", marginBottom: 4 }}>👋 Know a colleague who does locum work?</h2>
          <p style={{ fontSize: "0.85rem", color: "#64748b" }}>Invite them to Quiet — help them manage their compliance passport in one place.</p>
        </div>
        <button
          onClick={() => {
            const link = `${window.location.origin}/signup?ref=${userId}`;
            navigator.clipboard.writeText(link);
            setSaveMsg("Referral link copied!");
            setTimeout(() => setSaveMsg(""), 3000);
          }}
          style={{ background: "#16a34a", color: "#fff", border: "none", padding: "10px 20px", borderRadius: 10, fontWeight: 700, fontSize: "0.88rem", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}
        >
          📋 Copy Invite Link
        </button>
      </div>
    </div>
  </div>
)}
        {/* WORK FEED */}
        {activeTab === "workfeed" && (
          <div className="fade-up">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: "1.3rem", color: "#0f172a" }}>Work Feed</h2>
                  {isAdvanced && <span style={{ background: "linear-gradient(135deg, #0f172a, #334155)", color: "#fff", fontSize: "0.7rem", fontWeight: 700, padding: "3px 8px", borderRadius: 100 }}>⚡ Priority</span>}
                </div>
                <p style={{ fontSize: "0.85rem", color: "#94a3b8", marginTop: 4 }}>
                  {isAdvanced ? "You have priority placement — your profile appears at the top of agency searches." : "Roles matching your specialty and grade from connected agencies."}
                </p>
              </div>
            </div>

            {isBase && (
  <div style={{ background: "linear-gradient(135deg, #1e293b, #334155)", borderRadius: 16, padding: "24px 28px", marginBottom: 24, color: "#fff" }}>
    <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
      <div style={{ flex: 1, minWidth: 200 }}>
        <h3 style={{ fontWeight: 700, fontSize: "1rem", marginBottom: 8 }}>📰 Work Feed — What you're missing</h3>
        <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.75)", lineHeight: 1.6, marginBottom: 12 }}>
          On Pro and Advanced, your Work Feed shows all live locum roles from agencies that match your specialty and grade — with pay rates, freshness timestamps and instant messaging.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {[
            "See all roles matching your specialty and grade",
            "Compare pay against BMA Rate Card",
            "Message agencies directly (2/day on Pro)",
            "Instant Grab shifts with one click (Advanced)",
          ].map((f, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: "#7c3aed", fontWeight: 700 }}>✓</span>
              <span style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.8)" }}>{f}</span>
            </div>
          ))}
        </div>
      </div>
      <button onClick={() => { setUpgradeTarget("pro"); setShowUpgradePage(true); }} style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "#fff", border: "none", padding: "12px 24px", borderRadius: 12, fontWeight: 700, fontSize: "0.9rem", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", boxShadow: "0 4px 16px rgba(124,58,237,0.4)" }}>
        💎 Unlock Work Feed
      </button>
    </div>
  </div>
)}
            {vacancies.length === 0 ? (
              <div className="card" style={{ textAlign: "center", padding: "48px 24px" }}>
                <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>📰</div>
                <p style={{ fontWeight: 600, color: "#374151", marginBottom: 6 }}>No matching roles right now</p>
                <p style={{ fontSize: "0.85rem", color: "#94a3b8" }}>When agencies post vacancies matching your specialty and grade they'll appear here.</p>
              </div>
            ) : vacancies.map(vac => (
              <div key={vac.id} className="vacancy-card">
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 44, height: 44, background: "#f5f3ff", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem", flexShrink: 0 }}>📋</div>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: "0.95rem", color: "#0f172a" }}>{vac.specialty} — {vac.grade}</p>
                      <p style={{ fontSize: "0.8rem", color: "#64748b" }}>{vac.agency_name}{vac.location ? ` · 📍 ${vac.location}` : ""}</p>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {canChat && (
                      <button
                        className={isAdvanced ? "btn-advanced" : "btn-ghost"}
                        style={{ padding: "7px 14px", fontSize: "0.82rem", whiteSpace: "nowrap" }}
                        onClick={() => {
                          if (chatLimitReached) { setSaveMsg("Daily chat limit reached (2/day on Pro). Upgrade to Advanced for unlimited."); setTimeout(() => setSaveMsg(""), 3000); return; }
                          const ag = matchingAgencies.find(a => a.id === vac.agency_id) || { id: vac.agency_id, agency_name: vac.agency_name || "", required_specialties: null, required_grades: null, pay_range: null, review_score: null, location_tags: null };
                          setChatAgency(ag);
                          setShowChatModal(true);
                        }}
                      >
                        💬 {isAdvanced ? "Message" : `Message${chatLimitReached ? " (limit)" : ""}`}
                      </button>
                    )}
                    {isAdvanced ? (
                      <button className="btn-advanced" style={{ padding: "7px 14px", fontSize: "0.82rem" }} onClick={() => handleGrabVacancy(vac.id)}>⚡ Grab</button>
                    ) : (
                      <button className="btn-blue" style={{ padding: "7px 14px", fontSize: "0.82rem", background: "linear-gradient(135deg, #0f172a, #334155)", opacity: 0.7 }} onClick={() => handleUpgradeClick("Instant Grab", "advanced")}>⚡ Grab</button>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {vac.vacancies > 0 && <span style={{ fontSize: "0.75rem", background: "#f0fdf4", color: "#16a34a", padding: "3px 8px", borderRadius: 100, border: "1px solid #bbf7d0" }}>🟢 {vac.vacancies} spot{vac.vacancies > 1 ? "s" : ""} available</span>}
                  {vac.pay_range && <span style={{ fontSize: "0.75rem", background: "#fffbeb", color: "#92400e", padding: "3px 8px", borderRadius: 100, border: "1px solid #fde68a" }}>💷 {vac.pay_range}</span>}
                  {vac.notes && <span style={{ fontSize: "0.75rem", background: "#f8faff", color: "#64748b", padding: "3px 8px", borderRadius: 100, border: "1px solid #e2e8f0" }}>{vac.notes}</span>}
                  <span style={{ fontSize: "0.72rem", color: "#94a3b8", padding: "3px 8px" }}>🕐 {new Date(vac.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                </div>
              </div>
            ))}

            {/* BMA Rate Benchmarking — Pro/Advanced */}
            <div className="card" style={{ marginTop: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <h3 style={{ fontWeight: 700, fontSize: "0.95rem", color: "#0f172a" }}>💷 BMA Rate Benchmarking</h3>
              </div>
              <p style={{ fontSize: "0.82rem", color: "#64748b", marginBottom: 16 }}>Compare your pay against the BMA Rate Card for your grade.</p>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      {["Grade", "BMA Rate Range", "Banding"].map(h => <th key={h} style={{ fontSize: "0.72rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", padding: "8px 12px", textAlign: "left", borderBottom: "1px solid #f1f5f9" }}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {BMA_RATES.map((r, i) => (
                      <tr key={i} style={{ background: r.grade === doctor?.grade ? "#f5f3ff" : "transparent" }}>
                        <td style={{ padding: "10px 12px", fontSize: "0.85rem", fontWeight: r.grade === doctor?.grade ? 700 : 400, color: r.grade === doctor?.grade ? "#334155" : "#374151", borderBottom: "1px solid #f8faff" }}>
                          {r.grade === doctor?.grade ? "▶ " : ""}{r.grade}
                        </td>
                        <td style={{ padding: "10px 12px", fontSize: "0.85rem", color: "#374151", borderBottom: "1px solid #f8faff" }}>{r.rate}</td>
                        <td style={{ padding: "10px 12px", borderBottom: "1px solid #f8faff" }}>
                          <span style={{ fontSize: "0.72rem", background: "#f0fdf4", color: "#16a34a", padding: "2px 8px", borderRadius: 100, fontWeight: 700 }}>{r.banding}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* DOCUMENTS */}
        {activeTab === "documents" && (
          <div className="fade-up card">
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <h2 style={{ fontWeight: 700, fontSize: "1.1rem", color: "#0f172a" }}>Document Vault</h2>
                <button className="btn-blue" style={{ display: "flex", alignItems: "center", gap: 6 }} onClick={() => { setUploadError(""); setShowUploadModal(true); }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg>
                  Upload Document
                </button>
              </div>
              <div style={{ background: "linear-gradient(135deg, #f5f3ff, #f8f9fc)", border: "1px solid #ddd6fe", borderRadius: 12, padding: "14px 18px", display: "flex", alignItems: "flex-start", gap: 12 }}>
                <span style={{ fontSize: "1.4rem", flexShrink: 0 }}>🔒</span>
                <div>
                  <p style={{ fontWeight: 600, fontSize: "0.88rem", color: "#0f172a", marginBottom: 4 }}>Your documents, your control</p>
                  <p style={{ fontSize: "0.82rem", color: "#64748b", lineHeight: 1.6 }}>
                    Upload your GMC certificate, DBS, Right to Work, indemnity and compliance documents once. Share them with agencies instantly with a single click — and revoke access at any time. <strong style={{ color: "#7c3aed" }}>Agencies never see your documents unless you actively share them.</strong>
                  </p>
                </div>
              </div>
            </div>
            <div style={{ position: "relative", marginBottom: 24 }} onClick={() => isBase && handleUpgradeClick("Document Expiry Alerts", "pro")}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <h3 style={{ fontWeight: 700, fontSize: "0.88rem", color: "#0f172a" }}>Expiry Alerts</h3>
                {isBase && <span style={{ background: "linear-gradient(135deg, #6d28d9, #4f46e5)", color: "#fff", fontSize: "0.65rem", fontWeight: 700, padding: "2px 7px", borderRadius: 100 }}>💎 PRO</span>}
              </div>
              <div style={{ filter: isBase ? "blur(3px)" : "none", pointerEvents: isBase ? "none" : "auto", background: "#f8faff", borderRadius: 12, padding: 16, border: "1px solid #e2e8f0", minHeight: 60 }}>
                {!isBase && alerts.length === 0 && <p style={{ fontSize: "0.85rem", color: "#94a3b8" }}>No documents expiring soon ✅</p>}
                {!isBase && alerts.map((alert, i) => <div key={i} style={{ fontSize: "0.85rem", color: alert.urgent ? "#dc2626" : "#92400e", marginBottom: 4 }}>{alert.urgent ? "🚨" : "⚠️"} <strong>{alert.file_name}</strong> expires in {alert.days} day{alert.days !== 1 ? "s" : ""}</div>)}
                {isBase && <p style={{ fontSize: "0.85rem", color: "#94a3b8" }}>⚠️ Document expiry alerts available on Pro</p>}
              </div>
              {isBase && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", paddingTop: 32 }}><div style={{ background: "linear-gradient(135deg, #6d28d9, #4f46e5)", color: "#fff", borderRadius: 12, padding: "8px 16px", fontSize: "0.82rem", fontWeight: 700 }}>💎 Unlock with Pro</div></div>}
            </div>
            {FOLDERS.map(folder => {
              const docs = folderDocs(folder.key);
              return (
                <div key={folder.key} style={{ marginBottom: 28 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <span>{folder.icon}</span>
                    <h3 style={{ fontWeight: 700, fontSize: "0.9rem", color: "#0f172a" }}>{folder.label}</h3>
                    <span style={{ fontSize: "0.75rem", background: "#f1f5f9", color: "#64748b", padding: "2px 8px", borderRadius: 100 }}>{docs.length} files</span>
                  </div>
                  {docs.length === 0 ? (
                    <div style={{ background: "#f8faff", border: "1.5px dashed #ddd6fe", borderRadius: 12, padding: "20px", textAlign: "center", color: "#94a3b8", fontSize: "0.85rem" }}>
                      No {folder.label.toLowerCase()} yet — <span style={{ color: "#334155", fontWeight: 600, cursor: "pointer", marginLeft: 4 }} onClick={() => { setUploadFolder(folder.key); setUploadError(""); setShowUploadModal(true); }}>upload your first one</span>
                    </div>
                  ) : docs.map(doc => {
                    const expiry = getExpiryForDoc(doc.id);
                    const daysLeft = expiry ? Math.ceil((new Date(expiry.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
                    const docShares = getSharesForDoc(doc.id);
                    return (
                      <div key={doc.id} className="doc-row" style={{ flexDirection: "column", alignItems: "flex-start", gap: 10 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <div style={{ width: 34, height: 34, background: "#f5f3ff", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>📄</div>
                            <div>
                              <p style={{ fontSize: "0.88rem", fontWeight: 600, color: "#0f172a" }}>{doc.file_name}</p>
                              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                                <p style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Uploaded {new Date(doc.uploaded_at).toLocaleDateString()}</p>
                                {!isBase && daysLeft !== null && <span style={{ fontSize: "0.7rem", fontWeight: 600, padding: "2px 7px", borderRadius: 100, background: daysLeft <= 7 ? "#fef2f2" : daysLeft <= 30 ? "#fffbeb" : "#f0fdf4", color: daysLeft <= 7 ? "#dc2626" : daysLeft <= 30 ? "#92400e" : "#16a34a" }}>{daysLeft <= 0 ? "EXPIRED" : `Expires in ${daysLeft}d`}</span>}
                              </div>
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button className="btn-ghost" style={{ padding: "6px 12px", fontSize: "0.78rem" }} onClick={() => handleDownload(doc)}>⬇ Download</button>
                            <button className="btn-blue" style={{ padding: "6px 12px", fontSize: "0.78rem" }} onClick={() => openSendModal(doc)}>📤 Send</button>
                            <button style={{ background: "#fef2f2", color: "#dc2626", border: "1.5px solid #fecaca", padding: "6px 10px", borderRadius: 10, fontSize: "0.78rem", cursor: "pointer", fontFamily: "Inter, sans-serif", fontWeight: 600 }} onClick={() => handleDeleteDoc(doc)}>🗑</button>
                          </div>
                        </div>
                        {docShares.length > 0 && (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, paddingLeft: 46 }}>
                            {docShares.map(share => (
                              <span key={share.id} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "0.72rem", fontWeight: 600, padding: "3px 8px", borderRadius: 100, background: share.status === "accepted" ? "#f0fdf4" : share.status === "declined" ? "#fef2f2" : "#fffbeb", color: share.status === "accepted" ? "#16a34a" : share.status === "declined" ? "#dc2626" : "#92400e", border: `1px solid ${share.status === "accepted" ? "#bbf7d0" : share.status === "declined" ? "#fecaca" : "#fde68a"}` }}>
                                🏥 {share.agency_name} · {share.status === "accepted" ? "✓ Accepted" : share.status === "declined" ? "✗ Declined" : "⏳ Pending"}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}

        {/* CALENDAR */}
        {activeTab === "calendar" && (
  <div className="fade-up">
    {/* Helper text + export buttons */}
    <div className="card" style={{ marginBottom: 20, background: "linear-gradient(135deg, #f8f9fc, #f5f3ff)", border: "1px solid #ddd6fe" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h3 style={{ fontWeight: 700, fontSize: "0.95rem", color: "#0f172a", marginBottom: 4 }}>📅 Your Quiet Calendar</h3>
          <p style={{ fontSize: "0.82rem", color: "#64748b" }}>Tap any day to add availability or log a shift worked. Sync with your existing calendar below.</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={() => setShowAvailabilityModal(true)}
            style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "#fff", border: "none", padding: "9px 16px", borderRadius: 10, fontWeight: 600, fontSize: "0.82rem", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}
          >
            + Available for Locum
          </button>
          <button
            onClick={() => { setNewShift({ ...newShift, type: "shift" }); setSelectedDate(new Date().toISOString().split("T")[0]); setShowShiftModal(true); }}
            style={{ background: "#fff", color: "#334155", border: "1.5px solid #e2e8f0", padding: "9px 16px", borderRadius: 10, fontWeight: 600, fontSize: "0.82rem", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}
          >
            + Shift Worked
          </button>
        </div>
      </div>

      {/* Sync options */}
      <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #e2e8f0" }}>
        <p style={{ fontSize: "0.78rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Sync with your calendar</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={handleExportCalendar}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "#fff", color: "#334155", border: "1.5px solid #e2e8f0", padding: "8px 14px", borderRadius: 10, fontWeight: 600, fontSize: "0.82rem", cursor: "pointer", fontFamily: "inherit" }}
          >
            <span>📥</span> Export .ics
            <span style={{ fontSize: "0.68rem", color: "#94a3b8", fontWeight: 400 }}>(Google, Apple, Outlook)</span>
          </button>
        </div>
        <p style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: 8 }}>
          💡 <strong>How to sync:</strong> Click Export .ics → open the file → your calendar app will import all your shifts automatically. Works with Google Calendar, Apple Calendar and Outlook.
        </p>
      </div>
    </div>

    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
      <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#374151", whiteSpace: "nowrap" }}>Filter by agency:</span>
      <select className="input-field" style={{ width: "auto", minWidth: 200 }} value={filterAgencyId} onChange={e => setFilterAgencyId(e.target.value)}>
        <option value="">All Agencies</option>
        {agencies.map(ag => <option key={ag.id} value={ag.id}>{ag.agency_name}</option>)}
      </select>
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 16, marginBottom: 16 }}>
      {[
        { label: `${MONTHS[calMonth]} Hours`, value: getMonthHours(filterAgencyId).toFixed(1) + "h", icon: "⏱️", color: "#f5f3ff" },
        { label: `${calYear} Total Hours`, value: getYearHours(filterAgencyId).toFixed(1) + "h", icon: "📅", color: "#f0fdf4" },
        { label: `${MONTHS[calMonth]} Shifts`, value: getMonthShifts(filterAgencyId).length, icon: "🗓️", color: "#fefce8" },
      ].map((s, i) => (
        <div key={i} className="card" style={{ background: s.color, border: "none", textAlign: "center" }}>
          <div style={{ fontSize: "1.3rem", marginBottom: 6 }}>{s.icon}</div>
          <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#0f172a" }}>{s.value}</div>
          <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: 2 }}>{s.label}</div>
        </div>
      ))}
    </div>

    {agencies.length > 0 && (
      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ fontWeight: 700, fontSize: "0.9rem", color: "#0f172a", marginBottom: 16 }}>Hours by Agency</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
          {agencies.map(ag => (
            <div key={ag.id} style={{ background: "#f8f9fc", borderRadius: 12, padding: "14px 16px", border: "1px solid #e2e8f0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}><span>🏥</span><span style={{ fontWeight: 600, fontSize: "0.88rem", color: "#0f172a" }}>{ag.agency_name}</span></div>
              <div style={{ display: "flex", gap: 16 }}>
                <div><p style={{ fontSize: "0.7rem", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>This month</p><p style={{ fontSize: "1.1rem", fontWeight: 700, color: "#7c3aed" }}>{getMonthHours(ag.id).toFixed(1)}h</p></div>
                <div><p style={{ fontSize: "0.7rem", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>{calYear}</p><p style={{ fontSize: "1.1rem", fontWeight: 700, color: "#0f172a" }}>{getYearHours(ag.id).toFixed(1)}h</p></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )}

    <div className="card">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <button className="btn-ghost" style={{ padding: "6px 14px" }} onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); } else setCalMonth(m => m - 1); }}>← Prev</button>
        <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: "1.2rem", fontWeight: 700, color: "#0f172a" }}>{MONTHS[calMonth]} {calYear}</h2>
        <button className="btn-ghost" style={{ padding: "6px 14px" }} onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); } else setCalMonth(m => m + 1); }}>Next →</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 4 }}>
        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => <div key={d} style={{ textAlign: "center", fontSize: "0.72rem", fontWeight: 700, color: "#94a3b8", padding: "4px 0", textTransform: "uppercase" }}>{d}</div>)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
        {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const dayShifts = getShiftsForDate(dateStr);
          const hasBookedShift = dayShifts.some(s => s.type === "shift");
          const dayVacancies = isPro ? vacancies.filter(v => {
            const vDate = new Date(v.created_at);
            return vDate.getFullYear() === calYear && vDate.getMonth() === calMonth;
          }) : [];
          const hasVacancy = dayVacancies.length > 0;
          const isConflict = hasBookedShift && hasVacancy;
          const isOpenSpot = !hasBookedShift && hasVacancy;
          const isToday = dateStr === today.toISOString().split("T")[0];
          const isSelected = selectedDate === dateStr;

          let dayBg = "transparent";
          if (isSelected) dayBg = "#7c3aed";
          else if (isOpenSpot) dayBg = "#fff7ed";
          else if (isConflict) dayBg = "#fefce8";
          else if (isToday) dayBg = "#f5f3ff";

          let dayBorder = "1.5px solid transparent";
          if (isSelected) dayBorder = "1.5px solid #7c3aed";
          else if (isOpenSpot) dayBorder = "1.5px solid #fed7aa";
          else if (isConflict) dayBorder = "1.5px solid #fde68a";
          else if (isToday) dayBorder = "1.5px solid #7c3aed";

          return (
            <div key={day} style={{ minHeight: 68, borderRadius: 10, padding: 6, cursor: "pointer", background: dayBg, border: dayBorder, transition: "all 0.15s", position: "relative" }}
              onClick={() => { setSelectedDate(dateStr); setShowShiftModal(true); }}>
              <span style={{ fontSize: "0.8rem", fontWeight: isToday ? 700 : 500, color: isSelected ? "#fff" : isToday ? "#7c3aed" : "#374151" }}>{day}</span>
              {isConflict && isPro && <div style={{ position: "absolute", top: 4, right: 4, width: 6, height: 6, background: "#f59e0b", borderRadius: "50%", opacity: 0.6 }} />}
              {isOpenSpot && isPro && <div style={{ position: "absolute", top: 4, right: 4, width: 6, height: 6, background: "#f97316", borderRadius: "50%" }} />}
              <div style={{ marginTop: 4, display: "flex", flexWrap: "wrap", gap: 2 }}>
                {dayShifts.map(s => (
                  <span key={s.id} style={{ width: 8, height: 8, borderRadius: "50%", display: "inline-block", margin: 1, background: s.type === "shift" ? "#334155" : "#7c3aed" }} />
                ))}
                {isOpenSpot && isPro && <span style={{ width: 8, height: 8, borderRadius: "50%", display: "inline-block", margin: 1, background: "#f97316" }} />}
                {isConflict && isPro && <span style={{ width: 8, height: 8, borderRadius: 2, display: "inline-block", margin: 1, background: "#f59e0b", opacity: 0.5 }} />}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 16, marginTop: 16, paddingTop: 16, borderTop: "1px solid #f1f5f9", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: "50%", background: "#334155", display: "inline-block" }} /><span style={{ fontSize: "0.78rem", color: "#64748b" }}>Shift logged</span></div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: "50%", background: "#7c3aed", display: "inline-block" }} /><span style={{ fontSize: "0.78rem", color: "#64748b" }}>Available</span></div>
        {isPro && <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: "50%", background: "#f97316", display: "inline-block" }} /><span style={{ fontSize: "0.78rem", color: "#64748b" }}>Open agency spot</span></div>}
        {!isPro && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#f5f3ff", border: "1px solid #ddd6fe", borderRadius: 8, padding: "4px 10px", cursor: "pointer" }} onClick={() => handleUpgradeClick("Live Vacancy Calendar", "pro")}>
            <span style={{ fontSize: "0.78rem", color: "#7c3aed", fontWeight: 600 }}>💎 Upgrade to see open agency spots</span>
          </div>
        )}
      </div>
    </div>

    {/* Upcoming shifts with Google Calendar sync */}
    {shifts.length > 0 && (
      <div className="card" style={{ marginTop: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h3 style={{ fontWeight: 700, fontSize: "0.95rem", color: "#0f172a" }}>All Logged Entries</h3>
          <button onClick={handleExportCalendar} style={{ display: "flex", alignItems: "center", gap: 6, background: "#f5f3ff", color: "#7c3aed", border: "1.5px solid #ddd6fe", padding: "7px 12px", borderRadius: 10, fontWeight: 600, fontSize: "0.78rem", cursor: "pointer", fontFamily: "inherit" }}>
            📥 Export All
          </button>
        </div>
        {shifts.slice(0, 10).map(shift => (
          <div key={shift.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 36, height: 36, background: shift.type === "availability" ? "#f5f3ff" : "#f8f9fc", borderRadius: 8, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontSize: "0.58rem", fontWeight: 700, color: shift.type === "availability" ? "#7c3aed" : "#334155", textTransform: "uppercase" }}>{MONTHS[new Date(shift.date + "T12:00:00").getMonth()].slice(0, 3)}</span>
                <span style={{ fontSize: "0.88rem", fontWeight: 700, color: shift.type === "availability" ? "#7c3aed" : "#334155", lineHeight: 1 }}>{new Date(shift.date + "T12:00:00").getDate()}</span>
              </div>
              <div>
                <p style={{ fontSize: "0.85rem", fontWeight: 600, color: "#0f172a" }}>{shift.type === "availability" ? "Available for Locum" : shift.agency_name || "Shift"}</p>
                <p style={{ fontSize: "0.75rem", color: "#94a3b8" }}>{shift.start_time?.slice(0,5)} – {shift.end_time?.slice(0,5)}</p>
              </div>
            </div>
            <button
              onClick={() => handleSyncGoogleCalendar(shift)}
              style={{ display: "flex", alignItems: "center", gap: 4, background: "#fff", color: "#374151", border: "1.5px solid #e2e8f0", padding: "5px 10px", borderRadius: 8, fontSize: "0.72rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" stroke="#4285F4" strokeWidth="2"/><path d="M16 2v4M8 2v4M3 10h18" stroke="#4285F4" strokeWidth="2" strokeLinecap="round"/></svg>
              Add to Google
            </button>
          </div>
        ))}
      </div>
    )}
  </div>
)}

        {/* AGENCIES TAB */}
        {activeTab === "agencies" && (
          <div className="fade-up">
            {pendingIncomingConnections.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <h2 style={{ fontWeight: 700, fontSize: "1rem", color: "#0f172a", marginBottom: 12 }}>🔔 Connection Requests <span style={{ marginLeft: 8, background: "#f59e0b", color: "#fff", fontSize: "0.7rem", fontWeight: 700, padding: "2px 8px", borderRadius: 100 }}>{pendingIncomingConnections.length}</span></h2>
                {pendingIncomingConnections.map(conn => (
                  <div key={conn.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 14, padding: "16px 20px", marginBottom: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 40, height: 40, background: "#fef9c3", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem" }}>🏥</div>
                      <div>
                        <p style={{ fontWeight: 700, fontSize: "0.95rem", color: "#0f172a" }}>{conn.agency_name}</p>
                        <p style={{ fontSize: "0.78rem", color: "#92400e" }}>Wants to connect with you</p>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => handleAcceptConnection(conn.id, conn.agency_id)} style={{ background: "#f0fdf4", color: "#16a34a", border: "1.5px solid #bbf7d0", padding: "7px 14px", borderRadius: 10, fontSize: "0.82rem", fontWeight: 600, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>✓ Accept</button>
                      <button onClick={() => handleDeclineConnection(conn.id)} style={{ background: "#fef2f2", color: "#dc2626", border: "1.5px solid #fecaca", padding: "7px 14px", borderRadius: 10, fontSize: "0.82rem", fontWeight: 600, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>✗ Decline</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginBottom: 28 }}>
              <h2 style={{ fontWeight: 700, fontSize: "1rem", color: "#0f172a", marginBottom: 12 }}>Connected Agencies ({agencies.length})</h2>
              {agencies.length === 0 && profileMatches.length === 0 ? (
  <div className="card" style={{ textAlign: "center", padding: "32px 24px", color: "#94a3b8" }}>
    <div style={{ fontSize: "2rem", marginBottom: 8 }}>🏥</div>
    <p style={{ fontWeight: 600, color: "#374151", marginBottom: 4 }}>No connected agencies yet</p>
    {isBase ? <p style={{ fontSize: "0.85rem" }}>Your profile is being shared with matching agencies. When they connect, they'll appear here.</p>
    : <p style={{ fontSize: "0.85rem" }}>Send a connection request to an agency below</p>}
  </div>
              ) : agencies.map(ag => {
                const conn = connections.find(c => c.agency_id === ag.id && c.status === "accepted");
                return (
                  <div key={ag.id} className="agency-card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 40, height: 40, background: "#f5f3ff", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem" }}>🏥</div>
                      <div>
                        <p style={{ fontWeight: 700, fontSize: "0.95rem", color: "#0f172a" }}>{ag.agency_name}</p>
                        <span style={{ fontSize: "0.72rem", fontWeight: 700, background: "#f0fdf4", color: "#16a34a", padding: "2px 8px", borderRadius: 100 }}>✓ Connected</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      {canChat && (
                        <button className="btn-ghost" style={{ padding: "7px 12px", fontSize: "0.82rem" }}
                          onClick={() => { if (chatLimitReached) { setSaveMsg("Daily chat limit reached. Upgrade to Advanced for unlimited."); setTimeout(() => setSaveMsg(""), 3000); return; } setChatAgency(ag); setShowChatModal(true); }}>
                          💬 {chatLimitReached ? "Limit" : "Message"}
                        </button>
                      )}
                      {conn && <button onClick={() => handleDisconnect(conn.id, ag.id)} style={{ background: "#fef2f2", color: "#dc2626", border: "1.5px solid #fecaca", padding: "7px 14px", borderRadius: 10, fontSize: "0.82rem", fontWeight: 600, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>Disconnect</button>}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Profile matches — visible to all tiers */}
{profileMatches.length > 0 && (
  <div style={{ marginBottom: 28 }}>
    <h2 style={{ fontWeight: 700, fontSize: "1rem", color: "#0f172a", marginBottom: 4 }}>
      ✨ Your profile has been shared with ({profileMatches.length})
    </h2>
    <p style={{ fontSize: "0.82rem", color: "#94a3b8", marginBottom: 12 }}>
      These agencies have received your profile as a suggestion based on your specialty and grade.
      {isBase && " Upgrade to Pro to connect with them proactively."}
    </p>
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      {profileMatches.map((match, i) => (
        <div key={match.agency_id} style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", border: "1px solid #ddd6fe", borderRadius: 12, padding: "10px 14px" }}>
          <div style={{ width: 36, height: 36, background: "linear-gradient(135deg, #7c3aed, #6d28d9)", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem", flexShrink: 0 }}>🏥</div>
          <div>
            <p style={{ fontWeight: 700, fontSize: "0.85rem", color: "#0f172a" }}>
              {isPro ? match.agency_name : `Agency ${i + 1}`}
            </p>
            <p style={{ fontSize: "0.72rem", color: "#94a3b8" }}>
              Matched {new Date(match.matched_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
            </p>
          </div>
          {isPro && !agencies.find(a => a.id === match.agency_id) && !connections.find(c => c.agency_id === match.agency_id) && (
            <button className="btn-blue" style={{ padding: "5px 12px", fontSize: "0.78rem", marginLeft: 8 }} onClick={() => handleSendConnectionRequest(match.agency_id)}>
              Connect →
            </button>
          )}
          {isBase && (
            <button style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "#fff", border: "none", padding: "5px 12px", borderRadius: 8, fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", marginLeft: 8 }}
              onClick={() => handleUpgradeClick("Proactive Agency Connection", "pro")}>
              💎 Connect
            </button>
          )}
        </div>
      ))}
    </div>
  </div>
)}
            {connections.filter(c => c.status === "pending" && c.initiated_by === "doctor").length > 0 && (
              <div style={{ marginBottom: 28 }}>
                <h2 style={{ fontWeight: 700, fontSize: "1rem", color: "#0f172a", marginBottom: 12 }}>Pending Requests</h2>
                {connections.filter(c => c.status === "pending" && c.initiated_by === "doctor").map(conn => (
                  <div key={conn.id} className="agency-card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 40, height: 40, background: "#fffbeb", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem" }}>🏥</div>
                      <div>
                        <p style={{ fontWeight: 700, fontSize: "0.95rem", color: "#0f172a" }}>{conn.agency_name}</p>
                        <span style={{ fontSize: "0.72rem", fontWeight: 700, background: "#fffbeb", color: "#92400e", padding: "2px 8px", borderRadius: 100 }}>⏳ Request pending</span>
                      </div>
                    </div>
                    <button onClick={() => handleDisconnect(conn.id, conn.agency_id)} style={{ background: "#fff", color: "#94a3b8", border: "1.5px solid #e0eaff", padding: "7px 14px", borderRadius: 10, fontSize: "0.82rem", fontWeight: 600, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>Cancel</button>
                  </div>
                ))}
              </div>
            )}

            <div>
              <h2 style={{ fontWeight: 700, fontSize: "1rem", color: "#0f172a", marginBottom: 4 }}>Agencies Matching Your Profile</h2>
              <p style={{ fontSize: "0.82rem", color: "#94a3b8", marginBottom: 16 }}>
                {isBase ? "On Base plan, agencies can find and connect with you." :
                 (!doctor?.specialty || !doctor?.grade) ? <span style={{ color: "#92400e" }}>⚠️ Set your specialty and grade to see matches.</span> :
                 `Showing agencies looking for ${doctor.specialty} · ${doctor.grade}`}
              </p>
              {matchingAgencies.length === 0 && !isBase ? (
                <div className="card" style={{ textAlign: "center", padding: "32px 24px", color: "#94a3b8" }}>
                  <div style={{ fontSize: "2rem", marginBottom: 8 }}>🔍</div>
                  <p style={{ fontWeight: 600, color: "#374151", marginBottom: 4 }}>No matching agencies found</p>
                </div>
              ) : matchingAgencies.map(ag => {
                const existingConn = getConnectionStatus(ag.id);
                const isConnected = existingConn?.status === "accepted";
                const isPendingConn = existingConn?.status === "pending";
                const isDeclined = existingConn?.status === "declined";
                return (
                  <div key={ag.id} className="agency-card">
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 44, height: 44, background: "#f5f3ff", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem" }}>🏥</div>
                        <div>
                          {isBase ? (
                            <p style={{ fontWeight: 700, fontSize: "0.95rem", color: "#0f172a", filter: "blur(5px)", userSelect: "none" }}>Agency Name Hidden</p>
                          ) : (
                            <p style={{ fontWeight: 700, fontSize: "0.95rem", color: "#0f172a" }}>{ag.agency_name}</p>
                          )}
                          {isConnected && <span style={{ fontSize: "0.72rem", fontWeight: 700, background: "#f0fdf4", color: "#16a34a", padding: "2px 8px", borderRadius: 100 }}>✓ Connected</span>}
                          {isPendingConn && <span style={{ fontSize: "0.72rem", fontWeight: 700, background: "#fffbeb", color: "#92400e", padding: "2px 8px", borderRadius: 100 }}>⏳ Request sent</span>}
                          {isDeclined && <span style={{ fontSize: "0.72rem", fontWeight: 700, background: "#fef2f2", color: "#dc2626", padding: "2px 8px", borderRadius: 100 }}>✗ Declined</span>}
                        </div>
                      </div>
                      {isBase ? (
                        <button style={{ background: "linear-gradient(135deg, #6d28d9, #4f46e5)", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 10, fontWeight: 700, fontSize: "0.82rem", cursor: "pointer", fontFamily: "Inter, sans-serif" }} onClick={() => handleUpgradeClick("Proactive Agency Connection", "pro")}>
                          💎 Upgrade to Connect
                        </button>
                      ) : (
                        <div style={{ display: "flex", gap: 8 }}>
                          {isConnected && canChat && (
                            <button className="btn-ghost" style={{ padding: "7px 12px", fontSize: "0.82rem" }}
                              onClick={() => { if (chatLimitReached) return; setChatAgency(ag); setShowChatModal(true); }}>
                              💬
                            </button>
                          )}
                          {!isConnected && !isPendingConn && !isDeclined && <button className="btn-blue" style={{ padding: "8px 16px", fontSize: "0.85rem" }} onClick={() => handleSendConnectionRequest(ag.id)}>Connect →</button>}
                          {isConnected && existingConn && <button onClick={() => handleDisconnect(existingConn.id, ag.id)} style={{ background: "#fef2f2", color: "#dc2626", border: "1.5px solid #fecaca", padding: "7px 14px", borderRadius: 10, fontSize: "0.82rem", fontWeight: 600, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>Disconnect</button>}
                          {isPendingConn && existingConn && <button onClick={() => handleDisconnect(existingConn.id, ag.id)} style={{ background: "#fff", color: "#94a3b8", border: "1.5px solid #e0eaff", padding: "7px 14px", borderRadius: 10, fontSize: "0.82rem", fontWeight: 600, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>Cancel</button>}
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {!isBase ? (
                        <>
                          {ag.required_specialties?.split(",").map((s, i) => <span key={i} style={{ fontSize: "0.72rem", background: "#f5f3ff", color: "#334155", padding: "3px 8px", borderRadius: 100, border: "1px solid #ddd6fe" }}>{s.trim()}</span>)}
                          {ag.required_grades?.split(",").map((g, i) => <span key={i} style={{ fontSize: "0.72rem", background: "#f5f3ff", color: "#6d28d9", padding: "3px 8px", borderRadius: 100, border: "1px solid #d8b4fe" }}>{g.trim()}</span>)}
                          {ag.pay_range && <span style={{ fontSize: "0.72rem", background: "#f0fdf4", color: "#16a34a", padding: "3px 8px", borderRadius: 100, border: "1px solid #bbf7d0" }}>💷 {ag.pay_range}</span>}
                          {ag.review_score && <span style={{ fontSize: "0.72rem", background: "#fffbeb", color: "#92400e", padding: "3px 8px", borderRadius: 100, border: "1px solid #fde68a" }}>⭐ {ag.review_score}</span>}
                          {ag.location_tags && <span style={{ fontSize: "0.72rem", background: "#fffbeb", color: "#92400e", padding: "3px 8px", borderRadius: 100, border: "1px solid #fde68a" }}>📍 {ag.location_tags}</span>}
                        </>
                      ) : (
                        <span style={{ fontSize: "0.78rem", color: "#94a3b8", fontStyle: "italic" }}>💎 Upgrade to Pro to see agency details</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* APPRAISAL TAB */}
        {activeTab === "appraisal" && (
  <div className="fade-up">
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: "1.3rem", fontWeight: 700, color: "#0f172a" }}>Medical Appraisal</h2>
          {isAdvanced && <span style={{ background: "linear-gradient(135deg, #0f172a, #334155)", color: "#fff", fontSize: "0.7rem", fontWeight: 700, padding: "3px 8px", borderRadius: 100 }}>⚡ Includes RO Link</span>}
        </div>
        <p style={{ fontSize: "0.85rem", color: "#94a3b8", marginTop: 4 }}>Track your annual medical appraisals and revalidation.</p>
      </div>
      <button className="btn-blue" onClick={() => setShowAppraisalModal(true)}>+ Log Appraisal</button>
    </div>

    {/* Pricing Cards */}
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16, marginBottom: 24 }}>
      
      {/* Annual Renewal */}
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 2px 8px rgba(51,65,85,0.06)" }}>
        <div style={{ background: "linear-gradient(135deg, #334155, #475569)", padding: "20px 24px" }}>
          <p style={{ fontSize: "0.78rem", fontWeight: 700, color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Annual Renewal</p>
          <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
            <span style={{ fontSize: "2rem", fontWeight: 800, color: "#fff" }}>£599</span>
            <span style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.6)" }}>/year</span>
          </div>
          <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.6)", marginTop: 4 }}>Same price for all plans</p>
        </div>
        <div style={{ padding: "20px 24px" }}>
          {["Annual appraisal management", "Document preparation support", "Appraisal tracking on Quiet", "Reminder notifications"].map((f, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0", borderBottom: i < 3 ? "1px solid #f1f5f9" : "none" }}>
              <span style={{ color: "#334155", fontWeight: 700 }}>✓</span>
              <span style={{ fontSize: "0.85rem", color: "#374151" }}>{f}</span>
            </div>
          ))}
          <button
            onClick={() => {
              setSaveMsg("Appraisal renewal request sent! Our team will contact you within 24 hours.");
              setTimeout(() => setSaveMsg(""), 5000);
            }}
            style={{ width: "100%", marginTop: 16, background: "linear-gradient(135deg, #334155, #475569)", color: "#fff", border: "none", padding: "12px", borderRadius: 10, fontWeight: 700, fontSize: "0.9rem", cursor: "pointer", fontFamily: "inherit" }}
          >
            Request Renewal — £599
          </button>
        </div>
      </div>

      {/* Designated Body */}
      <div style={{ background: "#fff", borderRadius: 16, border: `2px solid ${isAdvanced ? "#7c3aed" : "#e2e8f0"}`, overflow: "hidden", boxShadow: isAdvanced ? "0 4px 20px rgba(124,58,237,0.15)" : "0 2px 8px rgba(51,65,85,0.06)", position: "relative" }}>
        {isAdvanced && (
          <div style={{ position: "absolute", top: 12, right: 12, background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "#fff", fontSize: "0.68rem", fontWeight: 700, padding: "3px 10px", borderRadius: 100 }}>⚡ Best price for you</div>
        )}
        <div style={{ background: "linear-gradient(135deg, #6d28d9, #7c3aed)", padding: "20px 24px" }}>
          <p style={{ fontSize: "0.78rem", fontWeight: 700, color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Designated Body / RO Link</p>
          <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
            <span style={{ fontSize: "2rem", fontWeight: 800, color: "#fff" }}>
              {isAdvanced ? "£1,500" : isPro ? "£1,800" : "£2,000"}
            </span>
            <span style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.6)" }}>/year</span>
          </div>
          {isBase && (
            <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.7)", marginTop: 4 }}>
              💡 Upgrade to Pro to save £200 · Advanced saves £500
            </p>
          )}
          {isPro && !isAdvanced && (
            <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.7)", marginTop: 4 }}>
              💡 Upgrade to Advanced to save a further £300
            </p>
          )}
          {isAdvanced && (
            <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.7)", marginTop: 4 }}>
              ✓ Best price — £500 less than Base plan
            </p>
          )}
        </div>
        <div style={{ padding: "20px 24px" }}>
          {["Direct link to a Responsible Officer (RO)", "Revalidation support", "Designated Body connection", "Priority response within 24hrs", "Full appraisal documentation"].map((f, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0", borderBottom: i < 4 ? "1px solid #f1f5f9" : "none" }}>
              <span style={{ color: "#7c3aed", fontWeight: 700 }}>✓</span>
              <span style={{ fontSize: "0.85rem", color: "#374151" }}>{f}</span>
            </div>
          ))}

          {!isAdvanced && (
            <div style={{ background: "#f5f3ff", border: "1px solid #ddd6fe", borderRadius: 10, padding: "10px 14px", margin: "14px 0", fontSize: "0.78rem", color: "#7c3aed" }}>
              💎 Upgrade to {isPro ? "Advanced" : "Pro"} to save {isPro ? "£300" : "£200"} on this service
              <button
                onClick={() => { setUpgradeTarget(isPro ? "advanced" : "pro"); setShowUpgradePage(true); }}
                style={{ display: "block", marginTop: 6, background: "none", border: "none", color: "#7c3aed", fontWeight: 700, fontSize: "0.78rem", cursor: "pointer", fontFamily: "inherit", padding: 0, textDecoration: "underline" }}
              >
                View upgrade options →
              </button>
            </div>
          )}

          <button
            onClick={() => {
              const amount = isAdvanced ? 1500 : isPro ? 1800 : 2000;
              setSaveMsg(`Designated Body request sent! Our team will contact you within 24 hours. Amount: £${amount.toLocaleString()}`);
              setTimeout(() => setSaveMsg(""), 6000);
            }}
            style={{ width: "100%", marginTop: isAdvanced ? 16 : 4, background: "linear-gradient(135deg, #6d28d9, #7c3aed)", color: "#fff", border: "none", padding: "12px", borderRadius: 10, fontWeight: 700, fontSize: "0.9rem", cursor: "pointer", fontFamily: "inherit", boxShadow: "0 2px 12px rgba(124,58,237,0.3)" }}
          >
            Request RO Link — {isAdvanced ? "£1,500" : isPro ? "£1,800" : "£2,000"}
          </button>
        </div>
      </div>
    </div>

    {/* Appraisal documents */}
    {folderDocs("appraisal").length > 0 && (
      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ fontWeight: 700, fontSize: "0.9rem", color: "#0f172a", marginBottom: 14 }}>📝 Appraisal Documents</h3>
        {folderDocs("appraisal").map(doc => (
          <div key={doc.id} className="doc-row">
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 34, height: 34, background: "#f5f3ff", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>📝</div>
              <div>
                <p style={{ fontSize: "0.88rem", fontWeight: 600, color: "#0f172a" }}>{doc.file_name}</p>
                <p style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Uploaded {new Date(doc.uploaded_at).toLocaleDateString()}</p>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn-ghost" style={{ padding: "6px 12px", fontSize: "0.78rem" }} onClick={() => handleDownload(doc)}>⬇ Download</button>
              <button style={{ background: "#fef2f2", color: "#dc2626", border: "1.5px solid #fecaca", padding: "6px 10px", borderRadius: 10, fontSize: "0.78rem", cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }} onClick={() => handleDeleteDoc(doc)}>🗑</button>
            </div>
          </div>
        ))}
      </div>
    )}

    {/* Logged appraisals */}
    {appraisals.length === 0 ? (
      <div className="card" style={{ textAlign: "center", padding: "48px 24px" }}>
        <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>📝</div>
        <p style={{ fontWeight: 600, color: "#374151", marginBottom: 6 }}>No appraisals logged yet</p>
        <p style={{ fontSize: "0.85rem", color: "#94a3b8", marginBottom: 20 }}>Keep track of your annual medical appraisals here.</p>
        <button className="btn-blue" onClick={() => setShowAppraisalModal(true)}>Log your first appraisal</button>
      </div>
    ) : (
      <div>
        {appraisals.map(appr => {
          const sc = getStatusColor(appr.status);
          return (
            <div key={appr.id} style={{ background: "#f8f9fc", border: "1px solid #e2e8f0", borderRadius: 14, padding: "18px 20px", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 40, height: 40, background: "#f5f3ff", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem" }}>📝</div>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: "0.95rem", color: "#0f172a" }}>
                      {appr.appraisal_date ? new Date(appr.appraisal_date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "Date not set"}
                    </p>
                    {appr.appraiser_name && <p style={{ fontSize: "0.78rem", color: "#64748b" }}>Appraiser: {appr.appraiser_name}</p>}
                  </div>
                </div>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, padding: "4px 10px", borderRadius: 100, background: sc.bg, color: sc.color, textTransform: "capitalize" }}>{appr.status.replace("_", " ")}</span>
              </div>
              {appr.next_review_date && <p style={{ fontSize: "0.78rem", color: "#64748b", marginBottom: 6 }}>📅 Next review: <strong>{new Date(appr.next_review_date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</strong></p>}
              {appr.notes && <p style={{ fontSize: "0.82rem", color: "#64748b", background: "#fff", borderRadius: 8, padding: "8px 12px" }}>{appr.notes}</p>}
            </div>
          );
        })}
      </div>
    )}
  </div>
)}

        {/* INSURANCE TAB */}
        {activeTab === "insurance" && (
  <div className="fade-up">
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
      <div>
        <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: "1.3rem", fontWeight: 700, color: "#0f172a" }}>Insurance</h2>
        <p style={{ fontSize: "0.85rem", color: "#94a3b8", marginTop: 4 }}>Manage your indemnity, upload documents, and apply for cover.</p>
      </div>
      <button className="btn-blue" onClick={() => setShowClaimModal(true)}>+ Log Claim</button>
    </div>

    {/* Stats */}
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 16, marginBottom: 24 }}>
      {[
        { label: "Open Claims", value: insuranceClaims.filter(c => c.status === "open").length, icon: "🔴", color: "#fff1f2" },
        { label: "In Progress", value: insuranceClaims.filter(c => c.status === "in_progress").length, icon: "🔵", color: "#f5f3ff" },
        { label: "Resolved", value: insuranceClaims.filter(c => c.status === "resolved").length, icon: "✅", color: "#f0fdf4" },
        { label: "Insurance Docs", value: folderDocs("insurance").length, icon: "📄", color: "#f8f9fc" },
      ].map((stat, i) => (
        <div key={i} className="card" style={{ background: stat.color, border: "none" }}>
          <div style={{ fontSize: "1.3rem", marginBottom: 8 }}>{stat.icon}</div>
          <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "#0f172a", lineHeight: 1 }}>{stat.value}</div>
          <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: 4 }}>{stat.label}</div>
        </div>
      ))}
    </div>

    {/* Apply for Insurance CTA */}
    <div style={{ background: "linear-gradient(135deg, #1e293b, #334155)", borderRadius: 16, padding: "24px 28px", marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
      <div>
        <p style={{ fontSize: "0.78rem", fontWeight: 700, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Need indemnity insurance?</p>
        <h3 style={{ fontWeight: 700, fontSize: "1rem", color: "#fff", marginBottom: 6 }}>Apply for medical indemnity cover</h3>
        <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.7)", maxWidth: 420, lineHeight: 1.6 }}>
          Get competitive quotes for MDU, MPS or MDDUS indemnity cover. Our team can help you find the right policy for your locum work.
        </p>
      </div>
      <button
        onClick={() => {
          setSaveMsg("Insurance application request sent! Our team will contact you within 24 hours.");
          setTimeout(() => setSaveMsg(""), 5000);
        }}
        style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "#fff", border: "none", padding: "12px 24px", borderRadius: 12, fontWeight: 700, fontSize: "0.9rem", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", boxShadow: "0 4px 16px rgba(124,58,237,0.4)" }}
      >
        Apply for Cover →
      </button>
    </div>

    {/* Upload insurance documents */}
    <div className="card" style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div>
          <h3 style={{ fontWeight: 700, fontSize: "0.9rem", color: "#0f172a" }}>🛡️ Insurance Documents</h3>
          <p style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: 2 }}>Upload your indemnity certificates, policy documents and proof of cover.</p>
        </div>
        <button className="btn-ghost" style={{ padding: "7px 14px", fontSize: "0.82rem" }} onClick={() => { setUploadFolder("insurance"); setUploadError(""); setShowUploadModal(true); }}>+ Upload</button>
      </div>
      {folderDocs("insurance").length === 0 ? (
        <div style={{ background: "#f8f9fc", border: "1.5px dashed #e2e8f0", borderRadius: 12, padding: "24px", textAlign: "center" }}>
          <div style={{ fontSize: "1.8rem", marginBottom: 8 }}>🛡️</div>
          <p style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: 12 }}>No insurance documents uploaded yet</p>
          <button className="btn-ghost" style={{ padding: "8px 16px", fontSize: "0.82rem" }} onClick={() => { setUploadFolder("insurance"); setUploadError(""); setShowUploadModal(true); }}>Upload your first document</button>
        </div>
      ) : folderDocs("insurance").map(doc => (
        <div key={doc.id} className="doc-row">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 34, height: 34, background: "#f5f3ff", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>🛡️</div>
            <div>
              <p style={{ fontSize: "0.88rem", fontWeight: 600, color: "#0f172a" }}>{doc.file_name}</p>
              <p style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Uploaded {new Date(doc.uploaded_at).toLocaleDateString()}</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn-ghost" style={{ padding: "6px 12px", fontSize: "0.78rem" }} onClick={() => handleDownload(doc)}>⬇ Download</button>
            <button style={{ background: "#fef2f2", color: "#dc2626", border: "1.5px solid #fecaca", padding: "6px 10px", borderRadius: 10, fontSize: "0.78rem", cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }} onClick={() => handleDeleteDoc(doc)}>🗑</button>
          </div>
        </div>
      ))}
    </div>

    {/* Claims */}
    <div style={{ marginBottom: 24 }}>
      <h3 style={{ fontWeight: 700, fontSize: "0.9rem", color: "#0f172a", marginBottom: 14 }}>Claims</h3>
      {insuranceClaims.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "32px 24px" }}>
          <div style={{ fontSize: "2rem", marginBottom: 8 }}>🛡️</div>
          <p style={{ fontWeight: 600, color: "#374151", marginBottom: 4 }}>No claims logged yet</p>
          <p style={{ fontSize: "0.85rem", color: "#94a3b8", marginBottom: 16 }}>Keep track of your insurance claims here.</p>
          <button className="btn-blue" onClick={() => setShowClaimModal(true)}>Log your first claim</button>
        </div>
      ) : insuranceClaims.map(claim => {
        const sc = getStatusColor(claim.status);
        return (
          <div key={claim.id} style={{ background: "#f8f9fc", border: "1px solid #e2e8f0", borderRadius: 14, padding: "18px 20px", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 40, height: 40, background: "#f5f3ff", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem" }}>🛡️</div>
                <div>
                  <p style={{ fontWeight: 700, fontSize: "0.9rem", color: "#0f172a" }}>{claim.claim_type || "Insurance Claim"}</p>
                  <p style={{ fontSize: "0.75rem", color: "#64748b" }}>{claim.insurer_name || "No insurer"}{claim.policy_number ? ` · ${claim.policy_number}` : ""}</p>
                </div>
              </div>
              <span style={{ fontSize: "0.75rem", fontWeight: 700, padding: "4px 10px", borderRadius: 100, background: sc.bg, color: sc.color, textTransform: "capitalize" }}>{claim.status.replace("_", " ")}</span>
            </div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              {claim.incident_date && <span style={{ fontSize: "0.78rem", color: "#64748b" }}>📅 {new Date(claim.incident_date).toLocaleDateString("en-GB")}</span>}
              {claim.amount && <span style={{ fontSize: "0.78rem", color: "#64748b" }}>💷 £{claim.amount.toFixed(2)}</span>}
            </div>
            {claim.description && <p style={{ fontSize: "0.82rem", color: "#64748b", marginTop: 8, background: "#fff", borderRadius: 8, padding: "8px 12px" }}>{claim.description}</p>}
          </div>
        );
      })}
    </div>

    {/* Support */}
    <div className="card">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div>
          <h3 style={{ fontWeight: 700, fontSize: "0.9rem", color: "#0f172a" }}>💬 Insurance Support</h3>
          <p style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: 2 }}>Need help with a claim, policy question or switching provider?</p>
        </div>
        <button className="btn-ghost" style={{ padding: "7px 14px", fontSize: "0.82rem" }} onClick={() => setShowSupportForm(prev => !prev)}>{showSupportForm ? "Cancel" : "Get Support"}</button>
      </div>
      {showSupportForm && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <textarea className="input-field" rows={4} placeholder="Describe your insurance issue, question or what cover you need..." value={supportMsg} onChange={e => setSupportMsg(e.target.value)} style={{ resize: "vertical" }} />
          <button className="btn-blue" style={{ alignSelf: "flex-start", padding: "10px 24px" }} onClick={() => { setSupportMsg(""); setShowSupportForm(false); setSaveMsg("Support request sent! We'll get back to you within 24 hours."); setTimeout(() => setSaveMsg(""), 4000); }}>Send Message</button>
        </div>
      )}
    </div>
  </div>
)}

        {/* PROFILE */}
        {activeTab === "profile" && (
          <div className="fade-up card">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
              <h2 style={{ fontWeight: 700, fontSize: "1.1rem", color: "#0f172a" }}>My Profile</h2>
              {!editMode ? <button className="btn-blue" onClick={() => setEditMode(true)}>Edit Profile</button> : (
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn-ghost" onClick={() => { setEditMode(false); setEditData(doctor as Doctor); }}>Cancel</button>
                  <button className="btn-blue" onClick={handleSaveProfile} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</button>
                </div>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32, paddingBottom: 28, borderBottom: "1px solid #f1f5f9" }}>
              <div style={{ width: 64, height: 64, background: "#334155", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: "1.3rem" }}>{initials}</div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <p style={{ fontWeight: 700, fontSize: "1.05rem", color: "#0f172a" }}>{doctor?.full_name}</p>
                  {tierBadge && <span style={{ background: tierBadge.bg, color: "#fff", fontSize: "0.65rem", fontWeight: 700, padding: "2px 8px", borderRadius: 100 }}>{tierBadge.label}</span>}
                </div>
                <p style={{ fontSize: "0.85rem", color: "#94a3b8" }}>{doctor?.email}</p>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
              {[
                { label: "Full Name", key: "full_name", placeholder: "Dr. Jane Smith" },
                { label: "Phone Number", key: "phone", placeholder: "+44 7700 000000" },
                { label: "Specialty", key: "specialty", placeholder: "e.g. Cardiology" },
                { label: "Grade", key: "grade", placeholder: "e.g. Consultant" },
                { label: "GMC Number", key: "gmc_number", placeholder: "7-digit GMC number" },
                { label: "Preferred Location", key: "preferred_location", placeholder: "e.g. London" },
              ].map(field => (
                <div key={field.key}>
                  <label>{field.label}</label>
                  {editMode ? (
                    <input className="input-field" placeholder={field.placeholder} value={(editData as Record<string, string>)[field.key] || ""} onChange={e => setEditData({ ...editData, [field.key]: e.target.value })} />
                  ) : (
                    <p style={{ fontSize: "0.92rem", color: (doctor as Record<string, string> | null)?.[field.key] ? "#0f172a" : "#cbd5e1", fontWeight: 500, padding: "10px 0" }}>
                      {(doctor as Record<string, string> | null)?.[field.key] || "Not set"}
                    </p>
                  )}
                </div>
              ))}
            </div>
            {isBase && (
              <div style={{ marginTop: 32, background: "linear-gradient(135deg, #fdf4ff, #f5f3ff)", border: "1.5px solid #d8b4fe", borderRadius: 14, padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                <div>
                  <p style={{ fontWeight: 700, fontSize: "0.95rem", color: "#6d28d9", marginBottom: 4 }}>💎 Upgrade to Pro or Advanced</p>
                  <p style={{ fontSize: "0.82rem", color: "#64748b" }}>Unlock Work Feed, proactive chat, vacancy calendar and more.</p>
                </div>
                <button onClick={() => { setUpgradeTarget("pro"); setShowUpgradePage(true); }} style={{ background: "linear-gradient(135deg, #6d28d9, #4f46e5)", color: "#fff", border: "none", padding: "10px 20px", borderRadius: 10, fontWeight: 700, fontSize: "0.85rem", cursor: "pointer", fontFamily: "Inter, sans-serif", whiteSpace: "nowrap" }}>View Plans</button>
              </div>
            )}
          </div>
        )}
        {/* BOTTOM NAV — Mobile/Tablet */}
      <div className="qm-bottom-nav">
        {([
          { key: "overview", label: "Home", icon: "⊞" },
          { key: "workfeed", label: "Feed", icon: "📰", minTier: "pro" },
          { key: "documents", label: "Vault", icon: "📄" },
          { key: "calendar", label: "Calendar", icon: "🗓️" },
          { key: "agencies", label: "Agencies", icon: "🏥" },
          { key: "profile", label: "Profile", icon: "👤" },
        ] as { key: "overview"|"workfeed"|"documents"|"calendar"|"agencies"|"appraisal"|"insurance"|"profile"; label: string; icon: string; minTier?: string }[]).map(item => (
          <button
            key={item.key}
            className={`qm-bottom-nav-item ${activeTab === item.key ? "active" : ""}`}
            onClick={() => {
              if (item.minTier === "pro" && isBase) { handleUpgradeClick(item.label, "pro"); return; }
              setActiveTab(item.key);
            }}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
            {item.key === "documents" && alerts.length > 0 && (
              <span style={{ position: "absolute", top: 4, right: "calc(50% - 16px)", width: 8, height: 8, borderRadius: "50%", background: "#dc2626" }} />
            )}
          </button>
        ))}
      </div>
      </div>
    </div>
  );
}