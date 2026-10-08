import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { isLocalAiRequest } from "./ai-access";
import { agendaInput } from "./agenda-contract";
import { agendaStore } from "./agenda-store.server";
import { examOrderStore } from "./exam-order-store.server";
function guard() {
  const request = getRequest();
  if (
    !isLocalAiRequest({
      development: import.meta.env.DEV,
      enabled: process.env["INOVA_AI_ENABLED"] === "true",
      url: request.url,
      origin: request.headers.get("origin"),
      additionalOrigin: process.env["INOVA_AI_ORIGIN"],
    })
  )
    throw new Error("Agenda disponível somente na demonstração local autorizada.");
}
export const listAgenda = createServerFn({ method: "GET" })
  .validator(
    z.object({
      patientIds: z.array(z.string().min(1).max(100)).max(100),
      audience: z.enum(["doctor", "patient"]),
    }),
  )
  .handler(async ({ data }) => {
    guard();
    if (data.audience === "patient" && data.patientIds.some((id) => id !== "mariana-oliveira"))
      throw new Error("Paciente indisponível.");
    return agendaStore.list(data.patientIds);
  });
export const createAgendaEvent = createServerFn({ method: "POST" })
  .validator(agendaInput)
  .handler(async ({ data }) => {
    guard();
    if (data.orderId) {
      const order = examOrderStore.get(data.orderId);
      if (
        order.patientId !== data.patientId ||
        order.status !== "released" ||
        data.kind !== "Exame"
      )
        throw new Error("Pedido indisponível para este evento.");
    }
    return agendaStore.create(data);
  });
const target = z.object({
  id: z.string().uuid(),
  patientId: z.string().min(1).max(100),
  audience: z.enum(["doctor", "patient"]),
});
export const cancelAgendaEvent = createServerFn({ method: "POST" })
  .validator(target.extend({ reason: z.string().trim().min(3).max(1000) }))
  .handler(async ({ data }) => {
    guard();
    return agendaStore.cancel(data.id, data.patientId, data.audience, data.reason);
  });
export const confirmAgendaEvent = createServerFn({ method: "POST" })
  .validator(target)
  .handler(async ({ data }) => {
    guard();
    if (data.audience !== "doctor") throw new Error("Confirmação disponível somente ao médico.");
    return agendaStore.confirm(data.id, data.patientId);
  });
