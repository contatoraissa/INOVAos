import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createHash } from "node:crypto";
import { z } from "zod";
import { getAccountSession } from "./account-session";
import { authorize } from "./real-consultation";
import { databaseConfig, databaseRequest } from "./supabase.server";
import { parseRawGenetics } from "./genetic-raw-parser";
import type { RawStats } from "./genetic-raw-contract";
const scope = z.object({ patientId: z.string().uuid() });
function guard() {
  const r = getRequest();
  if (r.headers.get("origin") !== new URL(r.url).origin)
    throw new Error("Solicitação não autorizada.");
}
export const listAccountNotifications = createServerFn({ method: "GET" }).handler(async () => {
  const account = await getAccountSession();
  if (!account) throw new Error("Entre na sua conta.");
  return databaseRequest(
    databaseConfig()!,
    `inova_notifications?user_id=eq.${account.userId}&select=id,title,patient_id,created_at,read_at&order=created_at.desc&limit=100`,
  ) as Promise<
    { id: string; title: string; patient_id: string; created_at: string; read_at: string | null }[]
  >;
});
export const readAccountNotifications = createServerFn({ method: "POST" }).handler(async () => {
  guard();
  const account = await getAccountSession();
  if (!account) throw new Error("Entre na sua conta.");
  return databaseRequest(databaseConfig()!, "rpc/inova_mark_notifications_read", {
    p_user: account.userId,
  });
});
export const listRealGenetics = createServerFn({ method: "GET" })
  .validator(scope)
  .handler(async ({ data }) => {
    const { config, doctorId } = await authorize(data.patientId);
    return databaseRequest(
      config,
      `inova_real_genetics?patient_id=eq.${data.patientId}&doctor_id=eq.${doctorId}&select=id,filename,created_at,reviewed_at,stats&order=created_at.desc`,
    ) as Promise<
      {
        id: string;
        filename: string;
        created_at: string;
        reviewed_at: string | null;
        stats: RawStats;
      }[]
    >;
  });
export const importRealGenetics = createServerFn({ method: "POST" })
  .validator(
    scope.extend({
      filename: z
        .string()
        .max(200)
        .regex(/\.txt$/i),
      text: z.string().min(1).max(26214400),
      confirmed: z.literal(true),
    }),
  )
  .handler(async ({ data }) => {
    guard();
    const { config, account, doctorId } = await authorize(data.patientId);
    const stats = parseRawGenetics(data.text),
      hash = createHash("sha256").update(data.text, "utf8").digest("hex");
    return databaseRequest(config, "rpc/inova_save_real_genetics", {
      p_patient: data.patientId,
      p_doctor: doctorId,
      p_author: account.userId,
      p_filename: data.filename,
      p_text: data.text,
      p_hash: hash,
      p_stats: stats,
    });
  });
export const originalRealGenetics = createServerFn({ method: "POST" })
  .validator(scope.extend({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    guard();
    const { config, doctorId } = await authorize(data.patientId);
    const rows = (await databaseRequest(
      config,
      `inova_real_genetics?id=eq.${data.id}&patient_id=eq.${data.patientId}&doctor_id=eq.${doctorId}&select=filename,original_text,sha256&limit=1`,
    )) as { filename: string; original_text: string; sha256: string }[];
    if (!rows[0]) throw new Error("Arquivo não encontrado nesta conta.");
    if (createHash("sha256").update(rows[0].original_text, "utf8").digest("hex") !== rows[0].sha256)
      throw new Error("Falha na integridade do arquivo genético. Download interrompido.");
    return rows[0];
  });
export const reviewRealGenetics = createServerFn({ method: "POST" })
  .validator(scope.extend({ id: z.string().uuid(), confirmed: z.literal(true) }))
  .handler(async ({ data }) => {
    guard();
    const { config, account, doctorId } = await authorize(data.patientId);
    if (account.account_type !== "doctor")
      throw new Error("Somente o médico pode revisar o arquivo.");
    const rows = (await databaseRequest(
      config,
      `inova_real_genetics?id=eq.${data.id}&patient_id=eq.${data.patientId}&doctor_id=eq.${doctorId}&select=id`,
    )) as unknown[];
    if (!rows.length) throw new Error("Arquivo não encontrado.");
    return databaseRequest(config, "rpc/inova_review_real_genetics", {
      p_id: data.id,
      p_doctor: doctorId,
    });
  });
