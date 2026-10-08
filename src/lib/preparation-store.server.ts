import { randomUUID } from "node:crypto";
import { recordCareEvent } from "./care-store.server.ts";
import type { CareEvent } from "./care-contract.ts";
import {
  MAX_AUDIO_BYTES,
  preparationInput,
  type PreparationInput,
  type PreparationReceipt,
} from "./preparation-contract.ts";
type Stored = {
  receipt: PreparationReceipt;
  requestId: string;
  audios: { mime: string; data: string }[];
  documents: { mime: string; data: string }[];
  bytes: number;
};
const TTL = 24 * 60 * 60 * 1000;
const MAX_TOTAL_BYTES = 128 * 1024 * 1024;
function decode(data: string, limit: number) {
  if (!data || data.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(data))
    throw new Error("Arquivo inválido.");
  const bytes = Buffer.from(data, "base64");
  if (bytes.length > limit || bytes.toString("base64") !== data)
    throw new Error("Arquivo inválido ou acima do limite.");
  return bytes;
}
export function audioMatches(bytes: Buffer, mime: string) {
  if (mime === "audio/webm")
    return bytes.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
  if (mime === "audio/ogg") return bytes.subarray(0, 4).toString() === "OggS";
  if (mime === "audio/mp4") return bytes.subarray(4, 8).toString() === "ftyp";
  if (mime === "audio/wav")
    return (
      bytes.subarray(0, 4).toString() === "RIFF" && bytes.subarray(8, 12).toString() === "WAVE"
    );
  return (
    bytes.subarray(0, 3).toString() === "ID3" ||
    (bytes[0] === 0xff && ((bytes[1] ?? 0) & 0xe0) === 0xe0)
  );
}
export function createPreparationStore(
  now = () => Date.now(),
  onEvent?: (event: Omit<CareEvent, "read">) => void,
) {
  const entries = new Map<string, Stored>();
  function expire() {
    for (const [id, item] of entries)
      if (now() - new Date(item.receipt.receivedAt).getTime() >= TTL) entries.delete(id);
  }
  return {
    submit(raw: PreparationInput) {
      expire();
      const input = preparationInput.parse(raw);
      const existing = [...entries.values()].find((item) => item.requestId === input.requestId);
      if (existing) return existing.receipt;
      let bytes = 0;
      const audios = input.audios.map((item, index) => {
        const decoded = decode(item.data, MAX_AUDIO_BYTES);
        bytes += decoded.length;
        if (!audioMatches(decoded, item.mime)) throw new Error("O formato de um áudio é inválido.");
        return {
          index,
          field: item.field,
          mime: item.mime,
          duration: item.duration,
          bytes: decoded.length,
        };
      });
      const documents = input.documents.map((item, index) => {
        const decoded = decode(item.data, 8 * 1024 * 1024);
        bytes += decoded.length;
        if (decoded.subarray(0, 5).toString() !== "%PDF-")
          throw new Error("Um dos laudos não é um PDF válido.");
        return { index, name: item.name, kind: item.kind, bytes: decoded.length };
      });
      if (bytes > 24 * 1024 * 1024) throw new Error("O envio deve ter até 24 MB no total.");
      if (
        entries.size >= 20 ||
        [...entries.values()].reduce((sum, item) => sum + item.bytes, 0) + bytes > MAX_TOTAL_BYTES
      )
        throw new Error("A caixa demonstrativa está cheia. Remova um envio pela área médica.");
      const receipt: PreparationReceipt = {
        id: randomUUID(),
        patientId: input.patientId,
        ...(input.orderId ? { orderId: input.orderId } : {}),
        receivedAt: new Date(now()).toISOString(),
        reviewed: false,
        reviewedAt: null,
        notes: input.notes,
        audios,
        documents,
      };
      entries.set(receipt.id, {
        receipt,
        requestId: input.requestId,
        bytes,
        audios: input.audios.map(({ mime, data }) => ({ mime, data })),
        documents: input.documents.map(({ data }) => ({ mime: "application/pdf", data })),
      });
      onEvent?.({
        id: `${receipt.id}:received`,
        patientId: receipt.patientId,
        at: receipt.receivedAt,
        title: "Sua preparação foi recebida",
        detail: `${audios.length} áudio(s) e ${documents.length} laudo(s) recebidos na caixa médica. Aguardando revisão.`,
        destination: "consultation",
      });
      return receipt;
    },
    list(patientId: string) {
      expire();
      return [...entries.values()]
        .filter((item) => item.receipt.patientId === patientId)
        .map((item) => item.receipt)
        .reverse();
    },
    attachment(id: string, kind: "audio" | "document", index: number) {
      expire();
      const item = entries.get(id);
      if (!item) throw new Error("Envio não encontrado ou expirado.");
      const attachment = (kind === "audio" ? item.audios : item.documents)[index];
      if (!attachment) throw new Error("Anexo não encontrado.");
      return attachment;
    },
    review(id: string) {
      expire();
      const item = entries.get(id);
      if (!item) throw new Error("Envio não encontrado.");
      if (!item.receipt.reviewed) {
        item.receipt.reviewed = true;
        item.receipt.reviewedAt = new Date(now()).toISOString();
        onEvent?.({
          id: `${id}:reviewed`,
          patientId: item.receipt.patientId,
          at: item.receipt.reviewedAt,
          title: "Seu envio foi revisado pelo médico",
          detail:
            "A revisão foi marcada pelo profissional; confira se há uma orientação publicada.",
          destination: "guidance",
        });
      }
    },
    remove(id: string) {
      entries.delete(id);
    },
  };
}
export const preparationStore = createPreparationStore(() => Date.now(), recordCareEvent);
