import { z } from "zod";
export const briefingTarget = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  patientIds: z.array(z.string().min(1).max(100)).max(100),
  mode: z.enum(["day", "upcoming"]).default("day"),
});
export type BriefingContext = {
  date: string;
  endDate?: string | undefined;
  patients: {
    reference: string;
    patientId: string;
    appointments: {
      title: string;
      date: string;
      kind: string;
      time: string;
      status: string;
      notes: string;
      author: string;
    }[];
    submissions: {
      at: string;
      reviewed: boolean;
      notes: { symptoms: string; medicines: string; questions: string };
      pdfs: number;
      audios: number;
    }[];
    guidance: { title: string; text: string }[];
  }[];
};
export const briefingOutput = z.object({
  patients: z
    .array(
      z.object({
        reference: z.string().max(10),
        summary: z.string().max(1500),
        recordedSuspicions: z.array(z.string().max(500)).max(5),
        reviewPoints: z.array(z.string().max(500)).max(6),
        missingInformation: z.array(z.string().max(500)).max(6),
      }),
    )
    .max(30),
});
export type BriefingOutput = z.infer<typeof briefingOutput>;
