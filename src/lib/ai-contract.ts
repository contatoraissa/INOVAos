import { z } from "zod";

export const MAX_PDF_BYTES = 8 * 1024 * 1024;
export const reportInput = z.object({
  kind: z.enum(["Genética", "Genômica", "Laboratorial"]),
  pdf: z
    .string()
    .min(8)
    .max(Math.ceil(MAX_PDF_BYTES / 3) * 4),
});
const evidence = z.object({
  page: z.number().int().positive().max(1000).nullable(),
  title: z.string().min(1).max(180),
  text: z.string().min(1).max(2000),
  quote: z.string().max(800),
});
export const summarySchema = z
  .object({
    subjectName: z.string().max(200).nullable(),
    pages: z.number().int().positive().max(1000),
    scope: z.string().min(1).max(2500),
    findings: z.array(evidence).max(20),
    limitations: z.array(evidence).max(15),
    observations: z
      .array(
        z.object({
          name: z.string().min(1).max(180),
          value: z.string().max(120),
          unit: z.string().max(100),
          reference: z.string().max(300),
          collection: z.string().max(100),
          flag: z.enum(["reportado_alterado", "reportado_critico", "sem_classificacao"]),
          page: z.number().int().positive().max(1000).nullable(),
          quote: z.string().max(800),
        }),
      )
      .max(100),
  })
  .superRefine((summary, ctx) => {
    for (const item of [...summary.findings, ...summary.limitations, ...summary.observations]) {
      if (item.page !== null && item.page > summary.pages)
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Página citada fora do documento." });
    }
  });
export type DocumentSummary = z.infer<typeof summarySchema>;
const str = { type: "string" };
const page = { type: ["integer", "null"], minimum: 1, maximum: 1000 };
const evidenceJson = {
  type: "object",
  properties: {
    page,
    title: { ...str, minLength: 1, maxLength: 180 },
    text: { ...str, minLength: 1, maxLength: 2000 },
    quote: { ...str, maxLength: 800 },
  },
  required: ["page", "title", "text", "quote"],
};
export const summaryJsonSchema = {
  type: "object",
  properties: {
    subjectName: { type: ["string", "null"], maxLength: 200 },
    pages: { type: "integer", minimum: 1, maximum: 1000 },
    scope: { ...str, minLength: 1, maxLength: 2500 },
    findings: { type: "array", items: evidenceJson, maxItems: 20 },
    limitations: { type: "array", items: evidenceJson, maxItems: 15 },
    observations: {
      type: "array",
      maxItems: 100,
      items: {
        type: "object",
        properties: {
          name: { ...str, minLength: 1, maxLength: 180 },
          value: { ...str, maxLength: 120 },
          unit: { ...str, maxLength: 100 },
          reference: { ...str, maxLength: 300 },
          collection: { ...str, maxLength: 100 },
          flag: {
            type: "string",
            enum: ["reportado_alterado", "reportado_critico", "sem_classificacao"],
          },
          page,
          quote: { ...str, maxLength: 800 },
        },
        required: ["name", "value", "unit", "reference", "collection", "flag", "page", "quote"],
      },
    },
  },
  required: ["subjectName", "pages", "scope", "findings", "limitations", "observations"],
};
