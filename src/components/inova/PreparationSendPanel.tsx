import { useRef, useState } from "react";
import { CheckCircle2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createSessionId } from "@/lib/session-id";
import { sendPreparation } from "@/lib/preparation";
import {
  preparationFields,
  type PreparationInput,
  type PreparationReceipt,
} from "@/lib/preparation-contract";
import type { AudioClip } from "./AudioAnswer";
import type { ExamOrder } from "@/lib/exam-order-contract";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { PreparationReviewNotes, PreparationReviewDocument } from "./PreparationReview";
const base64 = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("Não foi possível ler um dos anexos."));
    reader.readAsDataURL(blob);
  });
export function PreparationSendPanel({
  notes,
  audios,
  documents,
  recording,
  orders,
  onSent,
}: {
  notes: PreparationInput["notes"];
  audios: Partial<Record<(typeof preparationFields)[number], AudioClip>>;
  documents: { id: string; name: string; kind: string; file: File }[];
  recording: boolean;
  orders: ExamOrder[];
  onSent: (receipt: PreparationReceipt) => void;
}) {
  const [chosen, setChosen] = useState<string[]>([]);
  const [reviewSignature, setReviewSignature] = useState<string | null>(null);
  const [orderId, setOrderId] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sentSignature, setSentSignature] = useState("");
  const [receipt, setReceipt] = useState<PreparationReceipt | null>(null);
  const request = useRef({ signature: "", id: "" });
  const attachments = documents.filter((item) => chosen.includes(item.id));
  const signature = JSON.stringify({
    orderId,
    notes,
    audios: preparationFields.map((field) => audios[field]?.id ?? null),
    documents: attachments.map((item) => item.id),
  });
  const hasContent =
    Object.values(notes).some((text) => text.trim()) ||
    Object.values(audios).some(Boolean) ||
    attachments.length > 0;
  async function send() {
    if (
      !confirmed ||
      recording ||
      sending ||
      !hasContent ||
      signature === sentSignature ||
      reviewSignature !== signature
    )
      return;
    setSending(true);
    setError("");
    try {
      const size =
        attachments.reduce((sum, item) => sum + item.file.size, 0) +
        Object.values(audios).reduce((sum, item) => sum + (item?.blob.size ?? 0), 0);
      if (attachments.length > 3 || size > 24 * 1024 * 1024)
        throw new Error("Envie até 3 laudos e até 24 MB no total.");
      if (request.current.signature !== signature)
        request.current = { signature, id: createSessionId() };
      const audioPayload: PreparationInput["audios"] = [];
      for (const field of preparationFields) {
        const clip = audios[field];
        if (clip)
          audioPayload.push({
            field,
            mime: clip.mime,
            duration: clip.duration,
            data: await base64(clip.blob),
          });
      }
      const documentPayload: PreparationInput["documents"] = [];
      for (const item of attachments)
        documentPayload.push({
          name: item.name,
          kind: item.kind as PreparationInput["documents"][number]["kind"],
          data: await base64(item.file),
        });
      const result = await sendPreparation({
        data: {
          requestId: request.current.id,
          patientId: "mariana-oliveira",
          ...(orderId ? { orderId } : {}),
          confirmed: true,
          notes: { ...notes },
          audios: audioPayload,
          documents: documentPayload,
        },
      });
      setReceipt(result);
      setReviewSignature(null);
      setSentSignature(signature);
      onSent(result);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Não foi possível enviar. Tente novamente.",
      );
    } finally {
      setSending(false);
    }
  }
  return (
    <section className="rounded-xl border border-brand/20 bg-brand-soft/40 p-5">
      <h3 className="text-base font-semibold">Enviar para a área médica</h3>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        Destinatário demonstrativo: Dr. Rafael Mendes. Envie as anotações e os áudios acima, junto
        dos laudos que selecionar abaixo.
      </p>
      <div className="mt-4 space-y-3">
        <label className="block text-sm">
          Relacionar envio a um pedido (opcional)
          <select
            aria-label="Relacionar envio a um pedido"
            className="mt-2 block w-full rounded-md border border-border bg-white p-2 text-sm"
            disabled={sending}
            value={orderId}
            onChange={(event) => setOrderId(event.target.value)}
          >
            <option value="">Preparação geral da consulta</option>
            {orders
              .filter((item) => item.status === "released")
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.exams.map((exam) => exam.name).join(", ")} ·{" "}
                  {new Date(item.createdAt).toLocaleDateString("pt-BR")}
                </option>
              ))}
          </select>
        </label>
        {documents.length ? (
          documents.map((item) => (
            <label key={item.id} className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                disabled={sending}
                checked={chosen.includes(item.id)}
                onChange={(event) =>
                  setChosen((items) =>
                    event.target.checked
                      ? [...items, item.id]
                      : items.filter((id) => id !== item.id),
                  )
                }
              />
              <span className="min-w-0 break-words">
                {item.name}
                <span className="mt-1 block text-xs text-muted-foreground">{item.kind}</span>
              </span>
            </label>
          ))
        ) : (
          <p className="text-xs text-muted-foreground">
            Nenhum PDF adicionado. Você pode enviar só suas respostas ou adicionar um laudo antes de
            enviar.
          </p>
        )}
      </div>
      <label className="mt-5 flex items-start gap-2 text-xs leading-relaxed">
        <input
          type="checkbox"
          disabled={sending}
          className="mt-1"
          checked={confirmed}
          onChange={(event) => setConfirmed(event.target.checked)}
        />
        Confirmo que as respostas e os anexos são fictícios ou anonimizados e quero enviá-los à
        caixa demonstrativa do médico.
      </label>
      <Button
        type="button"
        className="mt-4"
        disabled={!confirmed || !hasContent || recording || sending || signature === sentSignature}
        onClick={() => {
          setError("");
          setReviewSignature(signature);
        }}
      >
        <Send className="size-4" />
        {sending
          ? "Enviando preparação…"
          : signature === sentSignature
            ? "Preparação enviada"
            : "Revisar antes de enviar"}
      </Button>
      <Dialog
        open={reviewSignature !== null}
        onOpenChange={(open) => {
          if (!open && !sending) setReviewSignature(null);
        }}
      >
        <DialogContent
          className="flex max-h-[90dvh] flex-col sm:max-w-2xl"
          onEscapeKeyDown={(event) => {
            if (sending) event.preventDefault();
          }}
          onInteractOutside={(event) => {
            if (sending) event.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>Confira seu envio ao médico</DialogTitle>
            <DialogDescription>
              Nada foi enviado ainda. Revise as respostas, ouça os áudios e confira os PDFs
              selecionados.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 space-y-4 overflow-y-auto overscroll-contain pr-2">
            <div className="rounded-xl bg-brand-soft p-4 text-sm">
              <p className="font-semibold">Destinatário: Dr. Rafael Mendes · demonstrativo</p>
              <p className="mt-2">
                {orderId
                  ? "Pedido: " +
                    (orders
                      .find((item) => item.id === orderId)
                      ?.exams.map((item) => item.name)
                      .join(", ") ?? "Pedido selecionado")
                  : "Preparação geral da consulta"}
              </p>
              <p className="mt-2 text-xs">
                {Object.values(audios).filter(Boolean).length} áudio(s) · {attachments.length}{" "}
                PDF(s)
              </p>
            </div>
            <PreparationReviewNotes notes={notes} audios={audios} />
            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Laudos que serão enviados</h3>
              {attachments.length ? (
                attachments.map((item) => (
                  <PreparationReviewDocument key={item.id} file={item.file} name={item.name} />
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum PDF selecionado.</p>
              )}
            </section>
            {reviewSignature !== signature && (
              <p role="alert" className="text-sm text-destructive">
                O conteúdo mudou. Volte e abra a revisão novamente antes de enviar.
              </p>
            )}
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
          </div>
          <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
            <Button
              type="button"
              variant="outline"
              disabled={sending}
              onClick={() => setReviewSignature(null)}
            >
              Voltar e editar
            </Button>
            <Button
              type="button"
              disabled={sending || recording || !confirmed || reviewSignature !== signature}
              onClick={() => {
                void send();
              }}
            >
              <Send className="size-4" />
              {sending ? "Enviando preparação…" : "Confirmar envio ao médico"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {recording && (
        <p role="status" className="mt-2 text-xs text-muted-foreground">
          Conclua ou descarte a gravação antes de enviar.
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      )}
      {receipt && (
        <p role="status" className="mt-3 flex items-start gap-2 text-sm text-brand-deep">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          <span>
            Recebido na caixa demonstrativa do médico · {receipt.audios.length} áudio(s) e{" "}
            {receipt.documents.length} laudo(s).{" "}
            {signature !== sentSignature
              ? "Você fez alterações depois do envio; envie novamente para entregar uma nova versão."
              : "Acompanhe a revisão em Meus envios ao médico."}
          </span>
        </p>
      )}
      <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
        O envio fica temporariamente no servidor de demonstração por até 24 horas ou até ele
        reiniciar. Não é um canal de urgência nem uma confirmação de leitura pelo médico.
      </p>
    </section>
  );
}
