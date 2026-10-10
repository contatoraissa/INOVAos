import type { ConsultationEntry, ConsultationPayload } from "./real-consultation-contract";
import type { ExamOrder } from "./exam-order-contract";
import type { MedicalGuidance } from "./care-contract";
import { orderExams } from "../data/order-exams.ts";
import type { PlannedReturn } from "./return-contract";
export function accountSubmissions(entries: ConsultationEntry[]) {
  return entries
    .filter((e) => e.kind === "preparation" && ["published", "reviewed"].includes(e.status))
    .map((e) => ({
      id: e.id,
      patientId: e.patient_id,
      ...(e.payload.orderId ? { orderId: e.payload.orderId } : {}),
      receivedAt: e.created_at,
      reviewed: e.status === "reviewed",
      reviewedAt: e.status === "reviewed" ? e.updated_at : null,
      notes: {
        symptoms: e.payload.symptoms,
        medicines: e.payload.medicines,
        questions: e.payload.questions,
      },
      audios: [...e.payload.audios, ...(e.payload.audio ? [e.payload.audio] : [])],
      documents: [...e.payload.documents, ...(e.payload.document ? [e.payload.document] : [])],
    }));
}
export function accountReturns(
  entries: ConsultationEntry[],
  doctorName = "Seu médico",
): PlannedReturn[] {
  return entries
    .filter((e) => e.kind === "return")
    .map((e) => ({
      id: e.id,
      patientId: e.patient_id,
      title: e.payload.title,
      notes: e.payload.text,
      date: e.payload.date,
      days: null,
      targetDate: e.payload.date,
      createdAt: e.created_at,
      publishedAt: e.status === "published" || e.status === "cancelled" ? e.updated_at : null,
      cancelledAt: e.status === "cancelled" ? e.updated_at : null,
      doctorName,
    }));
}

export const emptyConsultationPayload = (): ConsultationPayload => ({
  title: "",
  text: "",
  date: "",
  symptoms: "",
  medicines: "",
  questions: "",
  exams: [],
  category: "Próximos passos",
  sourceName: "",
  sourceUrl: "",
  sourceDate: "",
  orderId: null,
  audios: [],
  documents: [],
  audio: null,
  document: null,
});
export function accountOrders(
  entries: ConsultationEntry[],
  doctorName = "Seu médico",
  crm = "",
): ExamOrder[] {
  return entries
    .filter((e) => e.kind === "order")
    .map((e) => ({
      id: e.id,
      patientId: e.patient_id,
      doctorName,
      doctorCrm: crm,
      createdAt: e.created_at,
      releasedAt: e.status === "published" ? e.updated_at : null,
      cancelledAt: e.status === "cancelled" ? e.updated_at : null,
      status: e.status === "draft" ? "draft" : e.status === "cancelled" ? "cancelled" : "released",
      exams: e.payload.exams.map((name) => ({
        id: orderExams.find((x) => x.name === name)?.id ?? name,
        name,
      })),
      notes: e.payload.text,
    }));
}
export function accountGuidance(
  entries: ConsultationEntry[],
  doctorName = "Seu médico",
): MedicalGuidance[] {
  return entries
    .filter((e) => e.kind === "guidance")
    .map((e) => ({
      ...emptyConsultationPayload(),
      ...e.payload,
      patientId: e.patient_id,
      id: e.id,
      category: e.payload.category ?? "Próximos passos",
      sourceName: e.payload.sourceName ?? "",
      sourceUrl: e.payload.sourceUrl ?? "",
      sourceDate: e.payload.sourceDate ?? "",
      orderId: e.payload.orderId ?? null,
      createdAt: e.created_at,
      publishedAt: e.status === "published" ? e.updated_at : null,
      withdrawnAt: e.status === "cancelled" ? e.updated_at : null,
      doctorName,
      reviewed: e.status === "published",
    }));
}
