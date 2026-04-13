export default function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizes = {
    sm: { box: 24, font: "0.8rem" },
    md: { box: 32, font: "0.95rem" },
    lg: { box: 40, font: "1.2rem" },
  };
  const s = sizes[size];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{
        width: s.box, height: s.box,
        background: "linear-gradient(135deg, #1e293b 0%, #334155 100%)",
        borderRadius: 8,
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 2px 8px rgba(51,65,85,0.25)",
        flexShrink: 0,
      }}>
        <span style={{ color: "#fff", fontWeight: 800, fontSize: s.font, fontFamily: "inherit", letterSpacing: "-0.02em" }}>Q</span>
      </div>
      <span style={{ fontWeight: 700, fontSize: size === "lg" ? "1.2rem" : "1rem", color: "#1e293b", letterSpacing: "-0.02em" }}>
        Quiet<span style={{ color: "#7c3aed" }}>Medical</span>
      </span>
    </div>
  );
}