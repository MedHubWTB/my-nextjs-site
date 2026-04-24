"use client";

import { useEffect } from "react";
import { supabase } from "../lib/supabase";

export type RealtimePayload = {
  event: "INSERT" | "UPDATE" | "DELETE";
  data: Record<string, unknown>;
};

type SyncOptions = {
  doctorUserId?: string;
  onDoctorUpdate?: (payload: RealtimePayload) => void;
  agencyId?: string;
  onAgencyUpdate?: (payload: RealtimePayload) => void;
  isAdmin?: boolean;
  onAnyDoctorUpdate?: (payload: RealtimePayload) => void;
  onAnyAgencyUpdate?: (payload: RealtimePayload) => void;
  onAnyConnectionUpdate?: (payload: RealtimePayload) => void;
  onAnyVacancyUpdate?: (payload: RealtimePayload) => void;
  onAnyMessageUpdate?: (payload: RealtimePayload) => void;
  onAnyDocumentUpdate?: (payload: RealtimePayload) => void;
  onAnyInvoiceUpdate?: (payload: RealtimePayload) => void;
  onAnySupportUpdate?: (payload: RealtimePayload) => void;
  onAnyFeatureRequestUpdate?: (payload: RealtimePayload) => void;
  onAnyShiftUpdate?: (payload: RealtimePayload) => void;
  onAnyUserProfileUpdate?: (payload: RealtimePayload) => void;
  onAnyShareRequestUpdate?: (payload: RealtimePayload) => void;
  onAnyNotificationUpdate?: (payload: RealtimePayload) => void;
  onAnyExternalDoctorUpdate?: (payload: RealtimePayload) => void;
  onAnyReferenceUpdate?: (payload: RealtimePayload) => void;
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
    onAnyShareRequestUpdate,
    onAnyNotificationUpdate,
    onAnyExternalDoctorUpdate,
    onAnyReferenceUpdate,
  } = options;

  useEffect(() => {
    const channels: ReturnType<typeof supabase.channel>[] = [];

    const watch = (
      name: string,
      table: string,
      cb: (payload: RealtimePayload) => void,
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
            cb({
              event: payload.eventType as "INSERT" | "UPDATE" | "DELETE",
              data: (payload.new ?? payload.old) as Record<string, unknown>,
            });
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
      if (onAnyMessageUpdate) watch(`doctor-messages-${doctorUserId}`, "agency_messages", onAnyMessageUpdate, `doctor_id=eq.${doctorUserId}`);
      if (onAnyVacancyUpdate) watch(`doctor-vacancies-${doctorUserId}`, "vacancy_posts", onAnyVacancyUpdate);
      if (onAnyShareRequestUpdate) watch(`doctor-shares-${doctorUserId}`, "document_share_requests", onAnyShareRequestUpdate, `doctor_id=eq.${doctorUserId}`);
      if (onAnyNotificationUpdate) watch(`doctor-notifications-${doctorUserId}`, "notifications", onAnyNotificationUpdate, `user_id=eq.${doctorUserId}`);
      if (onAnyReferenceUpdate) watch(`doctor-references-${doctorUserId}`, "doctor_references", onAnyReferenceUpdate, `doctor_id=eq.${doctorUserId}`);
    }

    // Agency watching their own related tables
    if (agencyId) {
      if (onAnyConnectionUpdate) watch(`agency-connections-${agencyId}`, "doctor_agencies", onAnyConnectionUpdate, `agency_id=eq.${agencyId}`);
      if (onAnyVacancyUpdate) watch(`agency-vacancies-${agencyId}`, "vacancy_posts", onAnyVacancyUpdate, `agency_id=eq.${agencyId}`);
      if (onAnyMessageUpdate) watch(`agency-messages-${agencyId}`, "agency_messages", onAnyMessageUpdate, `agency_id=eq.${agencyId}`);
      if (onAnyInvoiceUpdate) watch(`agency-invoices-${agencyId}`, "invoices", onAnyInvoiceUpdate, `agency_id=eq.${agencyId}`);
      if (onAnyDocumentUpdate) watch(`agency-doc-shares-${agencyId}`, "document_share_requests", onAnyDocumentUpdate, `agency_id=eq.${agencyId}`);
      if (onAnyShareRequestUpdate) watch(`agency-shares-${agencyId}`, "document_share_requests", onAnyShareRequestUpdate, `agency_id=eq.${agencyId}`);
      if (onAnyNotificationUpdate) watch(`agency-notifications-${agencyId}`, "notifications", onAnyNotificationUpdate);
      if (onAnyExternalDoctorUpdate) watch(`agency-external-${agencyId}`, "external_doctors", onAnyExternalDoctorUpdate, `agency_id=eq.${agencyId}`);
    }

    return () => {
      channels.forEach((ch) => supabase.removeChannel(ch));
    };
  }, [doctorUserId, agencyId, isAdmin]);
}