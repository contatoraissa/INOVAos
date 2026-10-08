import { usePatientDirectory } from "./patient-directory";
import { Link } from "@tanstack/react-router";
import {
  Activity,
  ArrowDown,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Dna,
  Droplets,
  FileText,
  FlaskConical,
  HeartPulse,
  Info,
  Sparkles,
  Stethoscope,
  UsersRound,
} from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { examGroups, familyHistoryById, patientHistoryById } from "@/data/demo";
import { EmptyState, Page, StatusBadge } from "./Page";
import { cn } from "@/lib/utils";
import { ComparisonContent } from "./ComparisonContent";
import { MolecularReports } from "./MolecularReports";
import { MarkerEvolution } from "./MarkerEvolution";
import { PatientLabResults } from "./PatientLabResults";
import { ConsultationProvider } from "./ConsultationContext";
import { ConsultationSummary } from "./ConsultationSummary";
import { DocumentLibrary } from "./DocumentLibrary";
import { PatientPreparationInbox } from "./PatientPreparationInbox";
import { DoctorExamOrders } from "./DoctorExamOrders";
import { DoctorGuidance } from "./DoctorGuidance";
import { GeneticRawPanel } from "./GeneticRawPanel";
export { ComparisonContent } from "./ComparisonContent";

import { tabs, PatientNavigation } from "./PatientNavigation";

export function PatientDetailPage({ patientId }: { patientId: string }) {
  return (
    <ConsultationProvider key={patientId} patientId={patientId}>
      <PatientDetailContent patientId={patientId} />
    </ConsultationProvider>
  );
}

function PatientDetailContent({ patientId }: { patientId: string }) {
  const { patients } = usePatientDirectory();
  const patient = patients.find((p) => p.id === patientId);
  const history = patientHistoryById[patientId];
  const familyHistory = familyHistoryById[patientId] ?? [];
  const [tab, setTab] = useState<(typeof tabs)[number]>("Resumo da consulta");

  useEffect(() => {
    const select = () => {
      let value = "";
      try {
        value = decodeURIComponent(window.location.hash.slice(1));
      } catch {
        return;
      }
      if (tabs.includes(value as (typeof tabs)[number])) setTab(value as (typeof tabs)[number]);
    };
    select();
    window.addEventListener("hashchange", select);
    return () => window.removeEventListener("hashchange", select);
  }, []);
  const [summary, setSummary] = useState(false);
  const [collection, setCollection] = useState("");

  if (!patient)
    return (
      <Page title="Paciente não encontrado">
        <EmptyState
          title="Este paciente não está disponível"
          text="Volte à lista e selecione um paciente da demonstração."
        />
        <Button asChild variant="outline">
          <Link to="/patients">Voltar aos pacientes</Link>
        </Button>
      </Page>
    );
  if (!history)
    return (
      <Page title={patient.name} description="Cadastro demonstrativo">
        <Button asChild variant="outline">
          <Link to="/patients">
            <ArrowLeft />
            Voltar aos pacientes
          </Link>
        </Button>
        <PatientNavigation value={tab} onChange={setTab} hasHistory={false} />
        {tab === "Genética" || tab === "Genômica" || tab === "Laudos laboratoriais" ? (
          <>
            {tab === "Genética" && <GeneticRawPanel patientId={patient.id} audience="doctor" />}
            <MolecularReports
              key={`${patient.id}:${tab}`}
              kind={tab === "Laudos laboratoriais" ? "Laboratorial" : tab}
              patientId={patient.id}
              patientName={patient.name}
            />
          </>
        ) : tab === "Orientações ao paciente" ? (
          <DoctorGuidance patientId={patient.id} />
        ) : tab === "Solicitar exames" ? (
          <DoctorExamOrders patientId={patient.id} />
        ) : tab === "Envios do paciente" ? (
          <PatientPreparationInbox patientId={patient.id} onNavigate={setTab} />
        ) : tab === "Documentos" ? (
          <DocumentLibrary patientId={patient.id} onNavigate={setTab} />
        ) : tab === "Resumo da consulta" ? (
          <ConsultationSummary patient={patient} onNavigate={setTab} />
        ) : (
          <EmptyState
            title="Histórico ainda não disponível"
            text="Este cadastro não possui resultados detalhados na demonstração. Mariana Oliveira e Carlos Henrique Souza possuem gráficos de evolução."
          />
        )}
      </Page>
    );
  const visibleHistory = Array.from(
    new Set(history.history.map((item) => "20" + item.period.split("/")[1])),
  )
    .reverse()
    .map((year) => ({
      year,
      items: history.history
        .filter((item) => "20" + item.period.split("/")[1] === year)
        .map((item) => item.period)
        .reverse(),
    }));
  return (
    <Page
      title={patient.name}
      description={`${history.age} anos · CPF: ${patient.cpf} · Nascimento: ${patient.birth}`}
    >
      <div className="flex items-center justify-between gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/patients">
            <ArrowLeft className="size-4" />
            Voltar para pacientes
          </Link>
        </Button>

        <div className="flex items-center gap-2">
          <StatusBadge fresh>Dados fictícios</StatusBadge>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <FileText className="size-4" /> Imprimir
          </Button>
        </div>
      </div>

      <section className="rounded-xl border border-border bg-card p-3 shadow-[var(--shadow-float)]">
        <div className="flex flex-col gap-4 border-b border-border px-2 pb-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex size-14 items-center justify-center rounded-full bg-brand-soft font-display text-lg font-semibold text-brand-deep">
              {patient.name
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-2xl font-semibold text-foreground">
                  {history.label}
                </h2>
                <StatusBadge>Ativo</StatusBadge>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span>{history.gender}</span>
                <span>{history.age} anos</span>
                <span>CPF {patient.cpf}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            <Calendar className="size-3.5" />
            Atualização: {history.updatedAt}
          </div>
        </div>

        <PatientNavigation value={tab} onChange={setTab} />
      </section>

      {tab === "Resumo da consulta" && (
        <ConsultationSummary patient={patient} onNavigate={setTab} />
      )}
      {tab === "Envios do paciente" && (
        <PatientPreparationInbox patientId={patient.id} onNavigate={setTab} />
      )}
      {tab === "Solicitar exames" && <DoctorExamOrders patientId={patient.id} />}
      {tab === "Orientações ao paciente" && <DoctorGuidance patientId={patient.id} />}

      {tab === "Visão geral" && (
        <>
          <section className="space-y-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand">
                  Histórico de saúde
                </p>
                <h2 className="mt-2 font-display text-2xl font-semibold text-foreground">
                  Histórico de saúde
                </h2>
              </div>
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <FileText className="size-4" /> Imprimir
              </Button>
            </div>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Acompanhe os valores mais recentes e sua evolução ao longo das coletas disponíveis.
            </p>

            <MarkerEvolution key={patient.id} patient={history} />
          </section>

          <section className="max-w-3xl">
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <h2 className="font-display text-xl font-semibold text-foreground">
                Resumo do histórico
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Síntese objetiva do último período
              </p>

              {!summary ? (
                <div className="mt-6 flex min-h-56 flex-col items-center justify-center text-center">
                  <Sparkles className="mb-4 size-8 text-brand" />
                  <p className="max-w-xs text-sm text-muted-foreground">
                    Organize os principais marcadores e suas variações em uma visão consolidada.
                  </p>
                  <Button className="mt-5" onClick={() => setSummary(true)}>
                    <Sparkles className="size-4" />
                    Gerar resumo
                  </Button>
                </div>
              ) : (
                <div className="mt-5 animate-page space-y-4">
                  <div className="rounded-xl border-l-4 border-brand bg-brand-soft p-3">
                    <p className="text-xs font-semibold text-brand-deep">Resumo clínico</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Prévia demonstrativa dos valores mais recentes. Consulte o histórico para
                    analisar a evolução de cada marcador.
                  </p>
                  {[
                    { name: "Glicemia", key: "glicemia" },
                    { name: "LDL", key: "ldl" },
                    { name: "Hemoglobina", key: "hemoglobina" },
                  ].map((item) => (
                    <div
                      key={item.key}
                      className="grid grid-cols-4 items-center gap-2 border-t border-border pt-3 text-xs"
                    >
                      <strong className="col-span-1">{item.name}</strong>
                      <span className="col-span-1">
                        Anterior
                        <br />
                        <b>
                          {history.history.at(-2)?.[
                            item.key as "glicemia" | "ldl" | "hemoglobina"
                          ] ?? "—"}
                        </b>
                      </span>
                      <span className="col-span-1">
                        Atual
                        <br />
                        <b>
                          {history.history.at(-1)?.[
                            item.key as "glicemia" | "ldl" | "hemoglobina"
                          ] ?? "—"}
                        </b>
                      </span>
                      <span className="col-span-1 font-semibold text-brand-deep">
                        {(
                          (history.history.at(-1)?.[
                            item.key as "glicemia" | "ldl" | "hemoglobina"
                          ] ?? 0) -
                          (history.history.at(-2)?.[
                            item.key as "glicemia" | "ldl" | "hemoglobina"
                          ] ?? 0)
                        ).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </>
      )}

      {tab === "Resultados" && <ResultsContent patientId={patient.id} />}
      {tab === "Histórico" && (
        <section className="grid gap-5 lg:grid-cols-[320px_1fr]">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="font-display text-xl font-semibold text-foreground">
              Evolução dos exames
            </h2>
            <div className="mt-5 space-y-6">
              {visibleHistory.map((y) => (
                <div key={y.year}>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {y.year}
                  </p>
                  <div className="relative space-y-2 border-l border-border pl-4">
                    {y.items.map((i) => (
                      <button
                        key={i}
                        onClick={() => setCollection(i)}
                        className={cn(
                          "relative block w-full rounded-md px-3 py-2 text-left text-sm before:absolute before:-left-[21px] before:top-4 before:size-2 before:rounded-full before:bg-border",
                          (collection || history.history.at(-1)?.period) === i
                            ? "bg-brand-soft font-semibold text-brand-deep before:bg-brand"
                            : "hover:bg-muted before:bg-border",
                        )}
                      >
                        {i}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            {collection === "Histórico familiar informado" ? (
              <>
                <h2 className="font-display text-xl font-semibold text-foreground">
                  Contexto familiar
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Relatos informados no histórico do paciente; não são diagnósticos confirmados.
                </p>
                <div className="mt-5 space-y-3">
                  {familyHistory.map((entry) => (
                    <div
                      key={`${entry.relationship}-${entry.condition}`}
                      className="rounded-xl border border-border p-4"
                    >
                      <p className="text-sm font-semibold text-foreground">{entry.condition}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {entry.relationship} · {entry.details}
                      </p>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => setTab("Histórico familiar")}>
                    Ver histórico familiar
                  </Button>
                </div>
              </>
            ) : (
              <>
                <h2 className="font-display text-xl font-semibold text-foreground">
                  {collection || history.history.at(-1)?.period}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Resultados da coleta selecionada
                </p>
                <div className="mt-5">
                  <ResultsContent compact patientId={patient.id} collectionPeriod={collection} />
                </div>
              </>
            )}
          </div>
        </section>
      )}

      {tab === "Histórico familiar" && (
        <FamilyAndGeneticsContent
          familyHistory={familyHistory}
          glucose={history.summary.glicemia}
          onViewHistory={() => setTab("Histórico")}
        />
      )}

      {tab === "Genética" && <GeneticRawPanel patientId={patient.id} audience="doctor" />}
      {(tab === "Genética" || tab === "Genômica" || tab === "Laudos laboratoriais") && (
        <MolecularReports
          key={`${patient.id}:${tab}`}
          kind={tab === "Laudos laboratoriais" ? "Laboratorial" : tab}
          patientId={patient.id}
          patientName={patient.name}
        />
      )}

      {tab === "Comparação" && <ComparisonContent patientId={patient.id} />}
      {tab === "Documentos" && <DocumentLibrary patientId={patient.id} onNavigate={setTab} />}

      <p className="text-xs text-muted-foreground">
        Esta demonstração organiza dados laboratoriais e não realiza diagnósticos, prescrições ou
        substituição da avaliação médica.
      </p>
    </Page>
  );
}

function FamilyAndGeneticsContent({
  familyHistory,
  glucose,
  onViewHistory,
}: {
  familyHistory: (typeof familyHistoryById)[string];
  glucose: string;
  onViewHistory: () => void;
}) {
  return (
    <section className="space-y-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand">
          Contexto clínico
        </p>
        <h2 className="mt-2 font-display text-3xl font-semibold text-foreground">
          Histórico familiar
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Relatos familiares organizados junto ao histórico do paciente. Consulte os laudos nas abas
          Genética e Genômica.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <article className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <UsersRound className="size-5 text-brand" />
            <h3 className="font-display text-xl font-semibold text-foreground">
              Histórico familiar
            </h3>
          </div>
          {familyHistory.length > 0 ? (
            <div className="mt-4 space-y-3">
              {familyHistory.map((entry) => (
                <div
                  key={`${entry.relationship}-${entry.condition}`}
                  className="rounded-xl border border-border p-4"
                >
                  <p className="text-sm font-semibold text-foreground">{entry.condition}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {entry.relationship} · {entry.details}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 rounded-xl bg-muted/50 p-4 text-sm text-muted-foreground">
              Nenhum relato familiar cadastrado. A ausência de registros não significa ausência de
              histórico familiar.
            </p>
          )}
        </article>

        <article className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Dna className="size-5 text-brand" />
            <h3 className="font-display text-xl font-semibold text-foreground">Dados genéticos</h3>
          </div>
          <div className="mt-4 rounded-xl bg-muted/50 p-4">
            <p className="text-sm font-medium text-foreground">Nenhum teste genético cadastrado</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Não há variantes ou resultados genéticos disponíveis para interpretação nesta
              demonstração.
            </p>
          </div>
        </article>
      </div>

      <article className="rounded-xl border border-brand/20 bg-brand-soft/50 p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 text-brand-deep" />
            <h3 className="font-display text-xl font-semibold text-foreground">
              Análise contextual
            </h3>
          </div>
          <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-brand-deep">
            Prévia demonstrativa · sem IA conectada
          </span>
        </div>
        {familyHistory.length > 0 ? (
          <p className="mt-4 max-w-3xl text-sm leading-6 text-foreground">
            O relato familiar de diabetes tipo 2 pode ser considerado junto à glicemia mais recente
            ({glucose}). Esse resultado isolado não permite prever doença nem calcular risco futuro;
            a avaliação depende do contexto clínico e de um profissional de saúde.
          </p>
        ) : (
          <p className="mt-4 max-w-3xl text-sm leading-6 text-foreground">
            Não há informações familiares suficientes para gerar uma prévia contextual. Registros
            familiares ou exames genéticos devem ser avaliados por um profissional de saúde.
          </p>
        )}
        <div className="mt-4 flex flex-col gap-3 border-t border-brand/15 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
            <Info className="mt-0.5 size-4 shrink-0" />
            Conteúdo ilustrativo, não gerado por modelo de IA. Não é diagnóstico nem substitui
            avaliação médica.
          </p>
          <Button variant="outline" size="sm" onClick={onViewHistory}>
            <HeartPulse className="size-4" />
            Ver histórico relacionado
          </Button>
        </div>
      </article>
    </section>
  );
}

export function ResultsContent({
  compact = false,
  patientId = "mariana-oliveira",
  collectionPeriod,
}: {
  compact?: boolean;
  patientId?: string;
  collectionPeriod?: string | undefined;
}) {
  return (
    <PatientLabResults
      patientId={patientId}
      compact={compact}
      collectionPeriod={collectionPeriod}
    />
  );
}
