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
  onAnyConnectionUpdate?: (updated: Record<string, unknown>) => void;
  onAnyVacancyUpdate?: (updated: Record<string, unknown>) => void;
  onAnyMessageUpdate?: (updated: Record<string, unknown>) => void;
  onAnyDocumentUpdate?: (updated: Record<string, unknown>) => void;
  onAnyInvoiceUpdate?: (updated: Record<string, unknown>) => void;
  onAnySupportUpdate?: (updated: Record<string, unknown>) => void;
  onAnyFeatureRequestUpdate?: (updated: Record<string, unknown>) => void;
  onAnyShiftUpdate?: (updated: Record<string, unknown>) => void;
  onAnyUserProfileUpdate?: (updated: Record<string, unknown>) => void;
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
    onAnyConnectionUpdate,
    onAnyVacancyUpdate,
    onAnyMessageUpdate,
    onAnyDocumentUpdate,
    onAnyInvoiceUpdate,
    onAnySupportUpdate,
    onAnyFeatureRequestUpdate,
    onAnyShiftUpdate,
    onAnyUserProfileUpdate,
  } = options;

  useEffect(() => {
    const channels: ReturnType<typeof supabase.channel>[] = [];

    const watch = (
      name: string,
      table: string,
      cb: (updated: Record<string, unknown>) => void,
      filter?: string
    ) => {
      const ch = supabase
        .channel(name)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table,
            ...(filter ? { filter } : {}),
          },
          (payload) => {
            cb((payload.new ?? payload.old) as Record<string, unknown>);
          }
        )
        .subscribe();
      channels.push(ch);
    };

    // Doctor watching their own record
    if (doctorUserId && onDoctorUpdate) {
      watch(`doctor-self-${doctorUserId}`, "doctors", onDoctorUpdate, `user_id=eq.${doctorUserId}`);
    }

    // Agency watching their own record
    if (agencyId && onAgencyUpdate) {
      watch(`agency-self-${agencyId}`, "agencies", onAgencyUpdate, `id=eq.${agencyId}`);
    }

    // Admin watching everything
    if (isAdmin) {
      if (onAnyDoctorUpdate) watch("admin-doctors", "doctors", onAnyDoctorUpdate);
      if (onAnyAgencyUpdate) watch("admin-agencies", "agencies", onAnyAgencyUpdate);
      if (onAnyConnectionUpdate) watch("admin-connections", "doctor_agencies", onAnyConnectionUpdate);
      if (onAnyVacancyUpdate) watch("admin-vacancies", "vacancy_posts", onAnyVacancyUpdate);
      if (onAnyMessageUpdate) {
        watch("admin-doctor-messages", "doctor_messages", onAnyMessageUpdate);
        watch("admin-agency-messages", "agency_messages", onAnyMessageUpdate);
      }
      if (onAnyDocumentUpdate) {
        watch("admin-documents", "documents", onAnyDocumentUpdate);
        watch("admin-doc-shares", "document_share_requests", onAnyDocumentUpdate);
      }
      if (onAnyInvoiceUpdate) watch("admin-invoices", "invoices", onAnyInvoiceUpdate);
      if (onAnySupportUpdate) watch("admin-support", "support_messages", onAnySupportUpdate);
      if (onAnyFeatureRequestUpdate) watch("admin-features", "feature_requests", onAnyFeatureRequestUpdate);
      if (onAnyShiftUpdate) watch("admin-shifts", "shifts", onAnyShiftUpdate);
      if (onAnyUserProfileUpdate) watch("admin-profiles", "user_profiles", onAnyUserProfileUpdate);
    }

    // Doctor watching their own related tables
    if (doctorUserId) {
      if (onAnyConnectionUpdate) watch(`doctor-connections-${doctorUserId}`, "doctor_agencies", onAnyConnectionUpdate, `doctor_id=eq.${doctorUserId}`);
      if (onAnyShiftUpdate) watch(`doctor-shifts-${doctorUserId}`, "shifts", onAnyShiftUpdate, `doctor_id=eq.${doctorUserId}`);
      if (onAnyDocumentUpdate) watch(`doctor-docs-${doctorUserId}`, "documents", onAnyDocumentUpdate, `user_id=eq.${doctorUserId}`);
      if (onAnyMessageUpdate) watch(`doctor-messages-${doctorUserId}`, "doctor_messages", onAnyMessageUpdate, `doctor_id=eq.${doctorUserId}`);
      if (onAnyVacancyUpdate) watch(`doctor-vacancies-${doctorUserId}`, "vacancy_posts", onAnyVacancyUpdate);
    }

    // Agency watching their own related tables
    if (agencyId) {
      if (onAnyConnectionUpdate) watch(`agency-connections-${agencyId}`, "doctor_agencies", onAnyConnectionUpdate, `agency_id=eq.${agencyId}`);
      if (onAnyVacancyUpdate) watch(`agency-vacancies-${agencyId}`, "vacancy_posts", onAnyVacancyUpdate, `agency_id=eq.${agencyId}`);
      if (onAnyMessageUpdate) watch(`agency-messages-${agencyId}`, "agency_messages", onAnyMessageUpdate, `agency_id=eq.${agencyId}`);
      if (onAnyInvoiceUpdate) watch(`agency-invoices-${agencyId}`, "invoices", onAnyInvoiceUpdate, `agency_id=eq.${agencyId}`);
      if (onAnyDocumentUpdate) watch(`agency-doc-shares-${agencyId}`, "document_share_requests", onAnyDocumentUpdate, `agency_id=eq.${agencyId}`);
    }

    return () => {
      channels.forEach((ch) => supabase.removeChannel(ch));
    };
  }, [doctorUserId, agencyId, isAdmin]);
}