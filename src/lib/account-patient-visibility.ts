import type { ConsultationEntry } from "./real-consultation-contract";
export function visiblePatientEntries(
  rows: ConsultationEntry[],
  publishedIds: ReadonlySet<string>,
) {
  return rows.filter(
    (e) =>
      e.kind !== "family" &&
      (e.status === "published" ||
        e.status === "reviewed" ||
        (e.status === "cancelled" && publishedIds.has(e.id))),
  );
}
