import { z } from "zod";
export const agendaKinds = ["Consulta", "Retorno", "Exame", "Previsão de resultado"] as const;
export const agendaStatuses = ["Proposto", "Confirmado", "Previsto", "Cancelado"] as const;
export const agendaInput = z
  .object({
    patientId: z
      .string()
      .regex(/^[a-z0-9-]+$/)
      .max(100),
    audience: z.enum(["doctor", "patient"]),
    title: z.string().trim().min(3).max(120),
    kind: z.enum(agendaKinds),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .refine((value) => {
        const d = new Date(value + "T12:00:00Z");
        return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
      }, "Data inválida."),
    time: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
      .or(z.literal("")),
    status: z.enum(["Proposto", "Confirmado", "Previsto"]),
    notes: z.string().trim().max(1000),
    orderId: z.string().uuid().optional(),
  })
  .superRefine((v, c) => {
    if (v.audience === "patient" && (v.patientId !== "mariana-oliveira" || v.status !== "Proposto"))
      c.addIssue({
        code: "custom",
        message: "O paciente pode propor eventos somente na própria agenda.",
      });
    if (v.kind === "Previsão de resultado" && v.status !== "Previsto")
      c.addIssue({ code: "custom", message: "Resultado deve ser registrado como previsão." });
    if (v.kind !== "Previsão de resultado" && v.status === "Previsto")
      c.addIssue({ code: "custom", message: "Selecione proposto ou confirmado." });
  });
export type AgendaInput = z.infer<typeof agendaInput>;
export type AgendaEvent = Omit<AgendaInput, "status"> & {
  id: string;
  status: (typeof agendaStatuses)[number];
  reason: string;
  createdAt: string;
  updatedAt: string;
};
export type AgendaNotice = { id: string; patientId: string; at: string; title: string };
