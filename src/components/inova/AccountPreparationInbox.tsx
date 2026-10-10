import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, FileText, RefreshCw } from "lucide-react";
import {
  listConsultationEntries,
  transitionConsultationEntry,
  linkPatientPortal,
} from "@/lib/real-consultation";
import { uploadMedicalReport } from "@/lib/medical-reports";
import type { ConsultationPayload } from "@/lib/real-consultation-contract";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Attachment } from "./RealConsultation";
export function AccountPreparationInbox({
  patientId,
  userId,
  onNavigate,
}: {
  patientId: string;
  userId: string;
  onNavigate: (kind: "Laudos laboratoriais" | "Genética" | "Genômica", id?: string) => void;
}) {
  const cache = useQueryClient();
  const query = useQuery({
    queryKey: ["real-consultation", patientId, userId],
    queryFn: () => listConsultationEntries({ data: { patientId } }),
    refetchInterval: 30000,
  });
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const items = (query.data ?? []).filter((e) => e.kind === "preparation");
  const receipt = items.find((e) => e.id === selected) ?? items[0];
  async function act(run: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await run();
      await query.refetch();
      await cache.invalidateQueries({ queryKey: ["account-patient-reports", userId, patientId] });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível concluir.");
    } finally {
      setBusy(false);
    }
  }
  async function analyze(item: ConsultationPayload["documents"][number]) {
    await act(async () => {
      const kind =
        item.kind === "Genética" || item.kind === "Genômica" ? item.kind : "Laboratorial";
      const saved = await uploadMedicalReport({
        data: { patientId, filename: item.name, kind, pdf: item.data },
      });
      onNavigate(kind === "Laboratorial" ? "Laudos laboratoriais" : kind, saved.id);
    });
  }
  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-semibold">Preparação enviada pelo paciente</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Relatos, perguntas, medicamentos e laudos recebidos para revisão médica. Áudios são
            apresentados no original, sem transcrição automática.
          </p>
        </div>
        <Button variant="outline" disabled={busy} onClick={() => void query.refetch()}>
          <RefreshCw />
          Atualizar caixa
        </Button>
      </div>
      <p className="rounded-xl border bg-white p-4 text-xs text-muted-foreground">
        Envios do prontuário vinculado à sua conta. Confirmar identidade e contexto antes de usar as
        informações.
      </p>
      <details className="surface p-4">
        <summary className="cursor-pointer text-sm font-semibold text-brand-deep">
          Vincular a conta do paciente
        </summary>
        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void act(() => linkPatientPortal({ data: { patientId, email, confirmed: true } }));
          }}
        >
          <p className="text-sm text-muted-foreground">
            Informe o e-mail confirmado da conta gratuita. CPF e nascimento devem coincidir; confira
            a identidade antes de vincular.
          </p>
          <Input
            aria-label="E-mail da conta do paciente"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button disabled={busy}>Confirmar vínculo com este paciente</Button>
        </form>
      </details>
      {(error || query.error) && (
        <p role="alert" className="surface p-4 text-sm text-destructive">
          {error || query.error?.message}
        </p>
      )}
      <div className="grid items-start gap-5 xl:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="surface max-h-[80dvh] space-y-3 overflow-y-auto p-4">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => setSelected(item.id)}
              className={`w-full rounded-xl border p-4 text-left ${receipt?.id === item.id ? "border-brand/30 bg-brand-soft" : "border-border"}`}
            >
              <p className="text-sm font-semibold">
                {new Date(item.created_at).toLocaleString("pt-BR")}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {item.payload.audios.length + (item.payload.audio ? 1 : 0)} áudio(s) ·{" "}
                {item.payload.documents.length + (item.payload.document ? 1 : 0)} laudo(s)
              </p>
              <p className="mt-2 text-xs text-brand-deep">
                {item.status === "reviewed" ? "Revisado pelo médico" : "Aguardando revisão"}
              </p>
            </button>
          ))}
          {!items.length && (
            <p className="py-5 text-sm text-muted-foreground">
              {query.isPending
                ? "Carregando envios…"
                : "Nenhuma preparação recebida deste paciente."}
            </p>
          )}
        </aside>
        {receipt ? (
          <div
            key={receipt.id}
            className="surface max-h-[80dvh] space-y-6 overflow-y-auto overscroll-contain p-6"
          >
            <h3 className="font-display text-lg font-semibold">Respostas do paciente</h3>
            {receipt.payload.orderId && (
              <p className="text-xs text-muted-foreground">
                Envio relacionado a um pedido de exames deste prontuário.
              </p>
            )}
            {(
              [
                ["symptoms", "Como você tem se sentido?"],
                ["medicines", "Medicamentos e suplementos"],
                ["questions", "Suas perguntas para a consulta"],
              ] as const
            ).map(([field, label]) => (
              <section key={field} className="border-b pb-5">
                <h4 className="text-sm font-semibold">{label}</h4>
                <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">
                  {receipt.payload[field] || "Sem resposta escrita."}
                </p>
                {receipt.payload.audios
                  .filter((a) => a.field === field)
                  .map((a, i) => (
                    <Attachment key={i} {...a} name={label} />
                  ))}
              </section>
            ))}
            {receipt.payload.audios
              .filter((a) => !a.field)
              .map((a, i) => (
                <Attachment key={i} {...a} name={`Áudio ${i + 1} do paciente`} />
              ))}
            {receipt.payload.audio && (
              <Attachment {...receipt.payload.audio} name="Áudio do paciente" />
            )}
            <section>
              <h4 className="text-sm font-semibold">Laudos anexados</h4>
              {[
                ...receipt.payload.documents,
                ...(receipt.payload.document ? [receipt.payload.document] : []),
              ].map((item, i) => (
                <article key={i} className="mt-4 rounded-xl border p-4">
                  <FileText className="size-5 text-brand-deep" />
                  <p className="mt-2 break-words text-sm font-medium">{item.name}</p>
                  <Attachment preview data={item.data} mime="application/pdf" name={item.name} />
                  <Button
                    className="mt-3"
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => void analyze(item)}
                  >
                    Abrir na análise de laudos
                  </Button>
                </article>
              ))}
            </section>
            <div className="flex flex-wrap gap-3 border-t pt-5">
              <Button
                disabled={busy || receipt.status === "reviewed"}
                onClick={() =>
                  void act(() =>
                    transitionConsultationEntry({
                      data: { patientId, id: receipt.id, status: "reviewed", confirmed: true },
                    }),
                  )
                }
              >
                <Check />
                {receipt.status === "reviewed" ? "Envio revisado" : "Marcar envio como revisado"}
              </Button>
              <Button variant="outline" onClick={() => window.print()}>
                Imprimir envio
              </Button>
            </div>
          </div>
        ) : (
          <div className="surface p-8 text-sm text-muted-foreground">
            O paciente pode enviar a preparação pelo seu portal. Clique em Atualizar caixa para
            buscar novos envios.
          </div>
        )}
      </div>
    </section>
  );
}
