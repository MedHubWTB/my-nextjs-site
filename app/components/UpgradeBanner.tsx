"use client";

type Props = {
  tier: string;
  currentTab: string;
  onUpgrade: (feature: string, tier: "pro" | "advanced") => void;
};

const TAB_SAVINGS: Record<string, { pro: string; advanced: string; proSaving: string; advancedSaving: string }> = {
  appraisal: {
    pro: "Save £200 on Designated Body / RO Link fee",
    advanced: "Save £500 on Designated Body / RO Link fee",
    proSaving: "£200/yr",
    advancedSaving: "£500/yr",
  },
  insurance: {
    pro: "Get discounted indemnity insurance rates",
    advanced: "Best indemnity rates + priority claims support",
    proSaving: "Up to £300/yr",
    advancedSaving: "Up to £600/yr",
  },
  documents: {
    pro: "Expiry tracking + priority document sharing",
    advanced: "Unlimited sharing + mandatory training verified badge",
    proSaving: "Saves time",
    advancedSaving: "Saves time + money",
  },
  agencies: {
    pro: "Connect proactively with agencies + 2 messages/day",
    advanced: "Unlimited outreach + full agency contact details",
    proSaving: "More placements",
    advancedSaving: "Maximum placements",
  },
  workfeed: {
    pro: "See full vacancy details + grab shifts instantly",
    advanced: "Priority matching + instant grab on all vacancies",
    proSaving: "More shifts",
    advancedSaving: "Best shifts first",
  },
  calendar: {
    pro: "See live agency vacancy spots on your calendar",
    advanced: "Full calendar sync + unlimited shift tracking",
    proSaving: "Never miss a shift",
    advancedSaving: "Full visibility",
  },
  overview: {
    pro: "Unlock proactive agency connections + document sharing",
    advanced: "Full platform access + priority matching",
    proSaving: "£200/yr savings",
    advancedSaving: "£500/yr savings",
  },
};

export default function UpgradeBanner({ tier, currentTab, onUpgrade }: Props) {
  const isBase = tier === "basic";
  const isPro = tier === "pro";
  const savings = TAB_SAVINGS[currentTab] || TAB_SAVINGS.overview;

  if (tier === "advanced") return null;

  if (isBase) {
    return (
      <div style={{ background: "linear-gradient(135deg, #f5f3ff, #ede9fe)", border: "1.5px solid #ddd6fe", borderRadius: 14, padding: "16px 20px", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
          <span style={{ fontSize: "1.5rem" }}>💡</span>
          <div>
            <p style={{ fontWeight: 700, fontSize: "0.9rem", color: "#4c1d95", marginBottom: 4 }}>Unlock more on this page</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <p style={{ fontSize: "0.82rem", color: "#6d28d9" }}>
                💎 <strong>Pro</strong> — {savings.pro}
                <span style={{ marginLeft: 8, background: "#ddd6fe", color: "#4c1d95", fontSize: "0.7rem", fontWeight: 700, padding: "1px 7px", borderRadius: 100 }}>Save {savings.proSaving}</span>
              </p>
              <p style={{ fontSize: "0.82rem", color: "#334155" }}>
                ⚡ <strong>Advanced</strong> — {savings.advanced}
                <span style={{ marginLeft: 8, background: "#e0f2fe", color: "#0369a1", fontSize: "0.7rem", fontWeight: 700, padding: "1px 7px", borderRadius: 100 }}>Save {savings.advancedSaving}</span>
              </p>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => onUpgrade("Pro Features", "pro")}
            style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "#fff", border: "none", padding: "9px 16px", borderRadius: 10, fontWeight: 700, fontSize: "0.82rem", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}
          >
            💎 Upgrade to Pro
          </button>
          <button
            onClick={() => onUpgrade("Advanced Features", "advanced")}
            style={{ background: "linear-gradient(135deg, #1e293b, #334155)", color: "#fff", border: "none", padding: "9px 16px", borderRadius: 10, fontWeight: 700, fontSize: "0.82rem", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}
          >
            ⚡ Go Advanced
          </button>
        </div>
      </div>
    );
  }

  if (isPro) {
    return (
      <div style={{ background: "linear-gradient(135deg, #f0f9ff, #e0f2fe)", border: "1.5px solid #bae6fd", borderRadius: 14, padding: "14px 20px", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <span style={{ fontSize: "1.3rem" }}>⚡</span>
          <div>
            <p style={{ fontWeight: 700, fontSize: "0.88rem", color: "#0369a1", marginBottom: 2 }}>Upgrade to Advanced on this page</p>
            <p style={{ fontSize: "0.8rem", color: "#0284c7" }}>{savings.advanced} · <strong>Save {savings.advancedSaving}</strong></p>
          </div>
        </div>
        <button
          onClick={() => onUpgrade("Advanced Features", "advanced")}
          style={{ background: "linear-gradient(135deg, #1e293b, #334155)", color: "#fff", border: "none", padding: "9px 16px", borderRadius: 10, fontWeight: 700, fontSize: "0.82rem", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}
        >
          ⚡ Go Advanced
        </button>
      </div>
    );
  }

  return null;
}