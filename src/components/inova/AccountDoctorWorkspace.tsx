import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { Check } from "lucide-react";
import { getAccountSession } from "@/lib/account-session";
import { listPatientRegistrations } from "@/lib/patient-identity";
import { createMedicalPatient } from "@/lib/medical-workspace";
import { listMedicalExamOverview } from "@/lib/medical-reports";
import { patientRegistration } from "@/lib/medical-patient-contract";
import { DemoAppShell } from "./AppShell";
import { PatientDirectoryContext } from "./patient-directory";
import { PatientRegistrationFields } from "./PatientRegistrationFields";
import { AccountPatientDetail } from "./AccountPatientDetail";
import { DashboardPage } from "./DashboardPage";
import { PatientsPage } from "./PatientsPage";
import { NewResultsPage } from "./NewResultsPage";
import { HistoryPage, FollowUpPage } from "./SecondaryPages";
import { DoctorProfilePage } from "./DoctorProfilePage";
import { DoctorSettingsPage } from "./DoctorSettingsPage";
import { DoctorReportsPage } from "./DoctorReportsPage";
import { AnnualAgenda } from "./AnnualAgenda";
import { AccountPortfolioComparison } from "./AccountComparison";
import { Button } from "@/components/ui/button";
import { EmptyState, Page } from "./Page";

export function AccountDoctorWorkspace() {
  const account = useQuery({
    queryKey: ["workspace-account"],
    queryFn: () => getAccountSession(),
    retry: false,
  });
  const directory = useQuery({
    queryKey: ["account-patients", account.data?.userId],
    queryFn: () => listPatientRegistrations(),
    enabled: Boolean(account.data?.canPreview),
    retry: false,
  });
  const exams = useQuery({
    queryKey: ["account-exams", account.data?.userId],
    queryFn: () => listMedicalExamOverview(),
    enabled: Boolean(account.data?.canPreview),
    retry: false,
    refetchOnWindowFocus: true,
  });
  const path = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  if (account.isPending)
    return (
      <main className="min-h-screen bg-background p-8">
        <p role="status">Abrindo sua conta médica…</p>
      </main>
    );
  if (!account.data?.canPreview)
    return (
      <main className="min-h-screen bg-background p-8">
        <EmptyState
          title="Acesso à conta médica"
          text={
            account.error?.message ?? "Entre na conta médica com acesso autorizado para continuar."
          }
        />
        <Button asChild className="mt-4">
          <Link to="/acesso">Entrar na conta</Link>
        </Button>
      </main>
    );
  const identity = account.data;
  const records = directory.data ?? [];
  const patients = records.map((record) => {
    const reports = exams.data?.reports.filter((r) => r.patient_id === record.id) ?? [];
    const latest = reports[0];
    return {
      ...record,
      birth: record.birth.split("-").reverse().join("/"),
      exam: latest?.filename ?? "Nenhum exame integrado",
      updated: latest
        ? new Date(latest.created_at).toLocaleDateString("pt-BR")
        : "Cadastro na sua conta",
      status: reports.some((r) => !r.reviewed_at)
        ? "Novo resultado"
        : latest
          ? "Disponível"
          : "Sem exames",
    };
  });
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const parsed = patientRegistration.safeParse({
      ...Object.fromEntries(
        ["name", "cpf", "birth", "email", "phone", "rg", "sex", "address", "notes"].map((key) => [
          key,
          String(form.get(key) ?? ""),
        ]),
      ),
      identityConfirmed: form.get("identityConfirmed") === "on",
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Confira os dados.");
      return;
    }
    setBusy(true);
    try {
      const saved = await createMedicalPatient({ data: parsed.data });
      await directory.refetch();
      await navigate({
        to: "/patients/$patientId",
        params: { patientId: saved.id },
        search: { workspace: "account" },
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível cadastrar o paciente.");
    } finally {
      setBusy(false);
    }
  }
  function content() {
    if (path === "/patients/new")
      return (
        <Page
          title="Cadastrar paciente"
          description="Cadastre o paciente ou reutilize seu prontuário pelo CPF. A conta dele manterá o histórico já registrado."
        >
          <form onSubmit={submit} className="max-w-4xl border border-border bg-card">
            <PatientRegistrationFields realAccount disabled={busy} />
            {error && (
              <p role="alert" className="px-6 pb-4 text-sm text-destructive">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-3 border-t bg-muted/40 px-6 py-4">
              <Button variant="outline" asChild>
                <Link to="/patients" search={{ workspace: "account" }}>
                  Cancelar
                </Link>
              </Button>
              <Button disabled={busy || directory.isError}>
                <Check />
                {busy ? "Salvando…" : "Cadastrar paciente"}
              </Button>
            </div>
          </form>
        </Page>
      );
    if (path.startsWith("/patients/"))
      return (
        <AccountPatientDetail
          key={identity.userId + path}
          patientId={path.slice("/patients/".length)}
          userId={identity.userId}
        />
      );
    switch (path) {
      case "/dashboard":
        return (
          <DashboardPage
            account={{
              name: identity.full_name,
              detailedHistories: records.filter(
                (r) =>
                  new Set(
                    exams.data?.results
                      .filter((result) => result.patient_id === r.id)
                      .map((result) => result.collection_date),
                  ).size >= 2,
              ).length,
            }}
          />
        );
      case "/agenda":
        return (
          <Page
            title="Minha agenda"
            description="Seu calendário de consultas, exames e retornos. Navegue pelos meses e confira cada dia."
          >
            <AnnualAgenda
              audience="doctor"
              account={{ patients, doctorName: identity.full_name }}
            />
          </Page>
        );
      case "/results":
        return <NewResultsPage account />;
      case "/history":
        return <HistoryPage account />;
      case "/comparison":
        return (
          <Page
            title="Comparar resultados"
            description="Entenda o que mudou entre duas coletas do mesmo paciente."
          >
            <AccountPortfolioComparison userId={identity.userId} patients={patients} />
          </Page>
        );
      case "/doctors":
        return (
          <DoctorProfilePage
            account={{
              name: identity.full_name,
              email: identity.email ?? "",
              subscription: identity.subscription,
            }}
          />
        );
      case "/follow-up":
        return <FollowUpPage account />;
      case "/indicators":
        return <DoctorReportsPage account />;
      case "/settings":
        return <DoctorSettingsPage account />;
      default:
        return <PatientsPage account />;
    }
  }
  return (
    <PatientDirectoryContext.Provider
      value={{
        patients,
        addPatient: () => {
          throw new Error("O cadastro real exige confirmação e gravação no banco.");
        },
      }}
    >
      <DemoAppShell account={{ userId: identity.userId, name: identity.full_name, patients }}>
        {(directory.error || exams.error) && (
          <div role="alert" className="surface space-y-3 p-4 text-sm text-destructive">
            <p>{directory.error?.message ?? exams.error?.message}</p>
            <Button
              variant="outline"
              onClick={() => {
                void directory.refetch();
                void exams.refetch();
              }}
            >
              Tentar novamente
            </Button>
          </div>
        )}
        {directory.isPending ? <p role="status">Carregando seus pacientes…</p> : content()}
      </DemoAppShell>
    </PatientDirectoryContext.Provider>
  );
}
