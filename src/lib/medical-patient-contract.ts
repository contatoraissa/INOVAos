import { z } from "zod";
import { validDocument } from "./account-contract.ts";
export const patientRegistration = z
  .object({
    name: z.string().trim().min(5).max(200),
    cpf: z
      .string()
      .transform((v) => v.replace(/\D/g, ""))
      .refine((v) => validDocument(v, "cpf"), "CPF inválido."),
    birth: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .refine((v) => {
        const date = new Date(v + "T12:00:00Z");
        return (
          !Number.isNaN(date.getTime()) &&
          date.toISOString().slice(0, 10) === v &&
          v >= "1900-01-01" &&
          v <= new Date().toISOString().slice(0, 10)
        );
      }, "Nascimento inválido."),
    notes: z.string().trim().max(2000),
    email: z.union([z.literal(""), z.string().trim().email().max(254).toLowerCase()]).default(""),
    phone: z.string().trim().max(40).default(""),
    rg: z.string().trim().max(40).default(""),
    sex: z.enum(["", "f", "m", "o"]).default(""),
    address: z.string().trim().max(500).default(""),
    identityConfirmed: z.boolean().default(false),
  })
  .strict();
