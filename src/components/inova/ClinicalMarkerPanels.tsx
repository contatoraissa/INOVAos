import { useState } from "react";
import { Activity, ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import type { MedicalResult } from "@/lib/medical-reports";
import { Input } from "@/components/ui/input";
import { patientAgeOnDate } from "@/lib/patient-age";
import { markerReference, type MarkerKey } from "@/lib/marker-reference";

const colors = ["#0891b2", "#7c3aed", "#e87924", "#059669", "#db2777", "#2563eb"];
export function ClinicalMarkerPanels({
  results,
  birth,
  patient = false,
}: {
  results: MedicalResult[];
  birth?: string | undefined;
  patient?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [since, setSince] = useState("");
  const dates = [...new Set(results.map((r) => r.collection_date))].sort();
  const groups = [...new Set(results.map((r) => JSON.stringify([r.name, r.unit])))];
  return (
    <section className="space-y-5" aria-label="Painel de todos os parâmetros laboratoriais">
      <div className="surface flex flex-wrap items-end justify-between gap-4 p-5">
        <div>
          <p className="eyebrow">RESULTADOS E EVOLUÇÃO</p>
          <h2 className="mt-2 font-display text-2xl font-semibold">
            {patient ? "Seus resultados ao longo do tempo" : "Parâmetros do paciente"}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {groups.length} marcador(es) · {dates.length} coleta(s) confirmada(s)
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <label className="text-xs font-medium">
            Encontrar parâmetro
            <Input
              className="mt-1"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Exame…"
            />
          </label>
          <label className="text-xs font-medium">
            Período
            <select
              className="mt-1 block h-10 rounded-md border bg-white px-3"
              value={since}
              onChange={(e) => setSince(e.target.value)}
            >
              <option value="">Todo o histórico</option>
              {dates.map((date) => (
                <option key={date} value={date}>
                  Desde {date.split("-").reverse().join("/")}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
      <div
        className={
          patient ? "grid gap-5 sm:grid-cols-2" : "grid gap-5 lg:grid-cols-2 xl:grid-cols-3"
        }
      >
        {groups
          .filter((key) =>
            JSON.parse(key)[0]
              .toLocaleLowerCase("pt-BR")
              .includes(search.toLocaleLowerCase("pt-BR")),
          )
          .map((key, index) => {
            const entries = results
              .filter(
                (r) =>
                  JSON.stringify([r.name, r.unit]) === key &&
                  (!since || r.collection_date >= since),
              )
              .sort((a, b) => a.collection_date.localeCompare(b.collection_date));
            const latest = entries.at(-1),
              previous = entries.at(-2);
            if (!latest) return null;
            const numeric = (value: string) =>
              /^-?\d+(?:[.,]\d+)?$/.test(value.trim())
                ? Number(value.trim().replace(",", "."))
                : null;
            const current = numeric(latest.value),
              before = previous ? numeric(previous.value) : null;
            const change = current !== null && before !== null ? current - before : null;
            const points = entries.flatMap((r) => {
              const value = numeric(r.value);
              return value === null ? [] : [{ date: r.collection_date, value }];
            });
            const color = colors[index % colors.length];
            const age = patientAgeOnDate(birth, latest.collection_date);
            const name = latest.name.toLocaleLowerCase("pt-BR").trim();
            const marker: MarkerKey | null =
              name === "hemoglobina" && latest.unit === "g/dL"
                ? "hemoglobina"
                : name === "glicemia" && latest.unit === "mg/dL"
                  ? "glicemia"
                  : ["ldl", "colesterol ldl"].includes(name) && latest.unit === "mg/dL"
                    ? "ldl"
                    : ["vitamina d", "25-oh vitamina d", "25-hidroxivitamina d"].includes(name) &&
                        latest.unit === "ng/mL"
                      ? "vitaminaD"
                      : null;
            const reference = marker ? markerReference(marker, age) : null;
            const Direction =
              change === null || change === 0 ? Minus : change > 0 ? ArrowUpRight : ArrowDownRight;
            return (
              <article
                key={key}
                className="surface overflow-hidden"
                style={patient ? undefined : { borderTop: `4px solid ${color}` }}
              >
                <div className="p-5">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold">{latest.name}</h3>
                    <Activity className="size-5" style={{ color }} />
                  </div>
                  <p className="mt-4 font-display text-3xl font-semibold">
                    {latest.value}{" "}
                    <span className="text-sm font-normal text-muted-foreground">{latest.unit}</span>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Última coleta: {latest.collection_date.split("-").reverse().join("/")}
                  </p>
                  <div className="mt-4 flex items-center justify-between gap-3 rounded-lg bg-background p-3 text-xs">
                    <span>
                      Anterior:{" "}
                      {previous ? `${previous.value} ${previous.unit}` : "Sem coleta anterior"}
                    </span>
                    <span className="flex items-center gap-1 font-medium" style={{ color }}>
                      <Direction className="size-4" />
                      {change === null
                        ? "—"
                        : `${change > 0 ? "+" : ""}${change.toLocaleString("pt-BR", { maximumFractionDigits: 3 })} ${latest.unit}`}
                    </span>
                  </div>
                  {points.length >= 1 ? (
                    <div className="mt-4 h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={points}
                          margin={{ left: 0, right: 15, top: 10, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis
                            dataKey="date"
                            tickFormatter={(d) =>
                              String(d).split("-").reverse().slice(0, 2).join("/")
                            }
                            tick={{ fontSize: 11 }}
                          />
                          <YAxis domain={["auto", "auto"]} width={45} tick={{ fontSize: 11 }} />
                          <Tooltip
                            labelFormatter={(d) => String(d).split("-").reverse().join("/")}
                            formatter={(v) => [`${v} ${latest.unit}`, latest.name]}
                          />
                          <Line
                            type="linear"
                            dataKey="value"
                            stroke={color}
                            strokeWidth={3}
                            dot={{ r: 4, fill: color }}
                            activeDot={{ r: 6 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="mt-4 flex h-48 items-center justify-center rounded-xl bg-background p-5 text-center text-sm text-muted-foreground">
                      {points.length === 1
                        ? "Uma coleta disponível. O gráfico aparece após uma segunda coleta numérica."
                        : "Resultado qualitativo: consulte os valores no histórico."}
                    </div>
                  )}
                  <p className="mt-3 text-xs text-muted-foreground">
                    Referência do laudo: {latest.reference || "Não informada"}
                  </p>
                  <div className="mt-3 rounded-xl border bg-background p-3">
                    <p className="text-xs font-semibold">
                      Idade na coleta: {age === null ? "não disponível" : `${age} anos`}
                    </p>
                    <p className="mt-2 text-xs font-medium">
                      Parâmetro de consulta:{" "}
                      {reference?.value ?? "Conferir intervalo específico do laboratório"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {reference?.note ??
                        "Não há referência validada cadastrada para este exame e unidade. A idade isolada não permite escolher uma faixa."}
                    </p>
                    {reference?.sourceUrl && (
                      <a
                        className="mt-2 inline-block text-xs text-brand-deep underline"
                        href={reference.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {reference.sourceName}
                      </a>
                    )}
                  </div>
                  {latest.flag !== "sem_classificacao" && (
                    <p className="mt-2 text-xs font-medium text-amber-700">
                      Sinalização do laudo:{" "}
                      {latest.flag === "reportado_critico"
                        ? "valor crítico reportado"
                        : "alteração reportada"}
                    </p>
                  )}
                </div>
              </article>
            );
          })}
      </div>
      {!results.length && (
        <div className="surface p-6 text-sm text-muted-foreground">
          Os parâmetros e gráficos aparecerão após confirmar os resultados dos laudos.
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        As cores identificam os marcadores. As diferenças mostram variações numéricas; não
        classificam melhora ou piora clínica. Valores com unidades diferentes ficam separados.
      </p>
    </section>
  );
}
