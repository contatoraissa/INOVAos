import { useState } from "react";
import {
  Activity,
  Droplets,
  FlaskConical,
  HeartPulse,
  ArrowDownRight,
  ArrowUpRight,
  Minus,
  CircleAlert,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PatientHistoryRecord } from "@/data/demo";
import { usePatientDirectory } from "./patient-directory";
import { patientAgeOnDate } from "@/lib/patient-age";
import { markerReference } from "@/lib/marker-reference";

import { PatientResultsAI } from "./PatientResultsAI";
const markers = [
  { key: "ldl", label: "Colesterol LDL", unit: "mg/dL", icon: FlaskConical, highlighted: true },
  { key: "glicemia", label: "Glicemia", unit: "mg/dL", icon: HeartPulse, highlighted: false },
  { key: "hemoglobina", label: "Hemoglobina", unit: "g/dL", icon: Activity, highlighted: false },
  { key: "vitaminaD", label: "Vitamina D", unit: "ng/mL", icon: Droplets, highlighted: false },
] as const;
const format = (value: number) => value.toLocaleString("pt-BR", { maximumFractionDigits: 2 });

export function MarkerEvolution({
  patient,
  audience = "doctor",
}: {
  patient: PatientHistoryRecord;
  audience?: "doctor" | "patient";
}) {
  const { patients } = usePatientDirectory();
  const profile = patients.find((item) => item.id === patient.id);
  const age = patientAgeOnDate(profile?.birth, patient.updatedAt);
  const [period, setPeriod] = useState("Todo histórico");
  const [onlyHighlighted, setOnlyHighlighted] = useState(false);
  const data =
    period === "6 meses"
      ? patient.history.slice(-3)
      : period === "1 ano"
        ? patient.history.slice(-4)
        : patient.history;
  const latest = patient.history.at(-1);
  const previous = patient.history.at(-2);
  if (!latest)
    return <p className="text-sm text-muted-foreground">Sem resultados para apresentar.</p>;
  return (
    <section className="space-y-5" aria-label="Evolução dos principais marcadores">
      {audience === "patient" && (
        <PatientResultsAI
          key={period}
          mode="history"
          periods={data.map((item) => item.period)}
          markers={markers.map((item) => item.key)}
        />
      )}
      <div
        className="rounded-xl border border-border bg-white p-5"
        aria-label="Perfil usado nas referências"
      >
        <p className="text-sm font-semibold">{profile?.name ?? patient.label}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          Nascimento: {profile?.birth ?? "Não informado"} ·{" "}
          {age === null
            ? "Idade não calculada"
            : `${age} anos na última coleta (${patient.updatedAt})`}{" "}
          · perfil fictício
        </p>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          A idade é calculada automaticamente pelo nascimento cadastrado. As referências abaixo são
          parâmetros publicados para consulta; o intervalo do laboratório e o contexto clínico devem
          ser confirmados no laudo.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="font-display text-lg font-semibold">
            {audience === "patient"
              ? "Seus resultados ao longo do tempo"
              : "Principais marcadores em perspectiva"}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {audience === "patient"
              ? "Veja como os valores mudaram entre suas coletas."
              : "Itens destacados primeiro, com valores e evolução no mesmo lugar."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {audience === "doctor" && (
            <Button
              variant={onlyHighlighted ? "default" : "outline"}
              size="sm"
              aria-pressed={onlyHighlighted}
              onClick={() => setOnlyHighlighted((value) => !value)}
            >
              <CircleAlert className="size-4" />
              {onlyHighlighted ? "Mostrar todos" : "Somente destacados"}
            </Button>
          )}
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40" aria-label="Período dos gráficos">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["6 meses", "1 ano", "2 anos", "Todo histórico"].map((value) => (
                <SelectItem key={value} value={value}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        {markers
          .filter((marker) => !onlyHighlighted || marker.highlighted)
          .map(({ key, label, unit, icon: Icon, highlighted: illustrativeHighlight }) => {
            const highlighted = audience === "doctor" && illustrativeHighlight;
            const delta = previous ? latest[key] - previous[key] : null;
            const Direction =
              delta === null || delta === 0 ? Minus : delta > 0 ? ArrowUpRight : ArrowDownRight;
            const color = highlighted ? "#bd821b" : "#09a3bc";
            const reference = markerReference(key, age, profile?.sex ?? patient.gender);
            return (
              <article key={key} className={`surface p-5 ${highlighted ? "border-amber-200" : ""}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex size-9 items-center justify-center rounded-xl ${highlighted ? "bg-amber-50 text-amber-700" : "bg-brand-soft text-brand-deep"}`}
                    >
                      <Icon className="size-4" />
                    </span>
                    <div>
                      <h4 className="text-sm font-semibold">{label}</h4>
                      <p className="mt-1 text-xs text-muted-foreground">Evolução · {unit}</p>
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${highlighted ? "bg-amber-50 text-amber-700" : "bg-muted text-muted-foreground"}`}
                  >
                    {highlighted ? "Revisão destacada · exemplo" : "Acompanhamento"}
                  </span>
                </div>
                <div className="mt-5 flex items-end justify-between gap-3">
                  <div>
                    <span className="font-display text-3xl font-semibold">
                      {format(latest[key])}
                    </span>
                    <span className="ml-2 text-sm text-muted-foreground">{unit}</span>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Último resultado · {latest.period}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className="inline-flex items-center gap-1 text-sm font-medium"
                      style={{ color }}
                    >
                      <Direction className="size-4" />
                      {delta === null ? "—" : `${delta > 0 ? "+" : ""}${format(delta)}`}
                    </span>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {previous ? `vs. ${previous.period}` : "Sem coleta anterior"}
                    </p>
                  </div>
                </div>
                <div
                  className="mt-4 rounded-xl bg-brand-soft/50 p-4"
                  aria-label={`Referência de ${label}`}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-deep">
                    Referência de consulta{age !== null ? ` · ${age} anos` : ""}
                  </p>
                  <p className="mt-2 text-sm font-semibold">{reference.value}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{reference.population}</p>
                  <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                    {reference.note}
                  </p>
                  {reference.sourceUrl && (
                    <a
                      href={reference.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-block text-[11px] font-medium text-brand-deep underline"
                    >
                      Fonte: {reference.sourceName}
                    </a>
                  )}
                </div>
                <div
                  className="mt-5 h-52"
                  role="img"
                  aria-label={`Evolução de ${label}: ${data.map((point) => `${point.period}: ${format(point[key])} ${unit}`).join("; ")}`}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={{ top: 12, right: 15, left: -12, bottom: 5 }}>
                      <CartesianGrid
                        stroke="var(--border)"
                        vertical={false}
                        strokeDasharray="3 5"
                      />
                      <XAxis
                        dataKey="period"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                        tickMargin={10}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                        domain={["auto", "auto"]}
                        width={48}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: 10,
                          border: "1px solid var(--border)",
                          fontSize: 12,
                        }}
                        labelFormatter={(value) => `Período: ${value}`}
                        formatter={(value) => [`${format(Number(value))} ${unit}`, label]}
                      />
                      <Line
                        type="linear"
                        dataKey={key}
                        stroke={color}
                        strokeWidth={2.5}
                        dot={{ r: 3, fill: color, strokeWidth: 0 }}
                        activeDot={{ r: 5 }}
                        animationDuration={300}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <p className="mt-3 border-t border-border pt-3 text-[11px] leading-relaxed text-muted-foreground">
                  {highlighted
                    ? "Destaque ilustrativo para revisão. Não representa um valor crítico calculado ou classificação de risco."
                    : "Valores do histórico fictício. A evolução numérica depende do contexto clínico para interpretação."}
                </p>
              </article>
            );
          })}
      </div>
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        As escalas verticais são próprias de cada marcador. O período filtra os gráficos; o valor
        atual e a variação mostram as duas últimas coletas disponíveis. As referências se referem à
        idade na última coleta; não são metas individuais, limites críticos nem os intervalos do
        laboratório que realizou seus exames.
      </p>
    </section>
  );
}
