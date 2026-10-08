import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { isLocalAiRequest } from "./ai-access";
import { favoriteInput, guidanceInput } from "./care-contract";
import { careStore } from "./care-store.server";
import { examOrderStore } from "./exam-order-store.server";
import { preparationStore } from "./preparation-store.server";
import { plannedReturns } from "./return-repository.server";
import { returnInput } from "./return-contract";
import { databaseConfig } from "./supabase.server";
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
    throw new Error("Recurso disponível apenas no ambiente demonstrativo autorizado.");
}
export const getPatientCare = createServerFn({ method: "GET" })
  .validator(z.object({ patientId: z.literal("mariana-oliveira") }))
  .handler(async ({ data }) => {
    guard();
    for (const notice of agendaStore.notices([data.patientId])) {
      careStore.event({
        id: `agenda:${notice.id}`,
        patientId: notice.patientId,
        at: notice.at,
        title: notice.title,
        detail: "Confira o calendário compartilhado com o Dr. Rafael Mendes.",
        destination: "agenda",
      });
    }
    const returns = await plannedReturns.list(data.patientId, "patient");
    return {
      events: careStore.events(data.patientId),
      favorites: careStore.favorites(data.patientId),
      guidance: careStore.guidance(data.patientId, "patient"),
      progress: careStore.progress(data.patientId),
      orders: examOrderStore.list(data.patientId, "patient"),
      submissions: preparationStore.list(data.patientId),
      returns,
      returnPersistence: databaseConfig() ? ("supabase" as const) : ("memory" as const),
    };
  });
export const getDoctorWork = createServerFn({ method: "GET" })
  .validator(z.object({ patientIds: z.array(z.string().min(1).max(100)).max(100) }))
  .handler(async ({ data }) => {
    guard();
    return Promise.all(
      [...new Set(data.patientIds)].map(async (patientId) => ({
        patientId,
        submissions: preparationStore.list(patientId),
        orders: examOrderStore.list(patientId, "doctor"),
        progress: careStore.progress(patientId),
        guidance: careStore.guidance(patientId, "doctor"),
        returns: await plannedReturns.list(patientId, "doctor"),
        returnPersistence: databaseConfig() ? ("supabase" as const) : ("memory" as const),
      })),
    );
  });
export const createPlannedReturn = createServerFn({ method: "POST" })
  .validator(returnInput)
  .handler(async ({ data }) => {
    guard();
    return plannedReturns.create(data);
  });
export const publishPlannedReturn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid(), confirmed: z.literal(true) }))
  .handler(async ({ data }) => {
    guard();
    return plannedReturns.publish(data.id, data.confirmed);
  });
export const cancelPlannedReturn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    guard();
    return plannedReturns.cancel(data.id);
  });
export const readCareEvents = createServerFn({ method: "POST" })
  .validator(
    z.object({
      patientId: z.literal("mariana-oliveira"),
      ids: z.array(z.string().max(150)).max(100),
    }),
  )
  .handler(async ({ data }) => {
    guard();
    careStore.read(data.patientId, data.ids);
    return { ok: true };
  });
export const addFavoriteLab = createServerFn({ method: "POST" })
  .validator(favoriteInput)
  .handler(async ({ data }) => {
    guard();
    return careStore.favorite(data);
  });
export const removeFavoriteLab = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid(), patientId: z.literal("mariana-oliveira") }))
  .handler(async ({ data }) => {
    guard();
    careStore.removeFavorite(data.id, data.patientId);
    return { ok: true };
  });
export const saveGuidance = createServerFn({ method: "POST" })
  .validator(guidanceInput)
  .handler(async ({ data }) => {
    guard();
    if (data.orderId) {
      const order = examOrderStore.get(data.orderId);
      if (order.patientId !== data.patientId || order.status !== "released")
        throw new Error("Vincule a um pedido liberado deste paciente.");
    }
    return careStore.draft(data);
  });
export const listMedicalGuidance = createServerFn({ method: "GET" })
  .validator(z.object({ patientId: z.string().max(100) }))
  .handler(async ({ data }) => {
    guard();
    return careStore.guidance(data.patientId, "doctor");
  });
export const publishGuidance = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid(), reviewed: z.literal(true) }))
  .handler(async ({ data }) => {
    guard();
    const guide = careStore.getGuidance(data.id);
    if (guide.orderId) {
      const order = examOrderStore.get(guide.orderId);
      if (order.patientId !== guide.patientId || order.status !== "released")
        throw new Error(
          "O pedido vinculado não está mais liberado. Crie uma orientação atualizada.",
        );
    }
    return careStore.publish(data.id);
  });
export const withdrawGuidance = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    guard();
    return careStore.withdraw(data.id);
  });
export const saveOrderProgress = createServerFn({ method: "POST" })
  .validator(
    z.object({
      patientId: z.literal("mariana-oliveira"),
      orderId: z.string().uuid(),
      preferredLabId: z.string().uuid().nullable(),
      performedOn: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .nullable(),
    }),
  )
  .handler(async ({ data }) => {
    guard();
    const order = examOrderStore.get(data.orderId);
    if (order.patientId !== data.patientId || order.status !== "released")
      throw new Error("Pedido indisponível para atualizar o acompanhamento.");
    return careStore.updateProgress(
      data.patientId,
      data.orderId,
      data.preferredLabId,
      data.performedOn,
    );
  });
