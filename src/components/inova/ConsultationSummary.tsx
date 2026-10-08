import {
  ClipboardList,
  ArrowRight,
  Printer,
  FileText,
  CheckCircle2,
  CircleAlert,
  Dna,
  UsersRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { familyHistoryById, patientHistoryById, type Patient } from "@/data/demo";
import type { ReportKind } from "@/data/molecular-reports";
import { useConsultation } from "./consultation-state";
import { MarkerEvolution } from "./MarkerEvolution";
import { EmptyState } from "./Page";
import { GeneticRawPanel } from "./GeneticRawPanel";
import { ConsultationClosing } from "./ConsultationClosing";

type Destination =
  | "Laudos laboratoriais"
  | "Comparação"
  | "Genética"
  | "Genômica"
  | "Histórico familiar"
  | "Histórico";
const markers = [
  { key: "ldl", name: "LDL", unit: "mg/dL" },
  { key: "glicemia", name: "Glicemia", unit: "mg/dL" },
  { key: "hemoglobina", name: "Hemoglobina", unit: "g/dL" },
  { key: "vitaminaD", name: "Vitamina D", unit: "ng/mL" },
] as const;
const format = (value: number) => value.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
export function ConsultationSummary({
  patient,
  onNavigate,
}: {
  patient: Patient;
  onNavigate: (tab: Destination) => void;
}) {
  const {
    reportsByKind,
    reviewed,
    identityVerified,
    setReviewed,
    notes,
    setNotes,
    completed,
    setCompleted,
    baseline,
    setBaseline,
    setSelectedReports,
  } = useConsultation();
  const history = patientHistoryById[patient.id];
  const latest = history?.history.at(-1);
  const previous =
    history?.history.find((item) => item.period === baseline) ?? history?.history.at(-2);
  const family = familyHistoryById[patient.id] ?? [];
  const reports = (["Genética", "Genômica", "Laboratorial"] as const).flatMap((kind) =>
    reportsByKind[kind].map((report) => ({ ...report, kind })),
  );
  const pending = reports.filter((report) => !reviewed[report.id]);
  const tasks = [
    {
      id: "results",
      label: "Revisar a evolução dos resultados",
      detail: history
        ? "Conferir os marcadores e o contexto das coletas."
        : "Solicitar ou integrar os resultados ainda indisponíveis.",
      destination: "Histórico" as Destination,
    },
    {
      id: "family",
      label: "Conferir o histórico familiar",
      detail: family.length
        ? `${family.length} relatos disponíveis para revisão.`
        : "Sem relatos registrados; completar se pertinente.",
      destination: "Histórico familiar" as Destination,
    },
    {
      id: "sources",
      label: "Conferir fontes e limitações dos laudos",
      detail: "Revisar os documentos disponíveis antes de utilizar as sínteses.",
      destination: "Genética" as Destination,
    },
  ];
  const completedCount = tasks.filter((task) => completed[task.id]).length;
  return (
    <div className="space-y-6">
      <section className="consultation-hero">
        <div>
          <p className="eyebrow">PREPARAÇÃO DA CONSULTA</p>
          <h2 className="mt-3 font-display text-2xl font-semibold">O essencial para começar.</h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Mudanças nos exames, contexto e documentos reunidos para a revisão de {patient.name}.
          </p>
          <p className="mt-4 text-xs text-muted-foreground">
            Dados fictícios · sínteses de IA exigem revisão · alterações mantidas enquanto este
            paciente estiver aberto
          </p>
        </div>
        <Button variant="outline" onClick={() => window.print()}>
          <Printer />
          Imprimir resumo
        </Button>
      </section>
      <GeneticRawPanel
        patientId={patient.id}
        audience="doctor"
        compact
        onOpen={() => onNavigate("Genética")}
      />
      <section className="grid gap-4 sm:grid-cols-3">
        {[
          {
            label: "Coletas no histórico",
            value: history?.history.length ?? 0,
            icon: ClipboardList,
          },
          { label: "Laudos a revisar", value: pending.length, icon: FileText },
          {
            label: "Preparação concluída",
            value: `${completedCount}/${tasks.length}`,
            icon: CheckCircle2,
          },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="metric-card">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">{label}</p>
              <Icon className="size-4 text-brand-deep" />
            </div>
            <p className="mt-3 font-display text-2xl font-semibold">{value}</p>
          </div>
        ))}
      </section>
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="surface p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="section-title">O que mudou nos exames?</h3>
              <p className="section-subtitle">
                Última coleta disponível vs. período de referência.
              </p>
            </div>
            {history && (
              <Select value={previous?.period ?? ""} onValueChange={setBaseline}>
                <SelectTrigger className="w-40" aria-label="Período de referência">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {history.history.slice(0, -1).map((item) => (
                    <SelectItem key={item.period} value={item.period}>
                      {item.period}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          {latest && previous ? (
            <>
              <div className="mt-5 rounded-xl bg-brand-soft p-4 text-sm leading-relaxed">
                Entre <strong>{previous.period}</strong> e <strong>{latest.period}</strong>, a
                glicemia passou de <strong>{format(previous.glicemia)}</strong> para{" "}
                <strong>{format(latest.glicemia)} mg/dL</strong> e o LDL de{" "}
                <strong>{format(previous.ldl)}</strong> para{" "}
                <strong>{format(latest.ldl)} mg/dL</strong>. A síntese descreve valores; não
                classifica melhora, piora ou risco.
              </div>
              <div className="mt-4 divide-y divide-border">
                {markers.map((marker) => {
                  const delta = latest[marker.key] - previous[marker.key];
                  return (
                    <div
                      className="flex flex-wrap items-center justify-between gap-3 py-3"
                      key={marker.key}
                    >
                      <div>
                        <p className="text-sm font-medium">{marker.name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {format(previous[marker.key])} → {format(latest[marker.key])}{" "}
                          {marker.unit}
                        </p>
                      </div>
                      <span className="rounded-md bg-muted px-2 py-1 text-xs font-semibold text-brand-deep">
                        {delta > 0 ? "+" : ""}
                        {format(delta)} {marker.unit}
                      </span>
                    </div>
                  );
                })}
              </div>
              <p className="mt-3 text-[11px] text-muted-foreground">
                Fonte: histórico laboratorial fictício · {previous.period} e {latest.period}.
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-3"
                onClick={() => onNavigate("Comparação")}
              >
                Abrir comparação completa
                <ArrowRight />
              </Button>
            </>
          ) : (
            <EmptyState
              title="Resultados ainda indisponíveis"
              text="Não há duas coletas deste paciente para gerar uma comparação."
            />
          )}
        </section>
        <aside className="surface p-5">
          <h3 className="section-title">Checklist da consulta</h3>
          <p className="section-subtitle">Organize o que já foi revisado.</p>
          <div className="mt-4 space-y-4">
            {tasks.map((task) => (
              <div className="flex gap-3" key={task.id}>
                <input
                  id={`task-${patient.id}-${task.id}`}
                  type="checkbox"
                  checked={!!completed[task.id]}
                  onChange={(event) =>
                    setCompleted((items) => ({ ...items, [task.id]: event.target.checked }))
                  }
                  className="mt-1 size-4 accent-[#087f9a]"
                />
                <div>
                  <label
                    htmlFor={`task-${patient.id}-${task.id}`}
                    className="cursor-pointer text-sm font-medium"
                  >
                    {task.label}
                  </label>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {task.detail}
                  </p>
                  {(history || task.destination === "Genética") && (
                    <button
                      onClick={() => onNavigate(task.destination)}
                      className="mt-2 text-xs font-medium text-brand-deep hover:underline"
                    >
                      Consultar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
      <section className="surface p-5">
        <div className="flex items-start gap-3">
          <Dna className="mt-1 size-5 text-brand-deep" />
          <div>
            <h3 className="section-title">Laudos · documentos para revisão</h3>
            <p className="section-subtitle">
              Abra a aba correspondente para consultar achados, limitações e trechos de origem.
            </p>
          </div>
        </div>
        {reports.length ? (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {reports.map((report) => (
              <article key={report.id} className="rounded-xl border border-border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="eyebrow">{report.kind}</span>
                  <span
                    className={`rounded-full px-2 py-1 text-[10px] ${reviewed[report.id] ? "bg-brand-soft text-brand-deep" : "bg-amber-50 text-amber-700"}`}
                  >
                    {reviewed[report.id]
                      ? "Revisado nesta sessão"
                      : report.demo || report.analysis
                        ? "Pendente de revisão"
                        : "Aguardando análise"}
                  </span>
                </div>
                <h4 className="mt-3 text-sm font-semibold">{report.title}</h4>
                <p className="mt-1 text-xs text-muted-foreground">
                  {report.date}
                  {report.pages ? ` · ${report.pages} páginas` : ""}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {report.demo || report.analysis
                    ? report.scope
                    : "Arquivo local listado; conteúdo não analisado."}
                </p>
                {(report.demo || report.analysis) && report.limitations[0] && (
                  <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                    Ponto de revisão: {report.limitations[0]?.title} · p.{" "}
                    {report.limitations[0]?.page ?? "não identificada"}{" "}
                    {report.demo ? "(ilustrativa)" : "(conferir no original)"}.
                  </p>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedReports((items) => ({ ...items, [report.kind]: report.id }));
                      onNavigate(
                        report.kind === "Laboratorial" ? "Laudos laboratoriais" : report.kind,
                      );
                    }}
                  >
                    Consultar laudo
                    <ArrowRight />
                  </Button>
                  {(report.demo || report.analysis) && (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={!!report.analysis && !identityVerified[report.id]}
                      onClick={() =>
                        setReviewed((items) => ({ ...items, [report.id]: !items[report.id] }))
                      }
                    >
                      {reviewed[report.id] ? "Reabrir revisão" : "Marcar revisado"}
                    </Button>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-4 rounded-lg bg-muted p-4 text-sm text-muted-foreground">
            Nenhum laudo disponível. A ausência de documentos não equivale a resultado negativo.
          </p>
        )}
      </section>
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="surface p-5">
          <h3 className="insight-section-title">
            <UsersRound className="size-4" />
            Contexto familiar
          </h3>
          {family.length ? (
            <div className="mt-4 space-y-3">
              {family.map((entry) => (
                <div key={entry.relationship + entry.condition}>
                  <p className="text-sm font-medium">
                    {entry.relationship} · {entry.condition}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{entry.details}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              Não há relatos familiares registrados.
            </p>
          )}
          {history && (
            <Button
              className="mt-4"
              size="sm"
              variant="ghost"
              onClick={() => onNavigate("Histórico familiar")}
            >
              Consultar contexto
              <ArrowRight />
            </Button>
          )}
        </section>
        <section className="surface p-5">
          <label htmlFor={`consultation-notes-${patient.id}`} className="section-title">
            Anotações para a consulta
          </label>
          <p className="section-subtitle">Perguntas e informações que você deseja conferir.</p>
          <Textarea
            id={`consultation-notes-${patient.id}`}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            maxLength={3000}
            placeholder="Registre os pontos que deseja revisar com o paciente..."
            className="mt-4 min-h-32"
          />
          <p className="mt-2 text-[11px] text-muted-foreground">
            Rascunho temporário · {notes.length}/3000 caracteres · sem salvamento no prontuário
          </p>
        </section>
      </div>
      <ConsultationClosing patientId={patient.id} patientName={patient.name} />
      {history && <MarkerEvolution patient={history} />}
      <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
        <CircleAlert className="mt-0.5 size-4 shrink-0" />
        Este resumo organiza dados demonstrativos. Não há registro de última consulta, cálculo de
        valores críticos. Sínteses de PDFs são separadas do histórico fictício e precisam de
        revisão. Consulte os documentos e o contexto clínico antes da avaliação.
      </p>
    </div>
  );
}
