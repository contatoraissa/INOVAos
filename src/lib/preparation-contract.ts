import { z } from "zod";
export const MAX_AUDIO_BYTES = 5 * 1024 * 1024;
export const MAX_RECORDING_SECONDS = 180;
export const preparationFields = ["symptoms", "medicines", "questions"] as const;
export type PreparationField = (typeof preparationFields)[number];
export const preparationLabels: Record<PreparationField, string> = {
  symptoms: "Como você tem se sentido?",
  medicines: "Medicamentos e suplementos",
  questions: "Suas perguntas para a consulta",
};
const audioMime = z.enum(["audio/webm", "audio/ogg", "audio/mp4", "audio/wav", "audio/mpeg"]);
export const preparationInput = z
  .object({
    requestId: z.string().min(16).max(64),
    patientId: z.literal("mariana-oliveira"),
    orderId: z.string().uuid().optional(),
    confirmed: z.literal(true),
    notes: z
      .object({
        symptoms: z.string().max(3000),
        medicines: z.string().max(3000),
        questions: z.string().max(3000),
      })
      .strict(),
    audios: z
      .array(
        z
          .object({
            field: z.enum(preparationFields),
            mime: audioMime,
            duration: z.number().min(0).max(MAX_RECORDING_SECONDS).nullable(),
            data: z.string().max(Math.ceil((MAX_AUDIO_BYTES * 4) / 3) + 4),
          })
          .strict(),
      )
      .max(3),
    documents: z
      .array(
        z
          .object({
            name: z.string().min(1).max(200),
            kind: z.enum(["Análises clínicas", "Genética", "Genômica", "Outros laudos"]),
            data: z.string().max(Math.ceil((8 * 1024 * 1024 * 4) / 3) + 4),
          })
          .strict(),
      )
      .max(3),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (new Set(value.audios.map((item) => item.field)).size !== value.audios.length)
      ctx.addIssue({ code: "custom", message: "Áudios duplicados." });
    if (
      !Object.values(value.notes).some((text) => text.trim()) &&
      !value.audios.length &&
      !value.documents.length
    )
      ctx.addIssue({
        code: "custom",
        message: "Adicione uma anotação, áudio ou laudo antes de enviar.",
      });
  });
export type PreparationInput = z.infer<typeof preparationInput>;
export type PreparationReceipt = {
  id: string;
  patientId: string;
  orderId?: string;
  receivedAt: string;
  reviewed: boolean;
  reviewedAt?: string | null;
  notes: PreparationInput["notes"];
  audios: {
    index: number;
    field: PreparationField;
    mime: string;
    duration: number | null;
    bytes: number;
  }[];
  documents: { index: number; name: string; kind: string; bytes: number }[];
};
