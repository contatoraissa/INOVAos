import { useEffect, useState } from "react";
import { Activity, Dna, ArrowRight, ClipboardCheck } from "lucide-react";
import { patientAgeOnDate } from "@/lib/patient-age";
import { patients, patientHistoryById } from "@/data/demo";
import { markerReference, type MarkerKey } from "@/lib/marker-reference";
import { listRawGenetics } from "@/lib/genetic-raw";

export function PatientHealthOverview({
  onOpen,
}: {
  onOpen: (section: "results" | "history" | "genetics" | "documents" | "guidance") => void;
}) {
  const history = patientHistoryById["mariana-oliveira"];
  const latest = history?.history.at(-1);
  const previous = history?.history.at(-2);
  const [genetics, setGenetics] = useState<number | null>(null);
  const [geneticError, setGeneticError] = useState(false);
  useEffect(() => {
    let active = true;
    void listRawGenetics({ data: { patientId: "mariana-oliveira" } })
      .then((records) => {
        if (active) setGenetics(records.length);
      })
      .catch(() => {
        if (active) setGeneticError(true);
      });
    return () => {
      active = false;
    };
  }, []);
  return (
    <div className="space-y-5" aria-label="Resumo da minha saúde">
      <section className="rounded-2xl border border-brand/20 bg-brand-soft p-6">
        <p className="eyebrow">SEU PANORAMA · MARIANA OLIVEIRA</p>
        <h2 className="mt-3 font-display text-2xl font-semibold">O que merece sua atenção agora</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Última coleta disponível: {latest?.period ?? "não informada"}. Este resumo mostra os dados
          disponíveis e o que precisa ser conferido com o médico; não define seu estado geral de
          saúde.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button
            onClick={() => onOpen("results")}
            className="rounded-xl border border-amber-200 bg-white p-4 text-left"
          >
            <span className="text-xs font-semibold text-amber-800">REFERÊNCIA A CONFIRMAR</span>
            <h3 className="mt-2 font-semibold">Colesterol LDL · {latest?.ldl ?? "—"} mg/dL</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Sua meta individual não está registrada. Confira os resultados e converse com seu
              médico sobre a meta adequada ao seu histórico.
            </p>
            <span className="mt-3 inline-flex items-center gap-2 text-sm text-brand-deep">
              Ver meu resultado <ArrowRight className="size-4" />
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
              {geneticError
                ? "Não foi possível consultar seus arquivos agora."
                : genetics === null
                  ? "Consultando arquivos disponíveis…"
                  : genetics === 0
                    ? "Nenhum arquivo bruto importado neste perfil."
                    : `${genetics} arquivo(s) bruto(s) disponível(is).`}{" "}
              Os scores aguardam uma metodologia validada.
            </p>
            <span className="mt-3 inline-flex items-center gap-2 text-sm text-brand-deep">
              Abrir minha genética <ArrowRight className="size-4" />
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
          {(
            [
              { key: "hemoglobina", name: "Hemoglobina", unit: "g/dL" },
              { key: "glicemia", name: "Glicemia", unit: "mg/dL" },
              { key: "ldl", name: "Colesterol LDL", unit: "mg/dL" },
              { key: "vitaminaD", name: "Vitamina D", unit: "ng/mL" },
            ] as { key: MarkerKey; name: string; unit: string }[]
          ).map((marker) => {
            const reference = markerReference(
              marker.key,
              patientAgeOnDate(
                patients.find((patient) => patient.id === "mariana-oliveira")?.birth,
                history?.updatedAt ?? "",
              ),
              history?.gender,
            );
            const value = latest?.[marker.key];
            const old = previous?.[marker.key];
            const delta = value !== undefined && old !== undefined ? value - old : null;
            return (
              <article key={marker.key} className="rounded-xl border bg-white p-4">
                <h3 className="text-sm font-semibold">{marker.name}</h3>
                <p className="mt-4 text-2xl font-semibold">
                  {value?.toLocaleString("pt-BR") ?? "—"}
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    {marker.unit}
                  </span>
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {delta === null
                    ? "Sem comparação"
                    : `${delta > 0 ? "+" : ""}${Number(delta.toFixed(1)).toLocaleString("pt-BR")} vs. ${previous?.period}`}
                </p>
                <p className="mt-4 border-t pt-3 text-xs leading-relaxed text-muted-foreground">
                  {reference.value}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {marker.key === "glicemia"
                    ? "Jejum não informado: a referência não classifica este resultado."
                    : marker.key === "vitaminaD"
                      ? "Parâmetro geral; confirmar contexto e referência do laudo."
                      : marker.key === "hemoglobina"
                        ? "Parâmetro para adultos; confira o intervalo do laboratório."
                        : "A idade isolada não define sua meta."}
                </p>
              </article>
            );
          })}
        </div>
      </section>
      <section className="grid gap-4 sm:grid-cols-2">
        <article className="surface p-5">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Dna className="size-5 text-brand" />
            Genética e genômica
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Neurologia, metabolismo, imunidade e nutrição ficam organizados em quatro domínios. Sem
            cálculo validado, não há classificação de risco nem indicação automática de cuidado por
            domínio.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {["Neurologia", "Metabólico", "Imunidade", "Nutrição"].map((label) => (
              <span key={label} className="rounded-lg bg-background px-3 py-2 text-xs">
                {label} · pendente
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
            Confira as orientações publicadas pelo seu médico. Os resultados laboratoriais e os
            achados genéticos precisam ser interpretados junto ao seu histórico; este painel não
            gera tratamento.
          </p>
          <button
            onClick={() => onOpen("guidance")}
            className="mt-5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white"
          >
            Ver orientações do médico
          </button>
        </article>
      </section>
    </div>
  );
}
