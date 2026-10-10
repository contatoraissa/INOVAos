import { createServerFn } from "@tanstack/react-start";
import { medicalOwner, listDoctorConsultationEntries } from "./real-workspace";
import type { getDoctorWork } from "./care";

// A data adapter lets the approved work queue and charts keep their exact UI.
export const getRealDoctorWork = createServerFn({ method: "GET" }).handler(
  async (): Promise<Awaited<ReturnType<typeof getDoctorWork>>> => {
    const { account } = await medicalOwner();
    const entries = await listDoctorConsultationEntries();
    return [...new Set(entries.map((e) => e.patient_id))].map((patientId) => {
      const rows = entries.filter((e) => e.patient_id === patientId);
      return {
        patientId,
        returnPersistence: "supabase",
        progress: [],
        submissions: rows
          .filter((e) => e.kind === "preparation" && e.status !== "cancelled")
          .map((e) => ({
            id: e.id,
            patientId,
            ...(e.payload.orderId ? { orderId: e.payload.orderId } : {}),
            receivedAt: e.created_at,
            reviewed: e.status === "reviewed",
            reviewedAt: e.status === "reviewed" ? e.updated_at : null,
            notes: {
              symptoms: e.payload.symptoms,
              medicines: e.payload.medicines,
              questions: e.payload.questions,
            },
            audios: Array.from({ length: e.audioCount }, (_, index) => ({
              index,
              field: "symptoms" as const,
              mime: "audio/webm",
              duration: null,
              bytes: 0,
            })),
            documents: e.documentNames.map((name, index) => ({
              index,
              name,
              kind: "PDF",
              bytes: 0,
            })),
          })),
        orders: rows
          .filter((e) => e.kind === "order")
          .map((e) => ({
            id: e.id,
            patientId,
            doctorName: account.full_name,
            doctorCrm: "",
            createdAt: e.created_at,
            releasedAt: e.status === "published" ? e.updated_at : null,
            cancelledAt: e.status === "cancelled" ? e.updated_at : null,
            status:
              e.status === "published"
                ? "released"
                : e.status === "cancelled"
                  ? "cancelled"
                  : "draft",
            exams: e.payload.exams.map((name) => ({ id: name, name })),
            notes: e.payload.text,
          })),
        guidance: rows
          .filter((e) => e.kind === "guidance")
          .map((e) => ({
            id: e.id,
            patientId,
            title: e.payload.title,
            text: e.payload.text,
            category: e.payload.category ?? "Próximos passos",
            sourceName: e.payload.sourceName ?? "",
            sourceUrl: e.payload.sourceUrl ?? "",
            sourceDate: e.payload.sourceDate ?? "",
            orderId: e.payload.orderId ?? null,
            doctorName: account.full_name,
            reviewed: e.status === "published",
            createdAt: e.created_at,
            publishedAt: e.status === "published" ? e.updated_at : null,
            withdrawnAt: e.status === "cancelled" ? e.updated_at : null,
          })),
        returns: rows
          .filter((e) => e.kind === "return")
          .map((e) => ({
            id: e.id,
            patientId,
            title: e.payload.title,
            notes: e.payload.text,
            date: e.payload.date || null,
            days: null,
            targetDate: e.payload.date,
            doctorName: account.full_name,
            createdAt: e.created_at,
            publishedAt: e.status === "published" ? e.updated_at : null,
            cancelledAt: e.status === "cancelled" ? e.updated_at : null,
          })),
      };
    });
  },
);
