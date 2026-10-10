import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { getMedicalPatient } from "@/lib/medical-workspace";
import { listMedicalReports, uploadMedicalReport } from "@/lib/medical-reports";
import { listConsultationEntries } from "@/lib/real-consultation";
import { MAX_PDF_BYTES } from "@/lib/ai-contract";
import { PatientNavigation, tabs } from "./PatientNavigation";
import { AccountResults, AccountDocuments } from "./AccountClinicalPanels";
import { RealConsultation } from "./RealConsultation";
import { Button } from "@/components/ui/button";
import { EmptyState, StatusBadge } from "./Page";

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
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  async function upload(file: File) {
    setError("");
    setUploading(true);
    try {
      if (
        file.size > MAX_PDF_BYTES ||
        new TextDecoder().decode(await file.slice(0, 5).arrayBuffer()) !== "%PDF-"
      )
        throw new Error("Escolha um PDF válido de até 8 MB.");
      const pdf = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1]!);
        reader.onerror = () => reject(new Error("Não foi possível ler o PDF."));
        reader.readAsDataURL(file);
      });
      await uploadMedicalReport({
        data: { patientId, filename: file.name, kind: "Laboratorial", pdf },
      });
      await reports.refetch();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível adicionar o laudo.");
    } finally {
      setUploading(false);
    }
  }
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
              CPF {profile.cpf} · Nascimento: {profile.birth.split("-").reverse().join("/")}
            </p>
          </div>
          <StatusBadge fresh>Prontuário da sua conta</StatusBadge>
        </div>
        <PatientNavigation value={tab} onChange={setTab} />
      </section>
      {(reports.error || entries.error) && (
        <p role="alert" className="surface p-4 text-sm text-destructive">
          {reports.error?.message ?? entries.error?.message}
        </p>
      )}
      {tab === "Resumo da consulta" && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: "Resultados registrados", count: results.length },
              { label: "Laudos no prontuário", count: list.length },
              {
                label: "Envios do paciente",
                count: entries.data?.filter((entry) => entry.kind === "preparation").length ?? 0,
              },
            ].map((item) => (
              <section key={item.label} className="surface p-5">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="mt-3 text-3xl font-semibold">{item.count}</p>
              </section>
            ))}
          </div>
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
          <AccountResults results={results} />
        </>
      )}
      {["Resultados", "Visão geral"].includes(tab) && <AccountResults results={results} />}
      {["Histórico", "Comparação"].includes(tab) && <AccountResults results={results} charts />}
      {tab === "Envios do paciente" && (
        <RealConsultation patientId={patientId} kind="preparation" />
      )}
      {tab === "Solicitar exames" && <RealConsultation patientId={patientId} kind="order" />}
      {tab === "Orientações ao paciente" && (
        <RealConsultation patientId={patientId} kind="guidance" />
      )}
      {tab === "Histórico familiar" && <RealConsultation patientId={patientId} kind="family" />}
      {["Laudos laboratoriais", "Documentos", "Genética", "Genômica"].includes(tab) && (
        <>
          {tab === "Laudos laboratoriais" && (
            <section className="surface p-5">
              <h2 className="font-semibold">Adicionar laudo ao prontuário</h2>
              <p className="mt-2 text-xs text-muted-foreground">
                O PDF fica associado a este paciente. A liberação para o portal depende da revisão
                médica.
              </p>
              <input
                type="file"
                accept="application/pdf,.pdf"
                disabled={uploading}
                aria-label="Adicionar PDF ao prontuário"
                className="mt-4 max-w-full text-sm"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void upload(file);
                  event.target.value = "";
                }}
              />
              {uploading && <p role="status">Salvando PDF…</p>}
              {error && (
                <p role="alert" className="mt-3 text-sm text-destructive">
                  {error}
                </p>
              )}
            </section>
          )}
          <AccountDocuments
            patientId={patientId}
            doctor
            reports={list.filter(
              (report) =>
                tab === "Documentos" ||
                (tab === "Laudos laboratoriais"
                  ? report.kind === "Laboratorial"
                  : report.kind === tab),
            )}
          />
        </>
      )}
    </div>
  );
}
