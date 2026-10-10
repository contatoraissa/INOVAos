import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listMedicalReports, type MedicalResult } from "@/lib/medical-reports";
import { Button } from "@/components/ui/button";
import { EmptyState } from "./Page";
import { Sparkles } from "lucide-react";
export function AccountPortfolioComparison({
  patients,
  userId,
}: {
  patients: { id: string; name: string }[];
  userId: string;
}) {
  const [selected, setSelected] = useState("");
  const patientId = selected || patients[0]?.id || "";
  const query = useQuery({
    queryKey: ["account-patient-reports", userId, patientId],
    queryFn: () => listMedicalReports({ data: { patientId } }),
    enabled: Boolean(patientId),
    retry: false,
  });
  return (
    <div className="space-y-5">
      <div className="toolbar">
        <label className="text-sm font-medium">
          Paciente
          <select
            aria-label="Paciente para comparação"
            className="ml-3 rounded-lg border bg-white p-3"
            value={patientId}
            onChange={(e) => setSelected(e.target.value)}
          >
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <Button variant="outline" onClick={() => void query.refetch()} disabled={!patientId}>
          Atualizar
        </Button>
      </div>
      {query.error ? (
        <p role="alert">{query.error.message}</p>
      ) : query.isPending && patientId ? (
        <p role="status">Carregando resultados…</p>
      ) : (
        <AccountComparison results={query.data?.results ?? []} />
      )}
    </div>
  );
}
export function AccountComparison({ results }: { results: MedicalResult[] }) {
  const dates = [...new Set(results.map((r) => r.collection_date))].sort();
  const [first, setFirst] = useState("");
  const [second, setSecond] = useState("");
  const [generatedFor, setGeneratedFor] = useState("");
  const a = dates.includes(first) ? first : (dates.at(-2) ?? "");
  const b = dates.includes(second) ? second : (dates.at(-1) ?? "");
  const signature = JSON.stringify([a, b, results]);
  if (dates.length < 2)
    return (
      <EmptyState
        title="Comparação entre coletas"
        text="São necessárias pelo menos duas coletas registradas deste paciente. Nenhum resultado de outra pessoa é usado para completar o histórico."
      />
    );
  const keys = [...new Map(results.map((r) => [`${r.name}\0${r.unit}`, r])).values()];
  return (
    <div className="space-y-5">
      <div className="toolbar">
        {[
          { label: "Primeira coleta", value: a, set: setFirst },
          { label: "Segunda coleta", value: b, set: setSecond },
        ].map((field) => (
          <label key={field.label} className="text-sm font-medium">
            {field.label}
            <select
              aria-label={field.label}
              className="ml-3 rounded-lg border bg-white p-3"
              value={field.value}
              onChange={(e) => field.set(e.target.value)}
            >
              {dates.map((date) => (
                <option key={date} value={date}>
                  {date.split("-").reverse().join("/")}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <section className="surface overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Exame</th>
              <th>{a}</th>
              <th>{b}</th>
              <th>Variação numérica</th>
              <th>Variação %</th>
            </tr>
          </thead>
          <tbody>
            {keys.map((key) => {
              const lookup = (date: string) =>
                [...results]
                  .reverse()
                  .find(
                    (r) => r.collection_date === date && r.name === key.name && r.unit === key.unit,
                  );
              const numeric = (value: string | undefined) =>
                value && /^[+-]?\d+(?:[.,]\d+)?$/.test(value.trim())
                  ? Number(value.replace(",", "."))
                  : NaN;
              const left = lookup(a),
                right = lookup(b),
                delta = numeric(right?.value) - numeric(left?.value);
              return (
                <tr key={`${key.name}:${key.unit}`}>
                  <td>
                    {key.name} · {key.unit}
                  </td>
                  <td>{left?.value ?? "Não disponível"}</td>
                  <td>{right?.value ?? "Não disponível"}</td>
                  <td>
                    {Number.isFinite(delta)
                      ? `${delta > 0 ? "+" : ""}${Number(delta.toFixed(3)).toLocaleString("pt-BR")}`
                      : "Sem comparação numérica"}
                  </td>
                  <td>
                    {Number.isFinite(delta) && numeric(left?.value) !== 0
                      ? `${Number(((delta / numeric(left?.value)) * 100).toFixed(2)).toLocaleString("pt-BR")}%`
                      : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
      <section className="flex flex-col justify-between gap-4 rounded-xl border border-brand/20 bg-brand-soft/50 p-5 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          <Sparkles className="size-5 text-brand-deep" />
          <div>
            <h3 className="font-display font-semibold">Conecte os resultados ao contexto</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Confira a prévia das coletas selecionadas e as lacunas para revisão.
            </p>
          </div>
        </div>
        <Button onClick={() => setGeneratedFor(signature)} disabled={generatedFor === signature}>
          <Sparkles />
          {generatedFor === signature ? "Prévia exibida" : "Ver prévia da análise"}
        </Button>
      </section>
      {generatedFor === signature && (
        <section className="insight-panel p-5" aria-label="Prévia de análise assistida">
          <p className="eyebrow">Comparação dos valores registrados · sem IA</p>
          <h3 className="mt-3 text-lg font-semibold">Revisão das duas coletas</h3>
          <p className="mt-3 text-sm text-muted-foreground">
            {a.split("-").reverse().join("/")} → {b.split("-").reverse().join("/")} · {keys.length}{" "}
            marcador(es) registrado(s). Confira valores ausentes, unidades e referências no
            original. Mudanças numéricas não comprovam melhora ou piora clínica.
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            A prévia reúne dados do prontuário; não é um parecer gerado por IA nem um diagnóstico.
          </p>
        </section>
      )}
      <p className="text-xs text-muted-foreground">
        Variação numérica não representa, por si só, melhora ou piora clínica. Confira unidades,
        referências e contexto.
      </p>
    </div>
  );
}
