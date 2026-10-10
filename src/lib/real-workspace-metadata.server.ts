import { databaseRequest, type DatabaseConfig } from "./supabase.server.ts";
import type { ConsultationEntry } from "./real-consultation-contract";

// PostgREST projects only attachment names/MIME. Base64 never enters overview/briefing queries.
export async function readDoctorConsultationMetadata(
  config: DatabaseConfig,
  doctorId: string,
  fetcher: typeof fetch = fetch,
) {
  const fields = [
    "id",
    "patient_id",
    "kind",
    "status",
    "created_at",
    "updated_at",
    ...[
      "title",
      "text",
      "date",
      "symptoms",
      "medicines",
      "questions",
      "category",
      "sourceName",
      "sourceUrl",
      "sourceDate",
      "orderId",
    ].map((k) => `${k}:payload->>${k}`),
    "exams:payload->exams",
    "legacyDocument:payload->document->>name",
    "legacyAudio:payload->audio->>mime",
    ...[0, 1, 2].flatMap((i) => [
      `document${i}:payload->documents->${i}->>name`,
      `audio${i}:payload->audios->${i}->>mime`,
    ]),
  ];
  const rows = (await databaseRequest(
    config,
    `inova_consultation_entries?doctor_id=eq.${doctorId}&select=${fields.join(",")}&order=created_at.desc`,
    undefined,
    fetcher,
  )) as (Omit<ConsultationEntry, "payload"> & Record<string, unknown>)[];
  return rows.map((row) => ({
    id: row["id"],
    patient_id: row["patient_id"],
    kind: row["kind"],
    status: row["status"],
    created_at: row["created_at"],
    updated_at: row["updated_at"],
    audioCount: [row["legacyAudio"], row["audio0"], row["audio1"], row["audio2"]].filter(
      (v) => typeof v === "string" && v,
    ).length,
    documentNames: [
      row["legacyDocument"],
      row["document0"],
      row["document1"],
      row["document2"],
    ].filter((v): v is string => typeof v === "string" && Boolean(v)),
    payload: {
      title: String(row["title"] ?? ""),
      text: String(row["text"] ?? ""),
      date: String(row["date"] ?? ""),
      symptoms: String(row["symptoms"] ?? ""),
      medicines: String(row["medicines"] ?? ""),
      questions: String(row["questions"] ?? ""),
      category: (row["category"] ?? "Próximos passos") as ConsultationEntry["payload"]["category"],
      sourceName: String(row["sourceName"] ?? ""),
      sourceUrl: String(row["sourceUrl"] ?? ""),
      sourceDate: String(row["sourceDate"] ?? ""),
      orderId: typeof row["orderId"] === "string" ? row["orderId"] : null,
      exams: Array.isArray(row["exams"]) ? (row["exams"] as string[]) : [],
      audio: null,
      document: null,
      audios: [],
      documents: [],
    },
  }));
}
