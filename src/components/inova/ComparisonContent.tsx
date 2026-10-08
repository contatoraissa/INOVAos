import { useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  ArrowRight,
  GitCompareArrows,
  Sparkles,
  FileText,
  UsersRound,
  Dna,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { familyHistoryById, patientHistoryById, type PatientHistoryRecord } from "@/data/demo";
import { EmptyState } from "./Page";

const markers = [
  { key: "glicemia", label: "Glicemia", unit: "mg/dL" },
  { key: "ldl", label: "Colesterol LDL", unit: "mg/dL" },
  { key: "hemoglobina", label: "Hemoglobina", unit: "g/dL" },
  { key: "vitaminaD", label: "Vitamina D", unit: "ng/mL" },
] as const;
type Collection = PatientHistoryRecord["history"][number];
const number = (value: number) => value.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
const signed = (value: number) => `${value > 0 ? "+" : ""}${number(value)}`;

export function ClinicalInsight({
  patient,
  previous,
  current,
}: {
  patient: PatientHistoryRecord;
  previous: Collection;
  current: Collection;
}) {
  const family = familyHistoryById[patient.id] ?? [];
  return (
    <section className="insight-panel" aria-label="Prévia de análise assistida">
      <div className="insight-header">
        <div className="flex items-center gap-3">
          <span className="insight-symbol">
            <Sparkles className="size-5" />
          </span>
          <div>
            <p className="eyebrow">INTELIGÊNCIA INOVA</p>
            <h2 className="mt-1 font-display text-lg font-semibold">
              Uma leitura conectada do histórico
            </h2>
          </div>
        </div>
        <span className="insight-label">Prévia demonstrativa · sem IA conectada</span>
      </div>
      <div className="insight-body">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">
              {patient.label} · {patient.age} anos · {previous.period} → {current.period}
            </p>
            <h3 className="mt-2 font-display text-xl font-semibold">
              Evolução laboratorial em contexto
            </h3>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-3 py-1.5 text-xs text-brand-deep">
            <CheckCircle2 className="size-3.5" />4 marcadores comparados
          </span>
        </div>
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <h4 className="insight-section-title">
              <FileText className="size-4" />
              Evidências disponíveis
            </h4>
            <div className="mt-3 divide-y divide-border">
              {markers.map((marker) => (
                <div
                  key={marker.key}
                  className="flex items-center justify-between gap-3 py-3 text-sm"
                >
                  <span className="text-muted-foreground">{marker.label}</span>
                  <span className="font-medium">
                    {number(previous[marker.key])}{" "}
                    <span className="mx-1 text-muted-foreground">→</span>{" "}
                    {number(current[marker.key])}{" "}
                    <span className="text-xs font-normal text-muted-foreground">{marker.unit}</span>
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              Fonte: histórico fictício do paciente, nas duas coletas selecionadas. Variação
              numérica não indica, por si só, melhora ou piora clínica.
            </p>
          </div>
          <div className="insight-review">
            <h4 className="insight-section-title">
              <Sparkles className="size-4" />
              Pontos para revisão médica
            </h4>
            <p className="mt-3 text-sm leading-relaxed">
              A glicemia apresentou{" "}
              {current.glicemia < previous.glicemia
                ? "redução"
                : current.glicemia > previous.glicemia
                  ? "aumento"
                  : "o mesmo valor"}{" "}
              entre os períodos: {number(previous.glicemia)} → {number(current.glicemia)} mg/dL. O
              LDL variou {signed(current.ldl - previous.ldl)} mg/dL.
            </p>
            <ul className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground">
              <li>
                Conferir condições de coleta, unidades e método antes de interpretar a evolução.
              </li>
              <li>
                Relacionar as alterações ao contexto clínico e aos registros do acompanhamento.
              </li>
              <li>
                {family.length
                  ? "Revisar os relatos familiares disponíveis junto ao histórico."
                  : "Complementar o contexto familiar, que não está registrado neste exemplo."}
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-6 grid gap-3 border-t border-border pt-5 sm:grid-cols-2">
          <div className="flex gap-3">
            <UsersRound className="mt-0.5 size-4 shrink-0 text-brand-deep" />
            <div>
              <p className="text-xs font-semibold">Histórico familiar</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {family.length
                  ? family.map((entry) => `${entry.relationship}: ${entry.condition}`).join(" · ")
                  : "Nenhum relato registrado."}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Dna className="mt-0.5 size-4 shrink-0 text-brand-deep" />
            <div>
              <p className="text-xs font-semibold">Informações genéticas</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Nenhum teste disponível. Predisposições genéticas não foram inferidas.
              </p>
            </div>
          </div>
        </div>
      </div>
      <footer className="insight-footer">
        Conteúdo ilustrativo calculado a partir dos mocks, não gerado por IA. Apoio à organização
        das informações, sem diagnóstico ou prescrição.
      </footer>
    </section>
  );
}

export function ComparisonContent({ patientId }: { patientId?: string }) {
  const [selectedPatient, setSelectedPatient] = useState("mariana-oliveira");
  const [previousIndex, setPreviousIndex] = useState(4);
  const [currentIndex, setCurrentIndex] = useState(5);
  const [generatedFor, setGeneratedFor] = useState("");
  const patient = patientHistoryById[patientId ?? selectedPatient];
  const previous = patient?.history[previousIndex];
  const current = patient?.history[currentIndex];
  if (!patient || !previous || !current)
    return (
      <EmptyState
        title="Sem coletas para comparar"
        text="Este paciente ainda não possui duas coletas disponíveis na demonstração."
      />
    );
  const signature = `${patient.id}:${previousIndex}:${currentIndex}`;
  const changes = markers.filter((marker) => previous[marker.key] !== current[marker.key]).length;
  return (
    <div className="space-y-6">
      <section className="comparison-intro">
        <span className="metric-icon">
          <GitCompareArrows className="size-5" />
        </span>
        <div>
          <h2 className="font-display text-base font-semibold">
            O que mudou entre uma coleta e outra?
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Escolha o paciente e dois períodos. Veja os valores lado a lado, a diferença em unidades
            e a variação percentual.
          </p>
        </div>
      </section>
      <section className="surface p-5">
        <div className="grid items-end gap-5 md:grid-cols-3">
          <div>
            <label className="label">Paciente</label>
            {patientId ? (
              <div className="flex h-10 items-center text-sm font-medium">{patient.label}</div>
            ) : (
              <Select
                value={selectedPatient}
                onValueChange={(value) => {
                  setSelectedPatient(value);
                  setPreviousIndex(4);
                  setCurrentIndex(5);
                }}
              >
                <SelectTrigger aria-label="Paciente para comparação">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(patientHistoryById).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div>
            <label className="label">Coleta anterior</label>
            <Select
              value={String(previousIndex)}
              onValueChange={(value) => setPreviousIndex(Number(value))}
            >
              <SelectTrigger aria-label="Coleta anterior">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {patient.history.map(
                  (collection, index) =>
                    index < currentIndex && (
                      <SelectItem key={collection.period} value={String(index)}>
                        {collection.period}
                      </SelectItem>
                    ),
                )}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="label">Coleta atual</label>
            <Select
              value={String(currentIndex)}
              onValueChange={(value) => setCurrentIndex(Number(value))}
            >
              <SelectTrigger aria-label="Coleta atual">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {patient.history.map(
                  (collection, index) =>
                    index > previousIndex && (
                      <SelectItem key={collection.period} value={String(index)}>
                        {collection.period}
                      </SelectItem>
                    ),
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Dados fictícios · Períodos disponíveis no histórico, sem data exata de coleta.
        </p>
      </section>
      <section className="surface overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
          <div>
            <h2 className="section-title">{patient.label}</h2>
            <p className="section-subtitle">
              {previous.period} <span className="mx-1">→</span> {current.period} · {changes}{" "}
              marcadores com mudança de valor
            </p>
          </div>
          <span className="insight-label">Comparação atualizada automaticamente</span>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Marcador / unidade</th>
                <th>{previous.period}</th>
                <th>{current.period}</th>
                <th>Diferença</th>
                <th>Variação %</th>
              </tr>
            </thead>
            <tbody>
              {markers.map((marker) => {
                const delta = current[marker.key] - previous[marker.key];
                const Icon = delta > 0 ? ArrowUpRight : delta < 0 ? ArrowDownRight : ArrowRight;
                return (
                  <tr key={marker.key}>
                    <td>
                      <p className="font-medium">{marker.label}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{marker.unit}</p>
                    </td>
                    <td className="text-muted-foreground">{number(previous[marker.key])}</td>
                    <td className="font-semibold">{number(current[marker.key])}</td>
                    <td>
                      <span className="inline-flex items-center gap-1 rounded-md bg-brand-soft px-2 py-1 text-xs font-medium text-brand-deep">
                        <Icon className="size-3.5" />
                        {signed(delta)}
                      </span>
                    </td>
                    <td>
                      {previous[marker.key] === 0
                        ? "—"
                        : `${signed((delta / previous[marker.key]) * 100)}%`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      <section className="flex flex-col justify-between gap-4 rounded-xl border border-brand/20 bg-brand-soft/50 p-5 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-1 size-5 shrink-0 text-brand-deep" />
          <div>
            <h3 className="font-display font-semibold">Conecte os resultados ao contexto</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Explore uma prévia da análise assistida que a INOVA poderá oferecer.
            </p>
          </div>
        </div>
        <Button onClick={() => setGeneratedFor(signature)} disabled={generatedFor === signature}>
          <Sparkles />
          {generatedFor === signature ? "Prévia exibida" : "Ver prévia da análise"}
        </Button>
      </section>
      {generatedFor === signature && (
        <div className="animate-page" aria-live="polite">
          <ClinicalInsight patient={patient} previous={previous} current={current} />
        </div>
      )}
    </div>
  );
}
