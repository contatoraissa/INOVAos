import { z } from "zod";
export type CareDestination =
  | "agenda"
  | "orders"
  | "consultation"
  | "documents"
  | "guidance"
  | "preparation"
  | "timeline"
  | "favorites"
  | "history"
  | "genetics";
export type CareEvent = {
  id: string;
  patientId: string;
  at: string;
  title: string;
  detail: string;
  destination: CareDestination;
  read: boolean;
};
export const favoriteInput = z
  .object({
    patientId: z.literal("mariana-oliveira"),
    name: z.string().trim().min(2).max(100),
    address: z.string().trim().min(3).max(200),
    cep: z.string().regex(/^\d{8}$/),
    website: z
      .string()
      .url()
      .max(500)
      .refine((value) => value.startsWith("https://"), "Use um endereço HTTPS.")
      .or(z.literal("")),
  })
  .strict();
export type FavoriteLab = z.infer<typeof favoriteInput> & { id: string; createdAt: string };
export const guidanceInput = z
  .object({
    requestId: z.string().min(16).max(64),
    patientId: z
      .string()
      .min(1)
      .max(100)
      .regex(/^[a-z0-9-]+$/),
    title: z.string().trim().min(3).max(120),
    text: z.string().trim().min(5).max(5000),
    category: z.enum(["Resultados", "Próximos passos", "Preparo dos exames"]),
    sourceName: z.string().trim().max(150),
    sourceUrl: z
      .string()
      .url()
      .max(500)
      .refine((value) => value.startsWith("https://"), "Use um endereço HTTPS.")
      .or(z.literal("")),
    sourceDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .or(z.literal("")),
    orderId: z.string().uuid().nullable(),
  })
  .strict()
  .superRefine((data, context) => {
    if (
      data.category === "Preparo dos exames" &&
      (!data.orderId || !data.sourceName || !data.sourceUrl || !data.sourceDate)
    )
      context.addIssue({
        code: "custom",
        message: "Preparo exige pedido, fonte, link e data da instrução conferida.",
      });
  });
export type MedicalGuidance = Omit<z.infer<typeof guidanceInput>, "requestId"> & {
  id: string;
  createdAt: string;
  publishedAt: string | null;
  withdrawnAt: string | null;
  doctorName: string;
  reviewed: boolean;
};
export type OrderProgress = {
  orderId: string;
  patientId: string;
  preferredLabId: string | null;
  performedOn: string | null;
  reportedAt: string | null;
};
