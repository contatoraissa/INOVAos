import { Button } from "@/components/ui/button";
import type { PatientCareData } from "./usePatientCare";

const date = (value: string) => new Date(value).toLocaleString("pt-BR");
export function PatientSubmissionStatus({
  data,
  loading,
  onRefresh,
  onGuidance,
}: {
  data: PatientCareData | null;
  loading: boolean;
  onRefresh: () => void;
  onGuidance: () => void;
}) {
  return (
    <section className="surface p-5 print:hidden" aria-label="Status dos meus envios">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Meus envios ao médico</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Acompanhe o recebimento e a revisão das informações enviadas.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" disabled={loading} onClick={onRefresh}>
          {loading ? "Atualizando…" : "Atualizar status"}
        </Button>
      </div>
      {!data ? (
        <p role="status" className="mt-4 text-sm text-muted-foreground">
          {loading ? "Carregando seus envios…" : "Status indisponível. Tente atualizar."}
        </p>
      ) : (
        <>
          <div className="mt-4 space-y-3">
            {data.submissions.length ? (
              data.submissions.map((item) => (
                <article key={item.id} className="rounded-xl border border-border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold">Envio de {date(item.receivedAt)}</h3>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${item.reviewed ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}
                    >
                      {item.reviewed ? "Revisado pelo médico" : "Enviado · aguardando revisão"}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {item.audios.length} áudio(s) · {item.documents.length} laudo(s) ·{" "}
                    {item.orderId
                      ? "Relacionado a um pedido de exames"
                      : "Preparação geral da consulta"}
                  </p>
                  <ol className="mt-3 space-y-1 text-sm">
                    <li>✓ Recebido na caixa médica: {date(item.receivedAt)}</li>
                    <li>
                      {item.reviewed
                        ? `✓ Revisão marcada pelo médico${item.reviewedAt ? ": " + date(item.reviewedAt) : ""}`
                        : "◷ Aguardando revisão pelo médico"}
                    </li>
                  </ol>
                  {item.documents.length > 0 && (
                    <p className="mt-3 break-words text-xs text-muted-foreground">
                      Laudos: {item.documents.map((document) => document.name).join("; ")}
                    </p>
                  )}
                </article>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhum envio disponível. Confira sua preparação abaixo e confirme o envio ao médico.
              </p>
            )}
          </div>
          {data.guidance.length > 0 && (
            <div className="mt-4 rounded-xl bg-brand-soft p-4">
              <p className="text-sm font-semibold text-brand-deep">Orientação disponível</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Há {data.guidance.length} orientação(ões) publicada(s) para você. Elas podem não
                corresponder a um envio específico.
              </p>
              {data.guidance.slice(0, 3).map((item) => (
                <p key={item.id} className="mt-2 text-sm">
                  {item.title}
                  {item.publishedAt ? " · " + date(item.publishedAt) : ""}
                </p>
              ))}
              <Button type="button" variant="outline" className="mt-3" onClick={onGuidance}>
                Ler orientações do médico
              </Button>
            </div>
          )}
        </>
      )}
      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        Recebimento não significa leitura. Revisão não significa resposta. Os envios ficam
        disponíveis por até 24 horas ou até o servidor demonstrativo reiniciar.
      </p>
    </section>
  );
}
