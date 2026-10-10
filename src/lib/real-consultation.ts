import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { getAccountSession } from "./account-session";
import { databaseConfig, databaseRequest } from "./supabase.server";
import { consultationInput, type ConsultationEntry } from "./real-consultation-contract";
import { decodePdf } from "./gemini-core.server";
import { audioMatches } from "./preparation-store.server";
import type { MedicalResult, MedicalReport } from "./medical-reports";
import { reviewedResults } from "./account-records";
import { visiblePatientEntries } from "./account-patient-visibility";
function guard() {
  const r = getRequest();
  if (r.headers.get("origin") !== new URL(r.url).origin)
    throw new Error("Solicitação não autorizada.");
}
export async function authorize(patientId: string) {
  const account = await getAccountSession();
  if (!account) throw new Error("Entre na sua conta.");
  const config = databaseConfig()!;
  if (account.account_type === "doctor") {
    if (!account.canPreview) throw new Error("Acesso médico não autorizado.");
    const rows = (await databaseRequest(
      config,
      `inova_medical_patients?id=eq.${patientId}&doctor_id=eq.${account.userId}&select=id`,
    )) as unknown[];
    if (!rows.length) throw new Error("Paciente não encontrado na sua conta.");
    return { account, config, doctorId: account.userId };
  }
  const links = (await databaseRequest(
    config,
    `inova_portal_links?patient_id=eq.${patientId}&user_id=eq.${account.userId}&select=doctor_id`,
  )) as { doctor_id: string }[];
  if (!links[0]) throw new Error("Seu cadastro ainda não está vinculado a este prontuário.");
  return { account, config, doctorId: links[0].doctor_id };
}
export const listPortalLinks = createServerFn({ method: "GET" }).handler(async () => {
  const account = await getAccountSession();
  if (account?.account_type !== "patient") throw new Error("Entre na sua conta de paciente.");
  const config = databaseConfig()!;
  const links = (await databaseRequest(
    config,
    `inova_portal_links?user_id=eq.${account.userId}&select=patient_id,doctor_id`,
  )) as { patient_id: string; doctor_id: string }[];
  return Promise.all(
    links.map(async (link) => {
      const profile = (await databaseRequest(
        config,
        `inova_profiles?id=eq.${link.doctor_id}&select=display_name&limit=1`,
      )) as { display_name: string }[];
      return { ...link, doctorName: profile[0]?.display_name ?? "Seu médico" };
    }),
  );
});
export const linkPatientPortal = createServerFn({ method: "POST" })
  .validator(
    z.object({
      patientId: z.string().uuid(),
      email: z.string().trim().email(),
      confirmed: z.literal(true),
    }),
  )
  .handler(async ({ data }) => {
    guard();
    const { account, config, doctorId } = await authorize(data.patientId);
    if (account.account_type !== "doctor")
      throw new Error("Apenas o médico pode vincular o cadastro.");
    return databaseRequest(config, "rpc/inova_link_patient_portal", {
      p_doctor: doctorId,
      p_patient: data.patientId,
      p_email: data.email,
    });
  });
export const listConsultationEntries = createServerFn({ method: "GET" })
  .validator(z.object({ patientId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { account, config, doctorId } = await authorize(data.patientId);
    const rows = (await databaseRequest(
      config,
      `inova_consultation_entries?patient_id=eq.${data.patientId}&doctor_id=eq.${doctorId}${account.account_type === "patient" ? "&status=in.(published,reviewed,cancelled)&kind=in.(preparation,order,guidance,return)" : ""}&select=*&order=created_at.desc`,
    )) as ConsultationEntry[];
    if (account.account_type !== "patient") return rows;
    // A cancelled draft must never become visible. Only retain cancellations of
    // records previously published to this patient (evidenced by their notification).
    const published = rows.some((e) => e.status === "cancelled")
      ? ((await databaseRequest(
          config,
          `inova_notifications?user_id=eq.${account.userId}&patient_id=eq.${data.patientId}&event=eq.published&entry_id=not.is.null&select=entry_id`,
        )) as { entry_id: string }[])
      : [];
    return visiblePatientEntries(rows, new Set(published.map((n) => n.entry_id)));
  });
export const saveConsultationEntry = createServerFn({ method: "POST" })
  .validator(consultationInput)
  .handler(async ({ data }) => {
    guard();
    const { account, config, doctorId } = await authorize(data.patientId);
    if (account.account_type === "patient" && data.kind !== "preparation")
      throw new Error("Paciente pode enviar apenas sua preparação.");
    if (account.account_type === "doctor" && data.kind === "preparation")
      throw new Error("O envio deve ser feito pela conta vinculada do paciente.");
    if (
      data.kind !== "preparation" &&
      (data.payload.audio ||
        data.payload.document ||
        data.payload.audios.length ||
        data.payload.documents.length)
    )
      throw new Error("Anexo indisponível para esta seção.");
    if (
      data.kind === "preparation" &&
      ![data.payload.symptoms, data.payload.medicines, data.payload.questions].some((t) =>
        t.trim(),
      ) &&
      !data.payload.audio &&
      !data.payload.document &&
      !data.payload.audios.length &&
      !data.payload.documents.length
    )
      throw new Error("Escreva ou grave algo antes de enviar.");
    if (data.kind === "order" && !data.payload.exams.length)
      throw new Error("Selecione os exames do pedido.");
    if (
      data.kind === "guidance" &&
      data.payload.category === "Preparo dos exames" &&
      (!data.payload.orderId ||
        !data.payload.sourceName ||
        !data.payload.sourceUrl ||
        !data.payload.sourceDate)
    )
      throw new Error(
        "Preparo exige um pedido liberado, fonte, link e data da instrução conferida.",
      );
    if (data.payload.orderId) {
      const orders = (await databaseRequest(
        config,
        `inova_consultation_entries?id=eq.${data.payload.orderId}&patient_id=eq.${data.patientId}&doctor_id=eq.${doctorId}&kind=eq.order&status=eq.published&select=id`,
      )) as unknown[];
      if (!orders.length) throw new Error("Pedido não encontrado ou retirado deste prontuário.");
    }
    if (
      data.kind === "return" &&
      (!data.payload.date ||
        !Number.isFinite(Date.parse(data.payload.date)) ||
        new Date(data.payload.date + "T23:59:59") < new Date())
    )
      throw new Error("Informe uma data futura para o retorno.");
    const documents = [
      ...data.payload.documents,
      ...(data.payload.document ? [data.payload.document] : []),
    ];
    const audios = [...data.payload.audios, ...(data.payload.audio ? [data.payload.audio] : [])];
    if (documents.length > 3 || audios.length > 3)
      throw new Error("Use até três PDFs e três áudios por envio.");
    for (const attachment of documents) decodePdf({ kind: "Laboratorial", pdf: attachment.data });
    for (const attachment of audios) {
      const raw = attachment.data;
      if (!/^[A-Za-z0-9+/]+={0,2}$/.test(raw) || raw.length % 4 !== 0)
        throw new Error("Áudio inválido.");
      const bytes = Buffer.from(raw, "base64");
      if (bytes.toString("base64") !== raw || !audioMatches(bytes, attachment.mime))
        throw new Error("O conteúdo do áudio não corresponde ao formato informado.");
      if (!bytes.length || bytes.length > 5 * 1024 * 1024)
        throw new Error("Áudio deve ter até 5 MB.");
    }
    const prior = (await databaseRequest(
      config,
      `inova_consultation_entries?request_id=eq.${data.requestId}&doctor_id=eq.${doctorId}&patient_id=eq.${data.patientId}&select=id`,
    )) as { id: string }[];
    if (prior[0]) return prior[0];
    return databaseRequest(config, "rpc/inova_save_consultation_entry", {
      p_patient: data.patientId,
      p_doctor: doctorId,
      p_author: account.userId,
      p_request: data.requestId,
      p_kind: data.kind,
      p_payload: data.payload,
    });
  });
export const transitionConsultationEntry = createServerFn({ method: "POST" })
  .validator(
    z.object({
      patientId: z.string().uuid(),
      id: z.string().uuid(),
      status: z.enum(["published", "reviewed", "cancelled"]),
      confirmed: z.literal(true),
    }),
  )
  .handler(async ({ data }) => {
    guard();
    const { account, config, doctorId } = await authorize(data.patientId);
    if (account.account_type !== "doctor")
      throw new Error("Apenas o médico pode confirmar a revisão.");
    const rows = (await databaseRequest(
      config,
      `inova_consultation_entries?id=eq.${data.id}&patient_id=eq.${data.patientId}&doctor_id=eq.${doctorId}&select=id`,
    )) as unknown[];
    if (!rows.length) throw new Error("Registro não encontrado.");
    return databaseRequest(config, "rpc/inova_consultation_transition", {
      p_id: data.id,
      p_doctor: doctorId,
      p_status: data.status,
    });
  });
export const getRealPatientOverview = createServerFn({ method: "GET" })
  .validator(z.object({ patientId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { account, config, doctorId } = await authorize(data.patientId);
    const patients = (await databaseRequest(
      config,
      `inova_medical_patients?id=eq.${data.patientId}&doctor_id=eq.${doctorId}&select=name,birth&limit=1`,
    )) as { name: string; birth: string }[];
    const results = (await databaseRequest(
      config,
      `inova_medical_results?patient_id=eq.${data.patientId}&doctor_id=eq.${doctorId}&select=*&order=collection_date.asc`,
    )) as MedicalResult[];
    const reports = (await databaseRequest(
      config,
      `inova_medical_reports?patient_id=eq.${data.patientId}&doctor_id=eq.${doctorId}&reviewed_at=not.is.null&select=id,filename,kind,created_at,reviewed_at&order=created_at.desc`,
    )) as Pick<MedicalReport, "id" | "filename" | "kind" | "created_at" | "reviewed_at">[];
    // Patients see only values from reports already released by medical review.
    return {
      profile: patients[0],
      results:
        account.account_type === "patient"
          ? reviewedResults(
              results,
              reports.map((report) => report.id),
            )
          : results,
      reports,
    };
  });
export const openPatientReviewedReport = createServerFn({ method: "POST" })
  .validator(z.object({ patientId: z.string().uuid(), id: z.string().uuid() }))
  .handler(async ({ data }) => {
    guard();
    const { config, doctorId } = await authorize(data.patientId);
    const rows = (await databaseRequest(
      config,
      `inova_medical_reports?id=eq.${data.id}&patient_id=eq.${data.patientId}&doctor_id=eq.${doctorId}&reviewed_at=not.is.null&select=object_path&limit=1`,
    )) as { object_path: string }[];
    if (!rows[0]) throw new Error("Laudo revisado não encontrado.");
    const response = await fetch(
      `${config.url}/storage/v1/object/sign/inova-reports/${rows[0].object_path}`,
      {
        method: "POST",
        headers: {
          apikey: config.key,
          Authorization: `Bearer ${config.key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ expiresIn: 120 }),
        signal: AbortSignal.timeout(15000),
      },
    );
    if (!response.ok) throw new Error("Não foi possível abrir o PDF.");
    const result = await response.json();
    if (typeof result.signedURL !== "string" || !result.signedURL.startsWith("/object/sign/"))
      throw new Error("Endereço do documento inválido.");
    return { url: config.url + "/storage/v1" + result.signedURL };
  });
