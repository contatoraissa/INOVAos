import { z } from "zod";

export const returnInput = z
  .object({
    requestId: z.string().min(16).max(64),
    patientId: z
      .string()
      .min(1)
      .max(100)
      .regex(/^[a-z0-9-]+$/),
    title: z.string().trim().min(3).max(120),
    notes: z.string().trim().max(2000),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable(),
    days: z.number().int().min(1).max(365).nullable(),
  })
  .strict()
  .refine(
    (value) => (value.date !== null) !== (value.days !== null),
    "Escolha uma data ou um prazo em dias.",
  );
export type ReturnInput = z.infer<typeof returnInput>;
export type PlannedReturn = Omit<ReturnInput, "requestId"> & {
  id: string;
  targetDate: string;
  createdAt: string;
  publishedAt: string | null;
  cancelledAt: string | null;
  doctorName: string;
};
export function localDay(timestamp = Date.now()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(timestamp));
  const part = (type: string) => parts.find((item) => item.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
export function returnTarget(input: ReturnInput, timestamp: number) {
  const today = localDay(timestamp);
  const date =
    input.date ??
    new Date(Date.parse(`${today}T12:00:00Z`) + input.days! * 86400000).toISOString().slice(0, 10);
  const parsed = new Date(`${date}T12:00:00Z`);
  if (
    !Number.isFinite(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== date ||
    date < today
  )
    throw new Error("Escolha uma data válida, de hoje em diante.");
  return date;
}
