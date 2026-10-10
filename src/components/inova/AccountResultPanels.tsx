import { useState } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  CircleAlert,
  FileText,
  Minus,
  Search,
  Sparkles,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "./Page";
import type { MedicalResult } from "@/lib/medical-reports";
import { resultSeries } from "@/lib/account-records";
import { patientAgeOnDate } from "@/lib/patient-age";
import { AccountResultsAI } from "./AccountResultsAI";

const accountDate = (date: string) => date.split("-").reverse().join("/");
const numeric = (value: string) =>
  /^[+-]?\d+(?:[.,]\d+)?$/.test(value.trim()) ? Number(value.replace(",", ".")) : null;
const format = (value: number) => value.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
export function AccountResults({
  results,
  charts = false,
  name,
  birth,
  audience = "doctor",
  patientId,
  compact = false,
  collectionPeriod,
}: {
  results: MedicalResult[];
  charts?: boolean;
  name?: string;
  birth?: string;
  audience?: "doctor" | "patient";
  patientId?: string;
  compact?: boolean;
  collectionPeriod?: string;
}) {
  const [search, setSearch] = useState("");
  const [date, setDate] = useState("");
  const [period, setPeriod] = useState("Todo histórico");
  const [highlighted, setHighlighted] = useState(false);
  const dates = [...new Set(results.map((r) => r.collection_date))].sort().reverse();
  const selectedDate =
    (dates.includes(collectionPeriod ?? date) ? (collectionPeriod ?? date) : dates[0]) ?? "";
  const latestDate = dates[0];
  const age =
    birth && latestDate ? patientAgeOnDate(accountDate(birth), accountDate(latestDate)) : null;
  const cutoff = latestDate ? new Date(latestDate + "T12:00:00Z") : null;
  if (cutoff && period !== "Todo histórico")
    cutoff.setUTCMonth(
      cutoff.getUTCMonth() - ({ "6 meses": 6, "1 ano": 12, "2 anos": 24 }[period] ?? 0),
    );
  const withinPeriod = results.filter(
    (r) =>
      !cutoff ||
      period === "Todo histórico" ||
      r.collection_date >= cutoff.toISOString().slice(0, 10),
  );
  const selected = (
    charts ? withinPeriod : results.filter((r) => r.collection_date === selectedDate)
  ).filter((r) => r.name.toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR")));
  const series = resultSeries(
    results.filter((r) =>
      r.name.toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR")),
    ),
  );
  const displayed = series.filter(
    (s) =>
      selected.some((r) => r.name === s.name && r.unit === s.unit) &&
      (!highlighted || ["reportado_alterado", "reportado_critico"].includes(s.latest.flag)),
  );
  if (!results.length)
    return (
      <EmptyState
        title="Resultados ainda indisponíveis"
        text="Os resultados aparecerão aqui quando forem registrados e liberados para sua conta."
      />
    );
  return (
    <section
      className="space-y-5"
      aria-label={charts ? "Evolução dos principais marcadores" : "Resultados da coleta"}
    >
      {charts && (
        <div className="surface p-5" aria-label="Perfil usado nas referências">
          <p className="text-sm font-semibold">{name ?? "Resultados do prontuário"}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Nascimento: {birth ? accountDate(birth) : "Não informado"} ·{" "}
            {age === null
              ? "Idade não calculada"
              : `${age} anos na última coleta (${accountDate(latestDate!)})`}
          </p>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            As referências são as registradas no laudo. Idade, unidade, método e contexto devem ser
            conferidos pelo profissional.
          </p>
        </div>
      )}
      {!compact && (
        <div className={charts ? "flex flex-wrap items-center justify-between gap-4" : "toolbar"}>
          <div>
            <h3 className="font-display text-lg font-semibold">
              {charts
                ? audience === "patient"
                  ? "Seus resultados ao longo do tempo"
                  : "Principais marcadores em perspectiva"
                : (name ?? "Resultados da coleta")}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {charts
                ? "Valores, variação e evolução no mesmo lugar."
                : "Resultados registrados da coleta selecionada"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {charts && audience === "doctor" && (
              <Button
                variant={highlighted ? "default" : "outline"}
                size="sm"
                aria-pressed={highlighted}
                onClick={() => setHighlighted((v) => !v)}
              >
                <CircleAlert />
                {highlighted ? "Mostrar todos" : "Somente destacados"}
              </Button>
            )}
            <Select
              value={charts ? period : selectedDate}
              onValueChange={charts ? setPeriod : setDate}
            >
              <SelectTrigger
                className="w-40"
                aria-label={charts ? "Período dos gráficos" : "Coleta dos resultados"}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(charts ? ["6 meses", "1 ano", "2 anos", "Todo histórico"] : dates).map((d) => (
                  <SelectItem key={d} value={d}>
                    {charts ? d : accountDate(d)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="relative w-full">
            <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
            <Input
              aria-label="Pesquisar resultado"
              placeholder="Pesquisar marcador ou categoria"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      )}
      {audience === "patient" && patientId && (
        <AccountResultsAI
          key={JSON.stringify([period, selectedDate, search])}
          patientId={patientId}
          results={selected}
          history={charts}
        />
      )}
      <div className={charts ? "grid gap-5 lg:grid-cols-2" : "grid gap-4 md:grid-cols-2"}>
        {charts
          ? displayed.map((s) => {
              const rows = [...s.rows].sort(
                (a, b) => a.collection_date.localeCompare(b.collection_date) || a.id - b.id,
              );
              const previous = rows
                .filter((r) => r.collection_date < s.latest.collection_date)
                .at(-1);
              const currentNumber = numeric(s.latest.value),
                previousNumber = previous ? numeric(previous.value) : null;
              const delta =
                currentNumber === null || previousNumber === null
                  ? null
                  : currentNumber - previousNumber;
              const Direction =
                delta === null || delta === 0 ? Minus : delta > 0 ? ArrowUpRight : ArrowDownRight;
              const points = s.points.filter((p) =>
                withinPeriod.some(
                  (r) => r.name === s.name && r.unit === s.unit && r.collection_date === p.date,
                ),
              );
              const isHighlighted = ["reportado_alterado", "reportado_critico"].includes(
                s.latest.flag,
              );
              return (
                <article
                  key={s.name + s.unit}
                  className={`surface p-5 ${isHighlighted ? "border-amber-200" : ""}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex size-9 items-center justify-center rounded-xl bg-brand-soft text-brand-deep">
                        <Activity className="size-4" />
                      </span>
                      <div>
                        <h4 className="text-sm font-semibold">{s.name}</h4>
                        <p className="mt-1 text-xs text-muted-foreground">Evolução · {s.unit}</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] text-muted-foreground">
                      {isHighlighted ? "Referência sinalizada no laudo" : "Acompanhamento"}
                    </span>
                  </div>
                  <div className="mt-5 flex items-end justify-between gap-3">
                    <div>
                      <span className="font-display text-3xl font-semibold">{s.latest.value}</span>
                      <span className="ml-2 text-sm text-muted-foreground">{s.unit}</span>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Último resultado · {accountDate(s.latest.collection_date)}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center gap-1 text-sm font-medium text-brand-deep">
                        <Direction className="size-4" />
                        {delta === null ? "—" : `${delta > 0 ? "+" : ""}${format(delta)}`}
                      </span>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {previous
                          ? `vs. ${accountDate(previous.collection_date)}`
                          : "Sem coleta anterior"}
                      </p>
                    </div>
                  </div>
                  <div
                    className="mt-4 rounded-xl bg-brand-soft/50 p-4"
                    aria-label={`Referência de ${s.name}`}
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-deep">
                      Referência do laudo
                    </p>
                    <p className="mt-2 text-sm font-semibold">
                      {s.latest.reference || "Não informada"}
                    </p>
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      Confira o intervalo, o método e o contexto no documento original.
                    </p>
                  </div>
                  {points.length ? (
                    <div
                      className="mt-5 h-52"
                      role="img"
                      aria-label={`Evolução de ${s.name}: ${points.map((p) => `${accountDate(p.date)}: ${p.value} ${s.unit}`).join("; ")}`}
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={points}
                          margin={{ top: 12, right: 15, left: -12, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 5" vertical={false} />
                          <XAxis
                            dataKey="date"
                            tickFormatter={accountDate}
                            tick={{ fontSize: 10 }}
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis
                            domain={["auto", "auto"]}
                            tick={{ fontSize: 10 }}
                            tickLine={false}
                            axisLine={false}
                          />
                          <Tooltip labelFormatter={(v) => accountDate(String(v))} />
                          <Line
                            type="linear"
                            dataKey="value"
                            stroke="#09a3bc"
                            strokeWidth={2.5}
                            dot={{ r: 3 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <p className="mt-5 text-sm text-muted-foreground">
                      Não há valores numéricos neste período para traçar a evolução.
                    </p>
                  )}
                  <p className="mt-3 border-t pt-3 text-[11px] text-muted-foreground">
                    {points.length < 2
                      ? "São necessárias duas coletas numéricas para comparar a evolução. "
                      : ""}
                    Variação numérica não representa melhora ou piora clínica.
                  </p>
                </article>
              );
            })
          : selected.map((r) => (
              <article key={r.id} className="surface p-5">
                <div className="flex items-center gap-2">
                  <FileText className="size-4 text-brand-deep" />
                  <p className="eyebrow">Resultado laboratorial</p>
                </div>
                <h3 className="mt-4 text-sm font-medium">{r.name}</h3>
                <p className="mt-2 font-display text-2xl font-semibold">
                  {r.value}{" "}
                  <span className="text-sm font-normal text-muted-foreground">{r.unit}</span>
                </p>
                <p className="mt-4 text-xs text-muted-foreground">
                  Coleta: {accountDate(r.collection_date)}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Referência do laudo: {r.reference || "Não informada"}
                </p>
              </article>
            ))}
      </div>
      {(!selected.length || (charts && !displayed.length)) && (
        <EmptyState
          title="Nenhum marcador encontrado"
          text="Altere a pesquisa, o período ou o filtro de destaques."
        />
      )}
      {charts && (
        <p className="text-[11px] text-muted-foreground">
          O período filtra os gráficos; valor atual e variação usam as últimas coletas disponíveis.
          Marcadores com unidades diferentes ficam separados. Destaques refletem apenas a
          sinalização registrada no laudo.
        </p>
      )}
    </section>
  );
}
export function AccountHistory({ results, name }: { results: MedicalResult[]; name: string }) {
  const dates = [...new Set(results.map((r) => r.collection_date))].sort().reverse();
  const [selected, setSelected] = useState("");
  const date = dates.includes(selected) ? selected : dates[0];
  if (!date)
    return (
      <EmptyState
        title="Histórico ainda não disponível"
        text="As coletas aparecerão quando os resultados forem registrados neste prontuário."
      />
    );
  return (
    <section className="grid gap-5 lg:grid-cols-[320px_1fr]">
      <aside className="surface p-5">
        <h2 className="font-display text-xl font-semibold">Evolução dos exames</h2>
        <div className="mt-5 space-y-6">
          {[...new Set(dates.map((d) => d.slice(0, 4)))].map((year) => (
            <div key={year}>
              <p className="mb-3 text-xs font-semibold uppercase text-muted-foreground">{year}</p>
              <div className="space-y-2 border-l pl-4">
                {dates
                  .filter((d) => d.startsWith(year))
                  .map((d) => (
                    <button
                      key={d}
                      onClick={() => setSelected(d)}
                      className={`block w-full rounded-md px-3 py-2 text-left text-sm ${d === date ? "bg-brand-soft font-semibold text-brand-deep" : "hover:bg-muted"}`}
                    >
                      {accountDate(d)}
                    </button>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </aside>
      <div className="surface p-5">
        <h2 className="font-display text-xl font-semibold">{accountDate(date)}</h2>
        <p className="mt-1 text-sm text-muted-foreground">Resultados da coleta selecionada</p>
        <div className="mt-5">
          <AccountResults results={results} name={name} collectionPeriod={date} compact />
        </div>
      </div>
    </section>
  );
}
export function AccountHistorySummary({ results }: { results: MedicalResult[] }) {
  const [generated, setGenerated] = useState(false);
  return (
    <section className="surface max-w-3xl p-5">
      <h2 className="font-display text-xl font-semibold">Resumo do histórico</h2>
      <p className="mt-1 text-sm text-muted-foreground">Síntese objetiva do último período</p>
      {!generated ? (
        <div className="mt-6 flex min-h-56 flex-col items-center justify-center text-center">
          <Sparkles className="mb-4 size-8 text-brand" />
          <p className="max-w-xs text-sm text-muted-foreground">
            Organize os principais marcadores e suas variações em uma visão consolidada.
          </p>
          <Button className="mt-5" disabled={!results.length} onClick={() => setGenerated(true)}>
            <Sparkles />
            Gerar resumo
          </Button>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          <p className="rounded-xl border-l-4 border-brand bg-brand-soft p-3 text-xs font-semibold text-brand-deep">
            Resumo dos valores registrados · sem interpretação automática
          </p>
          {resultSeries(results).map((s) => (
            <div key={s.name + s.unit} className="grid grid-cols-3 gap-2 border-t pt-3 text-xs">
              <strong>{s.name}</strong>
              <span>
                Anterior
                <br />
                {s.rows.filter((r) => r.collection_date < s.latest.collection_date).at(-1)?.value ??
                  "—"}
              </span>
              <span>
                Atual
                <br />
                <b>
                  {s.latest.value} {s.unit}
                </b>
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
