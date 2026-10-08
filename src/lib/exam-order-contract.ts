import { z } from "zod";
export const orderInput = z
  .object({
    requestId: z.string().min(16).max(64),
    patientId: z
      .string()
      .min(1)
      .max(100)
      .regex(/^[a-z0-9-]+$/),
    exams: z.array(z.string().min(1).max(100)).min(1).max(20),
    notes: z.string().trim().max(2000),
  })
  .strict()
  .refine((input) => new Set(input.exams).size === input.exams.length, "Há exames duplicados.");
export type OrderInput = z.infer<typeof orderInput>;
export type ExamOrder = {
  id: string;
  patientId: string;
  doctorName: string;
  doctorCrm: string;
  createdAt: string;
  releasedAt: string | null;
  cancelledAt: string | null;
  status: "draft" | "released" | "cancelled";
  exams: { id: string; name: string }[];
  notes: string;
};
export const quoteInput = z
  .object({
    id: z.string().uuid(),
    cep: z.string().regex(/^\d{8}$/, "Informe um CEP com 8 dígitos."),
    simulate: z.boolean().optional(),
  })
  .strict();
