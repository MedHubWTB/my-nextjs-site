"use client";

import { useEffect } from "react";
import { supabase } from "../lib/supabase";

type SyncOptions = {
  doctorUserId?: string;
  onDoctorUpdate?: (updated: Record<string, unknown>) => void;
  agencyId?: string;
  onAgencyUpdate?: (updated: Record<string, unknown>) => void;
  isAdmin?: boolean;
  onAnyDoctorUpdate?: (updated: Record<string, unknown>) => void;
  onAnyAgencyUpdate?: (updated: Record<string, unknown>) => void;
};

export function useRealtimeSync(options: SyncOptions) {
  const {
    doctorUserId,
    onDoctorUpdate,
    agencyId,
    onAgencyUpdate,
    isAdmin,
    onAnyDoctorUpdate,
    onAnyAgencyUpdate,
  } = options;

  useEffect(() => {
    const channels: ReturnType<typeof supabase.channel>[] = [];

    // Doctor watching their own record
    if (doctorUserId && onDoctorUpdate) {
      const ch = supabase
        .channel(`doctor-self-${doctorUserId}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "doctors",
            filter: `user_id=eq.${doctorUserId}`,
          },
          (payload) => {
            onDoctorUpdate(payload.new as Record<string, unknown>);
          }
        )
        .subscribe();
      channels.push(ch);
    }

    // Agency watching their own record
    if (agencyId && onAgencyUpdate) {
      const ch = supabase
        .channel(`agency-self-${agencyId}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "agencies",
            filter: `id=eq.${agencyId}`,
          },
          (payload) => {
            onAgencyUpdate(payload.new as Record<string, unknown>);
          }
        )
        .subscribe();
      channels.push(ch);
    }

    // Admin watching ALL doctors
    if (isAdmin && onAnyDoctorUpdate) {
      const ch = supabase
        .channel("admin-all-doctors")
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "doctors" },
          (payload) => {
            onAnyDoctorUpdate(payload.new as Record<string, unknown>);
          }
        )
        .subscribe();
      channels.push(ch);
    }

    // Admin watching ALL agencies
    if (isAdmin && onAnyAgencyUpdate) {
      const ch = supabase
        .channel("admin-all-agencies")
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "agencies" },
          (payload) => {
            onAnyAgencyUpdate(payload.new as Record<string, unknown>);
          }
        )
        .subscribe();
      channels.push(ch);
    }

    // Cleanup when page closes
    return () => {
      channels.forEach((ch) => supabase.removeChannel(ch));
    };
  }, [doctorUserId, agencyId, isAdmin]);
}