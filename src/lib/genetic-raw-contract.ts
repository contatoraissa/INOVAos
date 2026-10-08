import { z } from "zod";
export const MAX_GENETIC_BYTES = 25 * 1024 * 1024;
export const geneticDomains = [
  {
    name: "Neurologia",
    description: "Organização de predisposições neurológicas para revisão médica.",
  },
  {
    name: "Metabólico",
    description: "Organização de predisposições metabólicas para revisão médica.",
  },
  { name: "Imunidade", description: "Organização de predisposições relacionadas à imunidade." },
  { name: "Nutrição", description: "Organização de predisposições relacionadas à nutrição." },
] as const;
export const rawImportInput = z
  .object({
    patientId: z
      .string()
      .min(1)
      .max(100)
      .regex(/^[a-z0-9-]+$/),
    name: z
      .string()
      .min(1)
      .max(200)
      .regex(/\.txt$/i),
    text: z.string().min(1).max(MAX_GENETIC_BYTES),
    audience: z.enum(["doctor", "patient"]),
    fictionalConfirmed: z.literal(true),
    associationConfirmed: z.literal(true),
  })
  .strict();
export type RawVariant = { marker: string; chromosome: string; position: number; genotype: string };
export type RawStats = {
  markers: number;
  called: number;
  uncalled: number;
  duplicates: number;
  callRate: number;
  build: "GRCh37" | "GRCh38" | "Não identificado";
  strand: "+" | "Não identificada";
  chromosomes: string[];
  preview: RawVariant[];
  warnings: string[];
};
export type RawGeneticRecord = {
  id: string;
  patientId: string;
  name: string;
  importedAt: string;
  importedBy: "doctor" | "patient";
  bytes: number;
  sha256: string;
  stats: RawStats;
  reviewedAt: string | null;
  reviewer: string | null;
  scoring: "not_configured";
};
