import { z } from "zod";
import { agendaKinds, agendaStatuses } from "./agenda-contract.ts";

export const realAgendaInput = z
  .object({
    patientId: z.string().uuid(),
    requestId: z.string().uuid(),
    title: z.string().trim().min(3).max(120),
    kind: z.enum(agendaKinds),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .refine((value) => {
        const date = new Date(value + "T12:00:00Z");
        return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
      }, "Data inválida."),
    time: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
      .or(z.literal("")),
    status: z.enum(agendaStatuses).exclude(["Cancelado"]),
    notes: z.string().trim().max(1000),
    orderId: z.string().uuid().optional(),
  })
  .strict()
  .superRefine((v, ctx) => {
    if ((v.kind === "Previsão de resultado") !== (v.status === "Previsto"))
      ctx.addIssue({
        code: "custom",
        message: "Use previsto apenas para a previsão de resultado.",
      });
  });

export const doctorProfileSchema = z
  .object({
    name: z.string().trim().min(5).max(100),
    crm: z
      .string()
      .trim()
      .regex(/^\d{1,10}\/[A-Z]{2}$/),
    specialty: z.string().trim().min(3).max(100),
    email: z.string().trim().email().max(200),
    phone: z.string().trim().max(30),
    clinic: z.string().trim().max(150),
    address: z.string().trim().max(250),
  })
  .strict();
export const doctorSettingsSchema = z
  .object({
    results: z.boolean(),
    preparations: z.boolean(),
    returns: z.boolean(),
    frequency: z.enum(["immediate", "daily", "off"]),
    textSize: z.enum(["normal", "large"]),
    contrast: z.boolean(),
    period: z.enum(["all", "12", "6"]),
    pendingOnly: z.boolean(),
  })
  .strict();
export const patientPreferencesSchema = z
  .object({
    phone: z.string().trim().max(30),
    email: z.string().trim().email().max(200),
    favorites: z
      .array(
        z
          .object({
            name: z.string().trim().min(2).max(150),
            address: z.string().trim().max(250),
            phone: z.string().trim().max(30),
            cep: z
              .string()
              .regex(/^\d{8}$/)
              .or(z.literal(""))
              .optional(),
            website: z
              .string()
              .url()
              .max(500)
              .refine((v) => v.startsWith("https://"), "Use HTTPS.")
              .or(z.literal(""))
              .optional(),
          })
          .strict(),
      )
      .max(30),
    progress: z
      .array(
        z
          .object({
            patientId: z.string().uuid(),
            orderId: z.string().uuid(),
            preferredLab: z.string().max(150),
            performedOn: z
              .string()
              .regex(/^\d{4}-\d{2}-\d{2}$/)
              .refine((v) => {
                const d = new Date(v + "T12:00:00Z");
                return (
                  Number.isFinite(d.getTime()) &&
                  d.toISOString().slice(0, 10) === v &&
                  v <=
                    new Intl.DateTimeFormat("en-CA", {
                      timeZone: "America/Sao_Paulo",
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                    }).format(new Date())
                );
              }, "Informe uma data válida, sem data futura.")
              .or(z.literal("")),
          })
          .strict(),
      )
      .max(100)
      .optional(),
  })
  .strict();
export const preferenceInput = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("profile"), value: doctorProfileSchema }).strict(),
  z.object({ kind: z.literal("settings"), value: doctorSettingsSchema }).strict(),
  z.object({ kind: z.literal("patient"), value: patientPreferencesSchema }).strict(),
]);
