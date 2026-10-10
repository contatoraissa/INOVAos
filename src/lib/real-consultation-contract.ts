import { z } from "zod";
export const consultationPayload = z
  .object({
    title: z.string().trim().min(3).max(120),
    text: z.string().trim().max(6000),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .refine((value) => {
        const date = new Date(value + "T12:00:00Z");
        return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
      }, "Data inválida.")
      .or(z.literal("")),
    symptoms: z.string().max(3000),
    medicines: z.string().max(3000),
    questions: z.string().max(3000),
    exams: z.array(z.string().max(100)).max(20),
    category: z
      .enum(["Resultados", "Próximos passos", "Preparo dos exames"])
      .default("Próximos passos"),
    sourceName: z.string().trim().max(150).default(""),
    sourceUrl: z
      .string()
      .url()
      .max(500)
      .refine((v) => v.startsWith("https://"))
      .or(z.literal(""))
      .default(""),
    sourceDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .refine((value) => {
        const date = new Date(value + "T12:00:00Z");
        const today = new Intl.DateTimeFormat("en-CA", {
          timeZone: "America/Sao_Paulo",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(new Date());
        return (
          Number.isFinite(date.getTime()) &&
          date.toISOString().slice(0, 10) === value &&
          value <= today
        );
      }, "Informe uma data válida de conferência da fonte, sem data futura.")
      .or(z.literal(""))
      .default(""),
    orderId: z.string().uuid().nullable().default(null),
    audios: z
      .array(
        z
          .object({
            mime: z.enum(["audio/webm", "audio/ogg", "audio/mp4", "audio/wav", "audio/mpeg"]),
            data: z.string().max(6990512),
            field: z.enum(["symptoms", "medicines", "questions"]).optional(),
          })
          .strict(),
      )
      .max(3)
      .default([]),
    documents: z
      .array(
        z
          .object({
            name: z.string().min(1).max(200),
            data: z.string().max(11184812),
            kind: z.enum(["Análises clínicas", "Genética", "Genômica", "Outros laudos"]).optional(),
          })
          .strict(),
      )
      .max(3)
      .default([]),
    audio: z
      .object({
        mime: z.enum(["audio/webm", "audio/ogg", "audio/mp4", "audio/wav", "audio/mpeg"]),
        data: z.string().max(6990512),
      })
      .nullable(),
    document: z
      .object({ name: z.string().min(1).max(200), data: z.string().max(11184812) })
      .nullable(),
  })
  .strict()
  .superRefine((value, ctx) => {
    const fields = value.audios.flatMap((a) => (a.field ? [a.field] : []));
    if (new Set(fields).size !== fields.length)
      ctx.addIssue({ code: "custom", message: "Use apenas um áudio por pergunta." });
  });
export const consultationInput = z
  .object({
    patientId: z.string().uuid(),
    requestId: z.string().uuid(),
    kind: z.enum(["preparation", "order", "guidance", "family", "return"]),
    payload: consultationPayload,
    confirmed: z.literal(true),
  })
  .strict();
export type ConsultationPayload = z.infer<typeof consultationPayload>;
export type ConsultationEntry = {
  id: string;
  patient_id: string;
  kind: z.infer<typeof consultationInput>["kind"];
  status: "draft" | "published" | "reviewed" | "cancelled";
  payload: ConsultationPayload;
  created_at: string;
  updated_at: string;
};
