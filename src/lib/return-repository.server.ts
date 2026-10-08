import { z } from "zod";
import { databaseConfig, databaseRequest, type DatabaseConfig } from "./supabase.server.ts";
import { returnInput, returnTarget, type PlannedReturn } from "./return-contract.ts";
import { returnStore } from "./return-store.server.ts";
import { recordCareEvent } from "./care-store.server.ts";

const rowSchema = z.object({
  id: z.string().uuid(),
  patient_id: z.string(),
  title: z.string(),
  notes: z.string(),
  date_requested: z.string().nullable(),
  days: z.number().nullable(),
  target_date: z.string(),
  created_at: z.string(),
  published_at: z.string().nullable(),
  cancelled_at: z.string().nullable(),
  doctor_name: z.string(),
});
function decode(raw: unknown): PlannedReturn {
  const row = rowSchema.parse(raw);
  return {
    id: row.id,
    patientId: row.patient_id,
    title: row.title,
    notes: row.notes,
    date: row.date_requested,
    days: row.days,
    targetDate: row.target_date,
    createdAt: row.created_at,
    publishedAt: row.published_at,
    cancelledAt: row.cancelled_at,
    doctorName: row.doctor_name,
  };
}
export function createDatabaseReturnRepository(
  config: DatabaseConfig,
  fetcher: typeof fetch = fetch,
) {
  return {
    async create(raw: unknown) {
      const input = returnInput.parse(raw);
      returnTarget(input, Date.now());
      return decode(
        await databaseRequest(
          config,
          "rpc/inova_create_return_plan",
          {
            p_request_id: input.requestId,
            p_patient_id: input.patientId,
            p_title: input.title,
            p_notes: input.notes,
            p_date: input.date,
            p_days: input.days,
          },
          fetcher,
        ),
      );
    },
    async list(patientId: string, audience: "doctor" | "patient") {
      const filter = audience === "patient" ? "&published_at=not.is.null" : "";
      const rows = z
        .array(rowSchema)
        .parse(
          await databaseRequest(
            config,
            `inova_return_plans?patient_id=eq.${encodeURIComponent(patientId)}${filter}&order=created_at.desc`,
            undefined,
            fetcher,
          ),
        );
      return rows.map(decode);
    },
    async publish(id: string, confirmed: boolean) {
      if (!confirmed) throw new Error("Confirme a revisão do retorno antes de publicar.");
      return decode(
        await databaseRequest(
          config,
          "rpc/inova_publish_return_plan",
          { p_id: z.string().uuid().parse(id) },
          fetcher,
        ),
      );
    },
    async cancel(id: string) {
      return decode(
        await databaseRequest(
          config,
          "rpc/inova_cancel_return_plan",
          { p_id: z.string().uuid().parse(id) },
          fetcher,
        ),
      );
    },
  };
}
function repository() {
  const config = databaseConfig();
  return config ? createDatabaseReturnRepository(config) : returnStore;
}
function events(item: PlannedReturn) {
  if (item.publishedAt)
    recordCareEvent({
      id: `${item.id}:published`,
      patientId: item.patientId,
      at: item.publishedAt,
      title: "Retorno planejado pelo médico",
      detail: `${item.title} · ${item.targetDate.split("-").reverse().join("/")}. Orientação de acompanhamento, não consulta agendada.`,
      destination: "guidance",
    });
  if (item.publishedAt && item.cancelledAt)
    recordCareEvent({
      id: `${item.id}:cancelled`,
      patientId: item.patientId,
      at: item.cancelledAt,
      title: "Retorno planejado cancelado",
      detail: "O médico cancelou esta orientação de retorno. Confira se há um plano atualizado.",
      destination: "guidance",
    });
}
export const plannedReturns = {
  async create(raw: unknown) {
    return repository().create(raw);
  },
  async list(patientId: string, audience: "doctor" | "patient") {
    const items = await repository().list(patientId, audience);
    items.forEach(events);
    return items;
  },
  async publish(id: string, confirmed: boolean) {
    const item = await repository().publish(id, confirmed);
    events(item);
    return item;
  },
  async cancel(id: string) {
    const item = await repository().cancel(id);
    events(item);
    return item;
  },
};
