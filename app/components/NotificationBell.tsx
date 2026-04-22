"use client";

import { useState, useRef, useEffect } from "react";
import { useNotifications } from "../hooks/useNotifications";

export default function NotificationBell({ userId }: { userId: string }) {
  const { notifications, unreadCount, markAllRead, markOneRead } = useNotifications(userId);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const getIcon = (type: string) => {
    if (type === "success") return "✅";
    if (type === "warning") return "⚠️";
    if (type === "error") return "❌";
    return "🔔";
  };

  const getColor = (type: string) => {
    if (type === "success") return "#f0fdf4";
    if (type === "warning") return "#fffbeb";
    if (type === "error") return "#fef2f2";
    return "#f5f3ff";
  };

  return (
    <div ref={ref} style={{ position: "relative", zIndex: 50 }}>
      {/* Bell Button */}
      <button
        onClick={() => { setOpen(!open); if (!open && unreadCount > 0) markAllRead(); }}
        style={{ position: "relative", background: "#f8f9fc", border: "1.5px solid #e2e8f0", borderRadius: 12, width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "1.1rem", flexShrink: 0 }}
      >
        🔔
        {unreadCount > 0 && (
          <span style={{ position: "absolute", top: -4, right: -4, background: "#ef4444", color: "#fff", fontSize: "0.6rem", fontWeight: 700, width: 18, height: 18, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #fff" }}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{ position: "absolute", top: 48, right: 0, width: 340, background: "#fff", borderRadius: 16, boxShadow: "0 8px 32px rgba(0,0,0,0.12)", border: "1px solid #e2e8f0", zIndex: 100, overflow: "hidden" }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: "1px solid #f1f5f9" }}>
            <p style={{ fontWeight: 700, fontSize: "0.95rem", color: "#0f172a" }}>Notifications</p>
            {unreadCount > 0 && (
              <button onClick={markAllRead} style={{ fontSize: "0.75rem", color: "#7c3aed", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ maxHeight: 380, overflowY: "auto" }}>
            {notifications.length === 0 ? (
              <div style={{ textAlign: "center", padding: "32px 24px", color: "#94a3b8" }}>
                <div style={{ fontSize: "2rem", marginBottom: 8 }}>🔔</div>
                <p style={{ fontSize: "0.85rem" }}>No notifications yet</p>
              </div>
            ) : notifications.map(notif => (
              <div
                key={notif.id}
                onClick={() => markOneRead(notif.id)}
                style={{ display: "flex", gap: 12, padding: "12px 16px", borderBottom: "1px solid #f8f9fc", background: notif.read ? "#fff" : getColor(notif.type), cursor: "pointer", transition: "background 0.15s" }}
              >
                <div style={{ fontSize: "1.1rem", flexShrink: 0, marginTop: 2 }}>{getIcon(notif.type)}</div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, fontSize: "0.85rem", color: "#0f172a", marginBottom: 2 }}>{notif.title}</p>
                  <p style={{ fontSize: "0.78rem", color: "#64748b", lineHeight: 1.5 }}>{notif.message}</p>
                  <p style={{ fontSize: "0.7rem", color: "#94a3b8", marginTop: 4 }}>
                    {new Date(notif.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                {!notif.read && (
                  <div style={{ width: 8, height: 8, background: "#7c3aed", borderRadius: "50%", flexShrink: 0, marginTop: 6 }} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}