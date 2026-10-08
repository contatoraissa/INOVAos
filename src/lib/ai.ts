import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { reportInput } from "./ai-contract";
import { analyzeWithGemini } from "./gemini-core.server";
import { isLocalAiRequest } from "./ai-access";
import { patientResultsInput, explainPatientResults } from "./patient-results-ai.server";
import { briefingTarget } from "./agenda-briefing-contract";
import { buildAgendaContext, generateAgendaBriefing } from "./agenda-briefing.server";
import { z } from "zod";
let active = 0;
let attempts: number[] = [];
export const getAgendaBriefingContext = createServerFn({ method: "GET" })
  .validator(briefingTarget)
  .handler(async ({ data }) => {
    if (!allowed())
      throw new Error("Briefing disponível somente na demonstração local autorizada.");
    return buildAgendaContext(data.date, data.patientIds, data.mode);
  });
export const summarizeAgenda = createServerFn({ method: "POST" })
  .validator(briefingTarget.extend({ confirmed: z.literal(true) }))
  .handler(async ({ data }) => {
    if (!allowed())
      throw new Error("Briefing disponível somente na demonstração local autorizada.");
    const now = Date.now();
    attempts = attempts.filter((at) => now - at < 60000);
    if (active >= 2 || attempts.length >= 10)
      throw new Error("Há muitas análises em andamento. Aguarde um minuto.");
    const context = buildAgendaContext(data.date, data.patientIds, data.mode);
    attempts.push(now);
    active++;
    try {
      return {
        context,
        summary: await generateAgendaBriefing(context, {
          key: process.env["GEMINI_API_KEY"] ?? "",
          model: process.env["GEMINI_MODEL"] ?? "gemini-3.8-flash",
        }),
        model: process.env["GEMINI_MODEL"] ?? "gemini-3.8-flash",
        generatedAt: new Date().toISOString(),
      };
    } finally {
      active--;
    }
  });
function allowed() {
  if (!import.meta.env.DEV || process.env["INOVA_AI_ENABLED"] !== "true") return false;
  const request = getRequest();
  return isLocalAiRequest({
    development: import.meta.env.DEV,
    enabled: process.env["INOVA_AI_ENABLED"] === "true",
    url: request.url,
    origin: request.headers.get("origin"),
    additionalOrigin: process.env["INOVA_AI_ORIGIN"],
  });
}
export const getAiStatus = createServerFn({ method: "GET" }).handler(async () => ({
  available: allowed() && Boolean(process.env["GEMINI_API_KEY"]),
  model: allowed() ? (process.env["GEMINI_MODEL"] ?? "gemini-3.8-flash") : null,
  message: allowed()
    ? process.env["GEMINI_API_KEY"]
      ? "Análise de exemplos pelo Gemini."
      : "A chave do Gemini não está configurada no servidor."
    : "IA disponível apenas no ambiente local de desenvolvimento.",
}));
export const interpretPatientResults = createServerFn({ method: "POST" })
  .validator(patientResultsInput)
  .handler(async ({ data }) => {
    if (!allowed())
      return {
        ok: false as const,
        error: "Interpretação disponível apenas no ambiente demonstrativo autorizado.",
      };
    const now = Date.now();
    attempts = attempts.filter((at) => now - at < 60000);
    if (active >= 2 || attempts.length >= 10)
      return {
        ok: false as const,
        error: "Há análises em andamento ou muitas solicitações. Aguarde um minuto.",
      };
    attempts.push(now);
    active++;
    try {
      return await explainPatientResults(data, {
        key: process.env["GEMINI_API_KEY"] ?? "",
        model: process.env["GEMINI_MODEL"] ?? "gemini-3.8-flash",
      });
    } finally {
      active--;
    }
  });
export const summarizeDocument = createServerFn({ method: "POST" })
  .validator(reportInput)
  .handler(async ({ data }) => {
    if (!allowed())
      return {
        ok: false as const,
        error:
          "Análise desativada neste ambiente. Configure o servidor local; produção exige autenticação e autorização.",
      };
    const now = Date.now();
    attempts = attempts.filter((at) => now - at < 60000);
    if (active >= 2 || attempts.length >= 10)
      return {
        ok: false as const,
        error: "Há análises em andamento ou muitas solicitações. Aguarde um minuto.",
      };
    attempts.push(now);
    active++;
    try {
      return await analyzeWithGemini(data, {
        key: process.env["GEMINI_API_KEY"] ?? "",
        model: process.env["GEMINI_MODEL"] ?? "gemini-3.8-flash",
      });
    } finally {
      active--;
    }
  });
