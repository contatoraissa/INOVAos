import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getMedicalPatient } from "@/lib/medical-workspace";
import { listMedicalReports } from "@/lib/medical-reports";
import { listConsultationEntries } from "@/lib/real-consultation";
import { PatientNavigation, tabs } from "./PatientNavigation";
import { AccountResults, AccountDocuments } from "./AccountClinicalPanels";
import { Button } from "@/components/ui/button";
import { EmptyState, StatusBadge } from "./Page";
import { AccountComparison } from "./AccountComparison";
import { AccountReportReview } from "./AccountReportReview";
import { GeneticRawPanel } from "./GeneticRawPanel";
import { AccountConsultationSummary } from "./AccountConsultationSummary";
import { AccountHistory, AccountHistorySummary } from "./AccountResultPanels";
import { DoctorExamOrders } from "./DoctorExamOrders";
import { DoctorGuidance } from "./DoctorGuidance";
import { AccountPreparationInbox } from "./AccountPreparationInbox";
import { AccountFamilyContext } from "./AccountFamilyContext";

export function AccountPatientDetail({ patientId, userId }: { patientId: string; userId: string }) {
  const patient = useQuery({
    queryKey: ["account-patient", userId, patientId],
    queryFn: () => getMedicalPatient({ data: { id: patientId } }),
    retry: false,
  });
  const reports = useQuery({
    queryKey: ["account-patient-reports", userId, patientId],
    queryFn: () => listMedicalReports({ data: { patientId } }),
    enabled: patient.isSuccess,
    retry: false,
  });
  const entries = useQuery({
    queryKey: ["real-consultation", patientId, userId],
    queryFn: () => listConsultationEntries({ data: { patientId } }),
    enabled: patient.isSuccess,
    retry: false,
  });
  const [tab, setTab] = useState<(typeof tabs)[number]>("Resumo da consulta");
  const [selectedReport, setSelectedReport] = useState("");
  useEffect(() => {
    const select = () => {
      let hash = "";
      try {
        hash = decodeURIComponent(window.location.hash.slice(1));
      } catch {
        return;
      }
      if (tabs.includes(hash as (typeof tabs)[number])) setTab(hash as (typeof tabs)[number]);
    };
    select();
    window.addEventListener("hashchange", select);
    return () => window.removeEventListener("hashchange", select);
  }, []);
  if (patient.isPending) return <p role="status">Carregando prontuário…</p>;
  if (!patient.data)
    return (
      <EmptyState
        title="Prontuário indisponível"
        text={patient.error?.message ?? "Este paciente não está vinculado à sua conta."}
      />
    );
  const profile = patient.data;
  const list = reports.data?.reports ?? [];
  const results = reports.data?.results ?? [];
  const birthday = new Date(profile.birth + "T12:00:00");
  const today = new Date();
  const age =
    today.getFullYear() -
    birthday.getFullYear() -
    (today.getMonth() < birthday.getMonth() ||
    (today.getMonth() === birthday.getMonth() && today.getDate() < birthday.getDate())
      ? 1
      : 0);
  const lastUpdate = [
    ...list.map((r) => r.created_at),
    ...(entries.data ?? []).map((e) => e.updated_at),
  ]
    .sort()
    .at(-1);
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" asChild>
          <Link to="/patients" search={{ workspace: "account" }}>
            Voltar para pacientes
          </Link>
        </Button>
        <Button variant="outline" onClick={() => window.print()}>
          Imprimir
        </Button>
      </div>
      <section className="rounded-xl border border-border bg-card p-3 shadow-[var(--shadow-float)]">
        <div className="flex flex-wrap items-center gap-4 border-b px-2 pb-4">
          <div className="flex size-14 items-center justify-center rounded-full bg-brand-soft text-lg font-semibold text-brand-deep">
            {profile.name
              .split(" ")
              .map((n) => n[0])
              .slice(0, 2)
              .join("")}
          </div>
          <div>
            <h1 className="font-display text-2xl font-semibold">{profile.name}</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              {profile.sex === "f"
                ? "Feminino"
                : profile.sex === "m"
                  ? "Masculino"
                  : "Sexo não informado"}{" "}
              · {Number.isFinite(age) && age >= 0 ? `${age} anos · ` : ""}CPF {profile.cpf}
            </p>
          </div>
          <StatusBadge fresh>Prontuário da sua conta</StatusBadge>
          {lastUpdate && (
            <span className="ml-auto rounded-full border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              Atualização: {new Date(lastUpdate).toLocaleDateString("pt-BR")}
            </span>
          )}
        </div>
        <PatientNavigation value={tab} onChange={setTab} />
      </section>
      {(reports.error || entries.error) && (
        <p role="alert" className="surface p-4 text-sm text-destructive">
          {reports.error?.message ?? entries.error?.message}
        </p>
      )}
      <div hidden={tab !== "Resumo da consulta"}>
        <AccountConsultationSummary
          patientId={patientId}
          patientName={profile.name}
          birth={profile.birth}
          reports={list}
          results={results}
          entries={entries.data ?? []}
          onNavigate={setTab}
          onRefresh={() => {
            void reports.refetch();
            void entries.refetch();
          }}
        />
      </div>
      {tab === "Resumo da consulta" && (
        <>
          <section className="surface p-5">
            <h2 className="font-semibold">Dados cadastrados</h2>
            <p className="mt-3 break-words text-sm">
              {profile.email || "E-mail não informado"} ·{" "}
              {profile.phone || "Telefone não informado"}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {profile.address || "Endereço não informado"}
            </p>
            <h3 className="mt-5 text-sm font-semibold">Observações do prontuário · uso médico</h3>
            <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
              {profile.notes || "Nenhuma observação registrada."}
            </p>
          </section>
        </>
      )}
      {tab === "Resultados" && <AccountResults results={results} name={profile.name} />}
      {tab === "Visão geral" && (
        <>
          <div>
            <p className="eyebrow">Histórico de saúde</p>
            <h2 className="mt-2 font-display text-2xl font-semibold">Histórico de saúde</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Acompanhe os valores mais recentes e sua evolução ao longo das coletas disponíveis.
            </p>
          </div>
          <AccountResults results={results} name={profile.name} birth={profile.birth} charts />
          <AccountHistorySummary results={results} />
        </>
      )}
      {tab === "Histórico" && <AccountHistory results={results} name={profile.name} />}
      {tab === "Comparação" && <AccountComparison results={results} />}
      {tab === "Envios do paciente" && (
        <AccountPreparationInbox
          patientId={patientId}
          userId={userId}
          onNavigate={(kind, id) => {
            setSelectedReport(id ?? "");
            setTab(kind);
          }}
        />
      )}
      {tab === "Solicitar exames" && <DoctorExamOrders patientId={patientId} account />}
      {tab === "Orientações ao paciente" && <DoctorGuidance patientId={patientId} account />}
      {tab === "Histórico familiar" && (
        <AccountFamilyContext
          patientId={patientId}
          entries={entries.data ?? []}
          onHistory={() => setTab("Histórico")}
        />
      )}
      {tab === "Genética" && <GeneticRawPanel account patientId={patientId} audience="doctor" />}
      {["Laudos laboratoriais", "Genética", "Genômica"].includes(tab) && (
        <AccountReportReview
          key={tab}
          patientId={patientId}
          patientName={profile.name}
          userId={userId}
          reports={list}
          initialReportId={selectedReport}
          kind={
            tab === "Laudos laboratoriais"
              ? "Laboratorial"
              : tab === "Genética"
                ? "Genética"
                : "Genômica"
          }
          refresh={reports.refetch}
        />
      )}
      {tab === "Documentos" && (
        <>
          <GeneticRawPanel
            account
            patientId={patientId}
            audience="doctor"
            compact
            onOpen={() => setTab("Genética")}
          />
          <AccountDocuments
            patientId={patientId}
            doctor
            reports={list}
            onNavigate={(kind, id) => {
              setSelectedReport(id);
              setTab(kind);
            }}
          />
        </>
      )}
    </div>
  );
}
