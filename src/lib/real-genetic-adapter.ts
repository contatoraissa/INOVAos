import {
  listRealGenetics,
  importRealGenetics,
  originalRealGenetics,
  reviewRealGenetics,
  removeRealGenetics,
} from "./real-complements";
import type { RawGeneticRecord } from "./genetic-raw-contract";
export async function listAccountGeneticRecords(patientId: string): Promise<RawGeneticRecord[]> {
  const rows = await listRealGenetics({ data: { patientId } });
  return rows.map((r) => ({
    id: r.id,
    patientId,
    name: r.filename,
    importedAt: r.created_at,
    importedBy: r.importedBy,
    bytes: 0,
    sha256: r.sha256,
    stats: r.stats,
    reviewedAt: r.reviewed_at,
    reviewer: "Médico do prontuário",
    scoring: "not_configured",
  }));
}
export async function importAccountGeneticRecord(patientId: string, name: string, text: string) {
  return (await importRealGenetics({
    data: { patientId, filename: name, text, confirmed: true },
  })) as { id: string };
}
export async function originalAccountGeneticRecord(patientId: string, id: string) {
  const row = await originalRealGenetics({ data: { patientId, id } });
  return { name: row.filename, text: row.original_text };
}
export async function reviewAccountGeneticRecord(patientId: string, id: string) {
  return reviewRealGenetics({ data: { patientId, id, confirmed: true } });
}
export const removeAccountGeneticRecord = (patientId: string, id: string) =>
  removeRealGenetics({ data: { patientId, id, confirmed: true } });
