import { z } from "zod";
export const consultationPayload = z
  .object({
    title: z.string().trim().min(3).max(120),
    text: z.string().trim().max(6000),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .or(z.literal("")),
    symptoms: z.string().max(3000),
    medicines: z.string().max(3000),
    questions: z.string().max(3000),
    exams: z.array(z.string().max(100)).max(20),
    audios: z
      .array(
        z
          .object({
            mime: z.enum(["audio/webm", "audio/ogg", "audio/mp4", "audio/wav", "audio/mpeg"]),
            data: z.string().max(6990512),
          })
          .strict(),
      )
      .max(3)
      .default([]),
    documents: z
      .array(
        z.object({ name: z.string().min(1).max(200), data: z.string().max(11184812) }).strict(),
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
  .strict();
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
