import { randomUUID } from "node:crypto";
import { returnInput, returnTarget, type PlannedReturn } from "./return-contract.ts";
import { recordCareEvent } from "./care-store.server.ts";
import type { CareEvent } from "./care-contract.ts";

export function createReturnStore(
  now = () => Date.now(),
  onEvent?: (event: Omit<CareEvent, "read">) => void,
) {
  const records = new Map<string, { requestId: string; item: PlannedReturn }>();
  function get(id: string) {
    const entry = records.get(id);
    if (!entry) throw new Error("Retorno não encontrado.");
    return entry.item;
  }
  return {
    create(raw: unknown) {
      const input = returnInput.parse(raw);
      const existing = [...records.values()].find((record) => record.requestId === input.requestId);
      if (existing) {
        if (existing.item.patientId !== input.patientId)
          throw new Error("Solicitação já utilizada.");
        return existing.item;
      }
      if (records.size >= 100) throw new Error("Limite de retornos demonstrativos atingido.");
      const { requestId, ...fields } = input;
      const item: PlannedReturn = {
        ...fields,
        id: randomUUID(),
        targetDate: returnTarget(input, now()),
        createdAt: new Date(now()).toISOString(),
        publishedAt: null,
        cancelledAt: null,
        doctorName: "Dr. Rafael Mendes",
      };
      records.set(item.id, { requestId, item });
      return item;
    },
    list(patientId: string, audience: "doctor" | "patient") {
      return [...records.values()]
        .map((record) => record.item)
        .filter(
          (item) =>
            item.patientId === patientId && (audience === "doctor" || item.publishedAt !== null),
        )
        .reverse();
    },
    publish(id: string, confirmed: boolean) {
      if (!confirmed) throw new Error("Confirme a revisão do retorno antes de publicar.");
      const item = get(id);
      if (item.cancelledAt) throw new Error("Retorno cancelado. Crie um novo plano.");
      if (item.publishedAt) return item;
      returnTarget(
        {
          requestId: "validation-000000",
          patientId: item.patientId,
          title: item.title,
          notes: item.notes,
          date: item.targetDate,
          days: null,
        },
        now(),
      );
      if (this.list(item.patientId, "patient").some((record) => !record.cancelledAt))
        throw new Error(
          "Já existe um retorno publicado. Cancele o anterior para publicar uma atualização.",
        );
      item.publishedAt = new Date(now()).toISOString();
      onEvent?.({
        id: `${item.id}:published`,
        patientId: item.patientId,
        at: item.publishedAt,
        title: "Retorno planejado pelo médico",
        detail: `${item.title} · ${item.targetDate.split("-").reverse().join("/")}. Orientação de acompanhamento, não consulta agendada.`,
        destination: "guidance",
      });
      return item;
    },
    cancel(id: string) {
      const item = get(id);
      if (item.cancelledAt) return item;
      item.cancelledAt = new Date(now()).toISOString();
      if (item.publishedAt)
        onEvent?.({
          id: `${item.id}:cancelled`,
          patientId: item.patientId,
          at: item.cancelledAt,
          title: "Retorno planejado cancelado",
          detail:
            "O médico cancelou esta orientação de retorno. Confira se há um plano atualizado.",
          destination: "guidance",
        });
      return item;
    },
  };
}
export const returnStore = createReturnStore(() => Date.now(), recordCareEvent);
