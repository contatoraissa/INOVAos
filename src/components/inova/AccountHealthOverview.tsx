import { Activity, ArrowRight, ClipboardCheck, Dna } from "lucide-react";
import { resultSeries } from "@/lib/account-records";
import type { MedicalResult } from "@/lib/medical-reports";
import type { ConsultationEntry } from "@/lib/real-consultation-contract";
import type { Section } from "./patient-navigation";
export function AccountHealthOverview({
  name,
  results,
  entries,
  onOpen,
}: {
  name: string;
  results: MedicalResult[];
  entries: ConsultationEntry[];
  onOpen: (section: Section) => void;
}) {
  const latest = resultSeries(results);
  const orders = entries.filter((e) => e.kind === "order" && e.status === "published");
  return (
    <div className="space-y-5" aria-label="Resumo da minha saúde">
      <section className="rounded-2xl border border-brand/20 bg-brand-soft p-6">
        <p className="eyebrow">SEU PANORAMA · {name}</p>
        <h2 className="mt-3 font-display text-2xl font-semibold">O que merece sua atenção agora</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Última coleta disponível:{" "}
          {[...results].sort((a, b) => b.collection_date.localeCompare(a.collection_date))[0]
            ?.collection_date ?? "não informada"}
          . Este resumo mostra os dados disponíveis e o que precisa ser conferido com o médico; não
          define seu estado geral de saúde.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button
            onClick={() => onOpen(orders.length ? "orders" : "results")}
            className="rounded-xl border bg-white p-4 text-left"
          >
            <span className="text-xs font-semibold text-brand-deep">ACOMPANHAMENTO</span>
            <h3 className="mt-2 font-semibold">
              {orders.length
                ? `${orders.length} pedido(s) de exames liberado(s)`
                : `${results.length} resultado(s) disponível(is)`}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {orders.length
                ? "Confira o pedido e combine a coleta com o laboratório escolhido."
                : "Confira os resultados liberados e converse com seu médico sobre o contexto."}
            </p>
            <span className="mt-3 inline-flex items-center gap-2 text-sm text-brand-deep">
              {orders.length ? "Ver meus pedidos" : "Ver meu resultado"}
              <ArrowRight className="size-4" />
            </span>
          </button>
          <button
            onClick={() => onOpen("genetics")}
            className="rounded-xl border bg-white p-4 text-left"
          >
            <span className="text-xs font-semibold text-brand-deep">
              GENÉTICA · ANÁLISE PENDENTE
            </span>
            <h3 className="mt-2 font-semibold">Predisposições ainda não calculadas</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Importe e consulte seus arquivos. Os scores aguardam uma metodologia validada.
            </p>
            <span className="mt-3 inline-flex items-center gap-2 text-sm text-brand-deep">
              Abrir minha genética
              <ArrowRight className="size-4" />
            </span>
          </button>
        </div>
      </section>
      <section className="surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Activity className="size-5 text-brand" />
            Meus últimos resultados
          </h2>
          <button onClick={() => onOpen("history")} className="text-sm font-medium text-brand-deep">
            Ver minha evolução →
          </button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {latest.length ? (
            latest.slice(0, 4).map((s) => (
              <article key={s.name + s.unit} className="rounded-xl border bg-white p-4">
                <h3 className="text-sm font-semibold">{s.name}</h3>
                <p className="mt-4 text-2xl font-semibold">
                  {s.latest.value}
                  <span className="ml-2 text-xs font-normal text-muted-foreground">{s.unit}</span>
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {(() => {
                    const previous = s.rows
                      .filter((r) => r.collection_date < s.latest.collection_date)
                      .at(-1);
                    const numeric = (v: string) =>
                      /^[+-]?\d+(?:[.,]\d+)?$/.test(v.trim()) ? Number(v.replace(",", ".")) : NaN;
                    const delta = previous
                      ? numeric(s.latest.value) - numeric(previous.value)
                      : NaN;
                    return Number.isFinite(delta)
                      ? `${delta > 0 ? "+" : ""}${Number(delta.toFixed(2)).toLocaleString("pt-BR")} vs. ${previous!.collection_date.split("-").reverse().join("/")}`
                      : "Sem comparação";
                  })()}
                </p>
                <p className="mt-4 border-t pt-3 text-xs leading-relaxed text-muted-foreground">
                  {s.latest.reference || "Referência do laudo não informada"}
                </p>
              </article>
            ))
          ) : (
            <p className="col-span-full py-6 text-sm text-muted-foreground">
              Os resultados aparecerão após registro e liberação pelo médico.
            </p>
          )}
        </div>
      </section>
      <section className="grid gap-4 sm:grid-cols-2">
        <article className="surface p-5">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Dna className="size-5 text-brand" />
            Genética e genômica
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Arquivos e laudos ficam organizados para revisão médica. Sem cálculo validado, não há
            classificação de predisposição.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {["Neurologia", "Metabólico", "Imunidade", "Nutrição"].map((v) => (
              <span key={v} className="rounded-lg bg-background px-3 py-2 text-xs">
                {v} · pendente
              </span>
            ))}
          </div>
          <button
            onClick={() => onOpen("documents")}
            className="mt-4 text-sm font-medium text-brand-deep"
          >
            Consultar meus laudos e documentos →
          </button>
        </article>
        <article className="surface p-5">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <ClipboardCheck className="size-5 text-brand" />O cuidado indicado para você
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Confira os próximos passos e as orientações que seu médico revisou e liberou para você.
          </p>
          <button
            className="mt-4 text-sm font-medium text-brand-deep"
            onClick={() => onOpen("guidance")}
          >
            Ver orientações do médico →
          </button>
        </article>
      </section>
    </div>
  );
}
