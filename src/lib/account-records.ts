import type { MedicalResult } from "./medical-reports";

export function reviewedResults(results: MedicalResult[], reportIds: string[]) {
  const released = new Set(reportIds);
  return results.filter((result) => released.has(result.report_id));
}
export function resultSeries(results: MedicalResult[]) {
  const groups = new Map<string, { name: string; unit: string; rows: MedicalResult[] }>();
  for (const result of results) {
    const key = `${result.name}\u0000${result.unit}`;
    const group = groups.get(key) ?? { name: result.name, unit: result.unit, rows: [] };
    group.rows.push(result);
    groups.set(key, group);
  }
  return [...groups.values()].map((group) => {
    const rows = [...group.rows].sort(
      (a, b) => a.collection_date.localeCompare(b.collection_date) || a.id - b.id,
    );
    return {
      ...group,
      latest: rows.at(-1)!,
      points: rows.flatMap((row) => {
        const value = row.value.trim();
        return /^[+-]?\d+(?:[.,]\d+)?$/.test(value)
          ? [{ date: row.collection_date, value: Number(value.replace(",", ".")) }]
          : [];
      }),
    };
  });
}
