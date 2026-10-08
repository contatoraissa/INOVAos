import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { isLocalAiRequest } from "./ai-access";
import { rawImportInput } from "./genetic-raw-contract";
import { rawGeneticStore } from "./genetic-raw-store.server";
import { recordCareEvent } from "./care-store.server";
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
    throw new Error("Importação genética disponível apenas na demonstração local autorizada.");
}
const patientInput = z.object({
  patientId: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/),
});
const recordInput = patientInput.extend({ id: z.string().uuid() });
export const listRawGenetics = createServerFn({ method: "GET" })
  .validator(patientInput)
  .handler(async ({ data }) => {
    guard();
    return rawGeneticStore.list(data.patientId);
  });
export const importRawGenetics = createServerFn({ method: "POST" })
  .validator(rawImportInput)
  .handler(async ({ data }) => {
    guard();
    const result = rawGeneticStore.import(data);
    if (!result.duplicate)
      recordCareEvent({
        id: `${result.record.id}:genetics-imported`,
        patientId: data.patientId,
        at: result.record.importedAt,
        title: "Arquivo genético bruto recebido",
        detail: "Arquivo vinculado ao perfil demonstrativo; aguardando revisão médica.",
        destination: "genetics",
      });
    return result;
  });
export const getRawGeneticOriginal = createServerFn({ method: "GET" })
  .validator(recordInput)
  .handler(async ({ data }) => {
    guard();
    return rawGeneticStore.original(data.id, data.patientId);
  });
export const reviewRawGenetics = createServerFn({ method: "POST" })
  .validator(recordInput.extend({ associationConfirmed: z.literal(true) }))
  .handler(async ({ data }) => {
    guard();
    const result = rawGeneticStore.review(data.id, data.patientId);
    if (result.first)
      recordCareEvent({
        id: `${data.id}:genetics-reviewed`,
        patientId: data.patientId,
        at: result.record.reviewedAt!,
        title: "Arquivo genético revisado pelo médico",
        detail: "Conferência da associação e do arquivo. Scores continuam sem modelo configurado.",
        destination: "genetics",
      });
    return result.record;
  });
export const removeRawGenetics = createServerFn({ method: "POST" })
  .validator(recordInput.extend({ confirmed: z.literal(true) }))
  .handler(async ({ data }) => {
    guard();
    rawGeneticStore.remove(data.id, data.patientId);
    recordCareEvent({
      id: `${data.id}:genetics-removed`,
      patientId: data.patientId,
      at: new Date().toISOString(),
      title: "Arquivo genético excluído",
      detail: "A cópia e os metadados foram removidos do armazenamento demonstrativo.",
      destination: "genetics",
    });
    return { ok: true };
  });
