import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { randomUUID, createHash } from "node:crypto";
import { z } from "zod";
import { getAccountSession } from "./account-session";
import { databaseConfig, databaseRequest } from "./supabase.server";
import { reportInput, summarySchema, type DocumentSummary } from "./ai-contract";
import { decodePdf, analyzeWithGemini } from "./gemini-core.server";
export type MedicalReport = {
  id: string;
  patient_id: string;
  doctor_id: string;
  filename: string;
  kind: "Laboratorial" | "Genética" | "Genômica";
  object_path: string;
  summary: DocumentSummary | null;
  reviewed_at: string | null;
  created_at: string;
  sha256: string;
};
export type MedicalResult = {
  id: number;
  name: string;
  value: string;
  unit: string;
  reference: string;
  collection_date: string;
  flag: string;
  source_page: number | null;
  report_id: string;
};
const patientInput = z.object({ patientId: z.string().uuid() });
export const listMedicalExamOverview = createServerFn({ method: "GET" }).handler(async () => {
  const account = await getAccountSession();
  if (!account?.canPreview) throw new Error("Acesso médico não autorizado.");
  const config = databaseConfig()!;
  return {
    reports: (await databaseRequest(
      config,
      `inova_medical_reports?doctor_id=eq.${account.userId}&select=id,patient_id,filename,kind,created_at,reviewed_at&order=created_at.desc`,
    )) as Pick<
      MedicalReport,
      "id" | "patient_id" | "filename" | "kind" | "created_at" | "reviewed_at"
    >[],
    results: (await databaseRequest(
      config,
      `inova_medical_results?doctor_id=eq.${account.userId}&select=*&order=collection_date.desc`,
    )) as (MedicalResult & { patient_id: string })[],
  };
});
const documentInput = patientInput.extend({ id: z.string().uuid() });
function mutation() {
  const request = getRequest();
  if (request.headers.get("origin") !== new URL(request.url).origin)
    throw new Error("Solicitação não autorizada.");
}
async function access(patientId: string) {
  const account = await getAccountSession();
  if (!account?.canPreview) throw new Error("Acesso médico não autorizado.");
  const config = databaseConfig()!;
  const rows = (await databaseRequest(
    config,
    `inova_medical_patients?id=eq.${patientId}&doctor_id=eq.${account.userId}&select=id&limit=1`,
  )) as unknown[];
  if (!rows.length) throw new Error("Paciente não encontrado na sua conta.");
  return { account, config };
}
async function document(patientId: string, id: string) {
  const context = await access(patientId);
  const rows = (await databaseRequest(
    context.config,
    `inova_medical_reports?id=eq.${id}&patient_id=eq.${patientId}&doctor_id=eq.${context.account.userId}&select=*&limit=1`,
  )) as MedicalReport[];
  if (!rows[0]) throw new Error("Documento não encontrado na sua conta.");
  return { ...context, report: rows[0] };
}
function headers(key: string) {
  return {
    apikey: key,
    ...(key.startsWith("sb_secret_") ? {} : { Authorization: `Bearer ${key}` }),
  };
}
export const listMedicalReports = createServerFn({ method: "GET" })
  .validator(patientInput)
  .handler(async ({ data }) => {
    const { account, config } = await access(data.patientId);
    return {
      reports: (await databaseRequest(
        config,
        `inova_medical_reports?patient_id=eq.${data.patientId}&doctor_id=eq.${account.userId}&select=*&order=created_at.desc`,
      )) as MedicalReport[],
      results: (await databaseRequest(
        config,
        `inova_medical_results?patient_id=eq.${data.patientId}&doctor_id=eq.${account.userId}&select=*&order=collection_date.asc`,
      )) as MedicalResult[],
    };
  });
export const uploadMedicalReport = createServerFn({ method: "POST" })
  .validator(
    patientInput.extend({
      filename: z.string().trim().min(1).max(200),
      kind: reportInput.shape.kind,
      pdf: reportInput.shape.pdf,
    }),
  )
  .handler(async ({ data }) => {
    mutation();
    const { account, config } = await access(data.patientId);
    decodePdf({ kind: data.kind, pdf: data.pdf });
    const bytes = Buffer.from(data.pdf, "base64");
    const hash = createHash("sha256").update(bytes).digest("hex");
    const existing = (await databaseRequest(
      config,
      `inova_medical_reports?patient_id=eq.${data.patientId}&doctor_id=eq.${account.userId}&kind=eq.${encodeURIComponent(data.kind)}&sha256=eq.${hash}&select=*&limit=1`,
    )) as MedicalReport[];
    if (existing[0]) return existing[0];
    const id = randomUUID();
    const path = `${account.userId}/${data.patientId}/${id}.pdf`;
    const response = await fetch(`${config.url}/storage/v1/object/inova-reports/${path}`, {
      method: "POST",
      headers: { ...headers(config.key), "Content-Type": "application/pdf", "x-upsert": "false" },
      body: new Uint8Array(bytes),
      signal: AbortSignal.timeout(30000),
    }).catch(() => null);
    if (!response?.ok)
      throw new Error(
        "Não foi possível guardar o PDF. Confira a instalação do SQL de exames e o Storage.",
      );
    try {
      return (await databaseRequest(config, "rpc/inova_register_medical_report", {
        p_id: id,
        p_doctor: account.userId,
        p_patient: data.patientId,
        p_filename: data.filename,
        p_kind: data.kind,
        p_path: path,
        p_hash: hash,
        p_bytes: bytes.length,
      })) as MedicalReport;
    } catch {
      await fetch(`${config.url}/storage/v1/object/inova-reports`, {
        method: "DELETE",
        headers: { ...headers(config.key), "Content-Type": "application/json" },
        body: JSON.stringify({ prefixes: [path] }),
        signal: AbortSignal.timeout(10000),
      }).catch(() => null);
      throw new Error(
        "O documento não foi registrado. Atualize a lista antes de tentar novamente.",
      );
    }
  });
export const openMedicalReport = createServerFn({ method: "POST" })
  .validator(documentInput)
  .handler(async ({ data }) => {
    mutation();
    const { config, report } = await document(data.patientId, data.id);
    const response = await fetch(
      `${config.url}/storage/v1/object/sign/inova-reports/${report.object_path}`,
      {
        method: "POST",
        headers: { ...headers(config.key), "Content-Type": "application/json" },
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
const analyzing = new Set<string>();
let attempts: number[] = [];
export const analyzeMedicalReport = createServerFn({ method: "POST" })
  .validator(documentInput.extend({ consent: z.literal(true), regenerate: z.boolean().optional() }))
  .handler(async ({ data }) => {
    mutation();
    const { config, account, report } = await document(data.patientId, data.id);
    if (report.reviewed_at) throw new Error("Este laudo já foi revisado.");
    if (report.summary && !data.regenerate) return report;
    attempts = attempts.filter((t) => Date.now() - t < 60000);
    if (analyzing.size >= 2 || analyzing.has(report.id) || attempts.length >= 10)
      throw new Error("Aguarde as análises em andamento antes de tentar novamente.");
    analyzing.add(report.id);
    attempts.push(Date.now());
    try {
      const response = await fetch(
        `${config.url}/storage/v1/object/authenticated/inova-reports/${report.object_path}`,
        { headers: headers(config.key), signal: AbortSignal.timeout(30000) },
      );
      if (!response.ok) throw new Error("Não foi possível ler o PDF salvo.");
      const bytes = Buffer.from(await response.arrayBuffer());
      if (createHash("sha256").update(bytes).digest("hex") !== report.sha256)
        throw new Error(
          "O PDF salvo não corresponde ao documento registrado. Análise interrompida.",
        );
      const result = await analyzeWithGemini(
        { kind: report.kind, pdf: bytes.toString("base64") },
        {
          key: process.env["GEMINI_API_KEY"] ?? "",
          model: process.env["GEMINI_MODEL"] ?? "gemini-2.5-flash",
        },
      );
      if (!result.ok) throw new Error(result.error);
      return (await databaseRequest(config, "rpc/inova_analyze_medical_report", {
        p_id: report.id,
        p_doctor: account.userId,
        p_summary: summarySchema.parse(result.summary),
        p_model: result.model,
      })) as MedicalReport;
    } finally {
      analyzing.delete(report.id);
    }
  });
export const reviewMedicalReport = createServerFn({ method: "POST" })
  .validator(
    documentInput.extend({
      confirmed: z.literal(true),
      collectionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    }),
  )
  .handler(async ({ data }) => {
    mutation();
    const { config, account, report } = await document(data.patientId, data.id);
    summarySchema.parse(report.summary);
    return (await databaseRequest(config, "rpc/inova_review_medical_report", {
      p_id: report.id,
      p_doctor: account.userId,
      p_date: data.collectionDate,
    })) as MedicalReport;
  });

export const saveManualMedicalResults = createServerFn({ method: "POST" })
  .validator(
    documentInput.extend({
      confirmed: z.literal(true),
      collectionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      observations: z
        .array(
          z.object({
            name: z.string().trim().min(1).max(180),
            value: z.string().trim().min(1).max(120),
            unit: z.string().trim().max(100),
            reference: z.string().trim().max(300),
          }),
        )
        .min(1)
        .max(100),
    }),
  )
  .handler(async ({ data }) => {
    mutation();
    const { config, account, report } = await document(data.patientId, data.id);
    if (report.kind !== "Laboratorial" || report.reviewed_at)
      throw new Error("Laudo indisponível para lançamento manual.");
    const summary = summarySchema.parse({
      subjectName: report.summary?.subjectName ?? null,
      pages: report.summary?.pages ?? 1,
      scope:
        "Resultados preenchidos ou corrigidos e confirmados pelo médico no documento original.",
      findings: [],
      limitations: [],
      observations: data.observations.map((item) => ({
        ...item,
        collection: data.collectionDate,
        flag: "sem_classificacao",
        page: null,
        quote: "",
      })),
    });
    return databaseRequest(config, "rpc/inova_review_manual_results", {
      p_id: report.id,
      p_doctor: account.userId,
      p_date: data.collectionDate,
      p_summary: summary,
    });
  });
