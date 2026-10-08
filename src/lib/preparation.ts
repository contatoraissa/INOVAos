import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { isLocalAiRequest } from "./ai-access";
import { preparationInput } from "./preparation-contract";
import { preparationStore } from "./preparation-store.server";
import { examOrderStore } from "./exam-order-store.server";
import { agendaStore } from "./agenda-store.server";
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
    throw new Error("Envio disponível apenas no ambiente de desenvolvimento autorizado.");
}
export const sendPreparation = createServerFn({ method: "POST" })
  .validator(preparationInput)
  .handler(async ({ data }) => {
    guard();
    if (data.orderId) {
      const order = examOrderStore.get(data.orderId);
      if (order.patientId !== data.patientId || order.status !== "released")
        throw new Error("Escolha um pedido liberado deste paciente para relacionar o envio.");
    }
    return preparationStore.submit(data);
  });
export const listPreparations = createServerFn({ method: "GET" })
  .validator(z.object({ patientId: z.string().max(100) }))
  .handler(async ({ data }) => {
    guard();
    return preparationStore.list(data.patientId);
  });
// Inbox summaries do not depend on returns, billing or external databases.
export const listPreparationNotices = createServerFn({ method: "GET" })
  .validator(z.object({ patientIds: z.array(z.string().min(1).max(100)).max(100) }))
  .handler(async ({ data }) => {
    guard();
    const preparations = [...new Set(data.patientIds)]
      .flatMap((patientId) =>
        preparationStore.list(patientId).map((item) => ({
          id: item.id,
          patientId,
          receivedAt: item.receivedAt,
          documents: item.documents.length,
          audios: item.audios.length,
          reviewed: item.reviewed,
          agenda: false,
          title: "Nova preparação recebida",
        })),
      )
      .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
    const calendar = agendaStore.notices(data.patientIds).map((item) => ({
      id: item.id,
      patientId: item.patientId,
      receivedAt: item.at,
      documents: 0,
      audios: 0,
      reviewed: false,
      agenda: true,
      title: item.title,
    }));
    return [...preparations, ...calendar].sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
  });
export const getPreparationAttachment = createServerFn({ method: "GET" })
  .validator(
    z.object({
      id: z.string().uuid(),
      kind: z.enum(["audio", "document"]),
      index: z.number().int().min(0).max(2),
    }),
  )
  .handler(async ({ data }) => {
    guard();
    return preparationStore.attachment(data.id, data.kind, data.index);
  });
export const reviewPreparation = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    guard();
    preparationStore.review(data.id);
    return { ok: true };
  });
export const removePreparation = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    guard();
    preparationStore.remove(data.id);
    return { ok: true };
  });
