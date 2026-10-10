import type { ConsultationPayload } from "./real-consultation-contract";
import { patientDraft } from "./patient-draft";
export async function readLocalPatientState(userId: string, patientId: string) {
  const [documents, preparation] = await Promise.all([
    patientDraft<{ id: string; name: string; createdAt?: string }[]>(
      `real:${userId}:${patientId}:documents`,
      "read",
    ),
    patientDraft<ConsultationPayload>(`real:${userId}:${patientId}:preparation`, "read"),
  ]);
  const draft = preparation?.value;
  return {
    documents: documents?.value ?? [],
    saved: Boolean(
      draft &&
      ([draft.symptoms, draft.medicines, draft.questions].some((v) => v?.trim()) ||
        draft.documents?.length ||
        draft.audios?.length ||
        draft.document ||
        draft.audio),
    ),
  };
}
