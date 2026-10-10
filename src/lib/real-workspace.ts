import { createServerFn, createServerOnlyFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { getAccountSession } from "./account-session";
import { authorize } from "./real-consultation";
import { databaseConfig, databaseRequest } from "./supabase.server";
import { preferenceInput, realAgendaInput } from "./real-workspace-contract";
import { readDoctorConsultationMetadata } from "./real-workspace-metadata.server";
import type { AgendaEvent } from "./agenda-contract";

export const accountMutationGuard = createServerOnlyFn(() => {
  const request = getRequest();
  if (request.headers.get("origin") !== new URL(request.url).origin)
    throw new Error("Solicitação não autorizada.");
});
export const medicalOwner = createServerOnlyFn(async () => {
  const account = await getAccountSession();
  if (!account?.canPreview || account.account_type !== "doctor")
    throw new Error("Acesso médico não autorizado.");
  return { account, config: databaseConfig()! };
});
export const listDoctorConsultationEntries = createServerFn({ method: "GET" }).handler(async () => {
  const { account, config } = await medicalOwner();
  // Lists omit large attachment contents; full contents require patient-specific authorization.
  return readDoctorConsultationMetadata(config, account.userId);
});
export const getWorkspacePreference = createServerFn({ method: "GET" })
  .validator(z.object({ kind: z.enum(["profile", "settings", "patient"]) }))
  .handler(async ({ data }) => {
    const account = await getAccountSession();
    if (
      !account ||
      (data.kind === "patient" ? account.account_type !== "patient" : !account.canPreview)
    )
      throw new Error("Acesso não autorizado.");
    const rows = (await databaseRequest(
      databaseConfig()!,
      `inova_workspace_preferences?user_id=eq.${account.userId}&kind=eq.${data.kind}&select=value&limit=1`,
    )) as { value: unknown }[];
    return rows[0]?.value ?? null;
  });
export const getDoctorProfileDefaults = createServerFn({ method: "GET" }).handler(async () => {
  const { account, config } = await medicalOwner();
  const rows = (await databaseRequest(
    config,
    `inova_account_details?user_id=eq.${account.userId}&select=crm,crm_state&limit=1`,
  )) as { crm: string; crm_state: string }[];
  return {
    name: account.full_name,
    email: account.email ?? "",
    crm: rows[0] ? `${rows[0].crm}/${rows[0].crm_state}` : "",
    specialty: "",
    phone: "",
    clinic: "",
    address: "",
  };
});
export const saveWorkspacePreference = createServerFn({ method: "POST" })
  .validator(preferenceInput)
  .handler(async ({ data }) => {
    accountMutationGuard();
    const account = await getAccountSession();
    if (
      !account ||
      (data.kind === "patient" ? account.account_type !== "patient" : !account.canPreview)
    )
      throw new Error("Acesso não autorizado.");
    if (data.kind === "patient" && data.value.progress?.length) {
      const config = databaseConfig()!;
      const charts = [...new Set(data.value.progress.map((p) => p.patientId))];
      const ids = [...new Set(data.value.progress.map((p) => p.orderId))];
      const links = (await databaseRequest(
        config,
        `inova_portal_links?user_id=eq.${account.userId}&patient_id=in.(${charts.join(",")})&select=patient_id`,
      )) as { patient_id: string }[];
      const orders = (await databaseRequest(
        config,
        `inova_consultation_entries?id=in.(${ids.join(",")})&patient_id=in.(${charts.join(",")})&kind=eq.order&status=in.(published,cancelled)&select=id,patient_id`,
      )) as { id: string; patient_id: string }[];
      if (
        data.value.progress.some(
          (p) =>
            !links.some((l) => l.patient_id === p.patientId) ||
            !orders.some((o) => o.id === p.orderId && o.patient_id === p.patientId),
        )
      )
        throw new Error("O acompanhamento contém um pedido não vinculado à sua conta.");
    }
    return databaseRequest(databaseConfig()!, "rpc/inova_save_workspace_preferences", {
      p_user: account.userId,
      p_kind: data.kind,
      p_value: data.value,
    });
  });
type AgendaRow = {
  id: string;
  patient_id: string;
  audience: "doctor" | "patient";
  title: string;
  kind: AgendaEvent["kind"];
  date: string;
  time: string;
  status: AgendaEvent["status"];
  notes: string;
  reason: string;
  order_id: string | null;
  created_at: string;
  updated_at: string;
};
export const agendaRecord = (row: AgendaRow): AgendaEvent => ({
  id: row.id,
  patientId: row.patient_id,
  audience: row.audience,
  title: row.title,
  kind: row.kind,
  date: row.date,
  time: row.time,
  status: row.status,
  notes: row.notes,
  reason: row.reason,
  ...(row.order_id ? { orderId: row.order_id } : {}),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});
export const listRealAgenda = createServerFn({ method: "GET" })
  .validator(z.object({ patientId: z.string().uuid().optional() }))
  .handler(async ({ data }) => {
    if (data.patientId) {
      const { config, doctorId } = await authorize(data.patientId);
      return (
        (await databaseRequest(
          config,
          `inova_real_agenda?doctor_id=eq.${doctorId}&patient_id=eq.${data.patientId}&select=*&order=date.asc,time.asc`,
        )) as AgendaRow[]
      ).map(agendaRecord);
    }
    const { account, config } = await medicalOwner();
    return (
      (await databaseRequest(
        config,
        `inova_real_agenda?doctor_id=eq.${account.userId}&select=*&order=date.asc,time.asc`,
      )) as AgendaRow[]
    ).map(agendaRecord);
  });
export const createRealAgendaEvent = createServerFn({ method: "POST" })
  .validator(realAgendaInput)
  .handler(async ({ data }) => {
    accountMutationGuard();
    const { account, config, doctorId } = await authorize(data.patientId);
    if (account.account_type === "patient" && data.status !== "Proposto")
      throw new Error("O paciente pode propor eventos; a confirmação cabe ao médico.");
    if (data.orderId) {
      if (data.kind !== "Exame") throw new Error("Vincule um pedido somente a um exame.");
      const orders = (await databaseRequest(
        config,
        `inova_consultation_entries?id=eq.${data.orderId}&patient_id=eq.${data.patientId}&doctor_id=eq.${doctorId}&kind=eq.order&status=eq.published&select=id`,
      )) as unknown[];
      if (!orders.length) throw new Error("Pedido indisponível neste prontuário.");
    }
    const row = (await databaseRequest(config, "rpc/inova_create_real_agenda", {
      p_patient: data.patientId,
      p_doctor: doctorId,
      p_author: account.userId,
      p_request: data.requestId,
      p_data: data,
    })) as AgendaRow;
    return agendaRecord(row);
  });
export const transitionRealAgendaEvent = createServerFn({ method: "POST" })
  .validator(
    z.object({
      patientId: z.string().uuid(),
      id: z.string().uuid(),
      status: z.enum(["Confirmado", "Cancelado"]),
      reason: z.string().trim().max(1000).default(""),
      confirmed: z.literal(true),
    }),
  )
  .handler(async ({ data }) => {
    accountMutationGuard();
    const { account, config, doctorId } = await authorize(data.patientId);
    if (data.status === "Confirmado" && account.account_type !== "doctor")
      throw new Error("A confirmação cabe ao médico.");
    if (data.status === "Cancelado" && data.reason.length < 3)
      throw new Error("Informe o motivo de cancelamento.");
    const row = (await databaseRequest(config, "rpc/inova_transition_real_agenda", {
      p_id: data.id,
      p_patient: data.patientId,
      p_doctor: doctorId,
      p_author: account.userId,
      p_status: data.status,
      p_reason: data.reason,
    })) as AgendaRow;
    return agendaRecord(row);
  });
