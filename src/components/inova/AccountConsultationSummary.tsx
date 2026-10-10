import { useState } from "react";
import { ClipboardList, FileText, CheckCircle2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { MedicalReport, MedicalResult } from "@/lib/medical-reports";
import type { ConsultationEntry } from "@/lib/real-consultation-contract";
import { AccountComparison } from "./AccountComparison";
import { GeneticRawPanel } from "./GeneticRawPanel";
import { DoctorPlannedReturns } from "./PlannedReturns";
import { AccountResults } from "./AccountResultPanels";
import type { tabs } from "./PatientNavigation";

export function AccountConsultationSummary({
  patientId,
  patientName,
  birth,
  reports,
  results,
  entries,
  onNavigate,
  onRefresh,
}: {
  patientId: string;
  patientName: string;
  birth?: string;
  reports: MedicalReport[];
  results: MedicalResult[];
  entries: ConsultationEntry[];
  onNavigate: (tab: (typeof tabs)[number]) => void;
  onRefresh?: () => void;
}) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState("");
  const [plan, setPlan] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [snapshot, setSnapshot] = useState<{ text: string; signature: string } | null>(null);
  const pendingReports = reports.filter((r) => !r.reviewed_at);
  const pendingSubmissions = entries.filter(
    (e) => e.kind === "preparation" && e.status === "published",
  );
  const guidance = entries.filter((e) => e.kind === "guidance" && e.status === "published");
  const family = entries.filter((e) => e.kind === "family" && e.status !== "cancelled");
  const tasks = [
    {
      id: "results",
      label: "Revisar a evolução dos resultados",
      detail: "Conferir os marcadores e o contexto das coletas.",
      tab: "Histórico" as const,
    },
    {
      id: "family",
      label: "Conferir o histórico familiar",
      detail: `${family.length} registros disponíveis para revisão.`,
      tab: "Histórico familiar" as const,
    },
    {
      id: "sources",
      label: "Conferir fontes e limitações dos laudos",
      detail: "Revisar os documentos antes de utilizar as sínteses.",
      tab: "Laudos laboratoriais" as const,
    },
  ];
  const signature = JSON.stringify({
    checked,
    notes,
    plan,
    reports: reports.map((r) => [r.id, r.reviewed_at]),
    entries: entries.map((e) => [e.id, e.status, e.updated_at]),
  });
  return (
    <div className="space-y-6">
      <section className="consultation-hero">
        <div>
          <p className="eyebrow">PREPARAÇÃO DA CONSULTA</p>
          <h2 className="mt-3 font-display text-2xl font-semibold">O essencial para começar.</h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Mudanças nos exames, contexto e documentos reunidos para a revisão de {patientName}.
          </p>
          <p className="mt-4 text-xs text-muted-foreground">
            Dados do prontuário · sínteses de IA exigem revisão · checklist e anotações mantidos
            enquanto este prontuário estiver aberto.
          </p>
        </div>
        <Button variant="outline" onClick={() => window.print()}>
          <Printer />
          Imprimir resumo
        </Button>
      </section>
      <GeneticRawPanel
        account
        patientId={patientId}
        audience="doctor"
        compact
        onOpen={() => onNavigate("Genética")}
      />
      <section className="grid gap-4 sm:grid-cols-3">
        {[
          {
            label: "Coletas no histórico",
            value: new Set(results.map((r) => r.collection_date)).size,
            icon: ClipboardList,
          },
          { label: "Laudos a revisar", value: pendingReports.length, icon: FileText },
          {
            label: "Preparação concluída",
            value: `${Object.values(checked).filter(Boolean).length}/${tasks.length}`,
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
          <h3 className="section-title">O que mudou nos exames?</h3>
          <p className="section-subtitle">Compare as coletas registradas deste paciente.</p>
          <div className="mt-4">
            <AccountComparison results={results} />
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="mt-3"
            onClick={() => onNavigate("Comparação")}
          >
            Abrir comparação completa →
          </Button>
        </section>
        <aside className="surface p-5">
          <h3 className="section-title">Checklist da consulta</h3>
          <p className="section-subtitle">Organize o que já foi revisado.</p>
          <div className="mt-4 space-y-4">
            {tasks.map((task) => (
              <div className="flex gap-3" key={task.id}>
                <input
                  type="checkbox"
                  aria-label={task.label}
                  className="mt-1 size-4 accent-[#087f9a]"
                  checked={!!checked[task.id]}
                  onChange={(e) => {
                    setChecked((c) => ({ ...c, [task.id]: e.target.checked }));
                    setConfirmed(false);
                  }}
                />
                <div>
                  <p className="text-sm font-medium">{task.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{task.detail}</p>
                  <button
                    onClick={() => onNavigate(task.tab)}
                    className="mt-2 text-xs font-medium text-brand-deep hover:underline"
                  >
                    Consultar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
      <section className="surface p-5">
        <h3 className="section-title">Laudos · documentos para revisão</h3>
        {!reports.length ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Nenhum laudo integrado a este prontuário.
          </p>
        ) : (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {reports.map((report) => (
              <article key={report.id} className="rounded-xl border p-4">
                <div className="flex justify-between gap-3">
                  <span className="eyebrow">{report.kind}</span>
                  <span className="text-xs text-muted-foreground">
                    {report.reviewed_at ? "Revisado pelo médico" : "Pendente de revisão"}
                  </span>
                </div>
                <h4 className="mt-3 font-semibold">{report.filename}</h4>
                <p className="mt-2 text-sm text-muted-foreground">
                  {report.summary?.scope ?? "Abra o original para conferir o conteúdo."}
                </p>
                <Button
                  className="mt-4"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    onNavigate(
                      report.kind === "Laboratorial" ? "Laudos laboratoriais" : report.kind,
                    )
                  }
                >
                  Abrir laudo
                </Button>
              </article>
            ))}
          </div>
        )}
      </section>
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="surface p-5">
          <h3 className="section-title">Contexto familiar</h3>
          <p className="mt-3 text-sm text-muted-foreground">
            {family.length
              ? `${family.length} registros no prontuário.`
              : "Nenhum relato familiar registrado."}
          </p>
          {family.map((item) => (
            <div key={item.id} className="mt-3">
              <p className="text-sm font-medium">{item.payload.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{item.payload.text}</p>
            </div>
          ))}
          <Button className="mt-4" variant="ghost" onClick={() => onNavigate("Histórico familiar")}>
            Consultar contexto
          </Button>
        </section>
        <section className="surface p-5">
          <label htmlFor="account-consultation-notes" className="section-title">
            Anotações para a consulta
          </label>
          <p className="section-subtitle">
            Perguntas e informações que você deseja conferir nesta sessão.
          </p>
          <Textarea
            id="account-consultation-notes"
            className="mt-4"
            value={notes}
            maxLength={3000}
            onChange={(e) => {
              setNotes(e.target.value);
              setConfirmed(false);
            }}
          />
        </section>
      </div>
      <section className="surface p-6" aria-label="Fechamento da consulta">
        <DoctorPlannedReturns patientId={patientId} account />
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-xl font-semibold">Conferir e fechar a consulta</h3>
          <Button
            variant="outline"
            onClick={() => {
              setConfirmed(false);
              onRefresh?.();
            }}
          >
            Atualizar conferência
          </Button>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          O registro deste resumo permanece nesta sessão. Publique orientações, pedidos e retornos
          nas seções próprias para compartilhar com o paciente.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            {
              label: "Laudos revisados",
              value: `${reports.length - pendingReports.length}/${reports.length}`,
            },
            { label: "Envios aguardando revisão", value: pendingSubmissions.length },
            { label: "Orientações publicadas", value: guidance.length },
          ].map((item) => (
            <div className="rounded-xl bg-muted/40 p-4" key={item.label}>
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="mt-2 text-xl font-semibold">{item.value}</p>
            </div>
          ))}
        </div>
        <label className="mt-4 block text-sm font-semibold" htmlFor="account-closing-plan">
          Próximos passos e pendências
        </label>
        <Textarea
          id="account-closing-plan"
          className="mt-2"
          value={plan}
          maxLength={3000}
          onChange={(e) => {
            setPlan(e.target.value);
            setConfirmed(false);
          }}
        />
        <label className="mt-4 flex gap-2 text-xs">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
          />
          Conferi este resumo e estou ciente das pendências.
        </label>
        <Button
          className="mt-4"
          disabled={!confirmed}
          onClick={() => {
            setSnapshot({
              signature,
              text: `INOVA · resumo da consulta\nPaciente: ${patientName}\n${new Date().toLocaleString("pt-BR")}\nLaudos revisados: ${reports.length - pendingReports.length}/${reports.length}\nEnvios pendentes: ${pendingSubmissions.length}\nOrientações publicadas: ${guidance.length}\n\nAnotações:\n${notes || "Não informadas"}\n\nPróximos passos:\n${plan || "Não informados"}\n\nRegistro nesta sessão, sem assinatura e sem envio automático.`,
            });
            setConfirmed(false);
          }}
        >
          Registrar fechamento nesta sessão
        </Button>
        {snapshot && (
          <div className="mt-4 rounded-xl border p-4">
            {snapshot.signature !== signature && (
              <p className="mb-3 text-sm text-amber-800">
                O prontuário ou as anotações mudaram. Confira e registre um novo resumo.
              </p>
            )}
            <pre className="whitespace-pre-wrap break-words text-xs">{snapshot.text}</pre>
            <Button
              variant="outline"
              className="mt-4 mr-3"
              onClick={() => {
                const url = URL.createObjectURL(
                  new Blob([snapshot.text], { type: "text/plain;charset=utf-8" }),
                );
                const link = document.createElement("a");
                link.href = url;
                link.download = "INOVA-fechamento-consulta.txt";
                link.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
              }}
            >
              Baixar registro de fechamento
            </Button>
            <Button variant="outline" className="mt-4" onClick={() => window.print()}>
              Imprimir registro
            </Button>
          </div>
        )}
      </section>
      <AccountResults results={results} name={patientName} {...(birth ? { birth } : {})} charts />
    </div>
  );
}
