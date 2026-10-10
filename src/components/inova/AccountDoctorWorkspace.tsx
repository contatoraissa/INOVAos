import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Plus, Search } from "lucide-react";
import { getAccountSession } from "@/lib/account-session";
import { listPatientRegistrations } from "@/lib/patient-identity";
import { createMedicalPatient } from "@/lib/medical-workspace";
import { patientRegistration } from "@/lib/medical-patient-contract";
import { DemoAppShell } from "./AppShell";
import { PatientRegistrationFields } from "./PatientRegistrationFields";
import { AccountPatientDetail } from "./AccountPatientDetail";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, Page, StatusBadge } from "./Page";

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
  const path = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const records = directory.data ?? [];
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
            account.error instanceof Error
              ? account.error.message
              : "Entre na conta médica com acesso de avaliação autorizado para continuar."
          }
        />
        <Button asChild className="mt-4">
          <Link to="/acesso">Entrar na conta</Link>
        </Button>
      </main>
    );
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
  return (
    <DemoAppShell
      account={{
        userId: account.data.userId,
        name: account.data.full_name,
        patients: records.map((record) => ({
          ...record,
          birth: record.birth.split("-").reverse().join("/"),
          exam: "Prontuário cadastrado",
          updated: "Cadastro na sua conta",
          status: record.linked ? "Conta vinculada" : "Aguardando paciente",
        })),
      }}
    >
      {path === "/patients/new" ? (
        <Page
          title="Cadastrar paciente"
          description="Cadastre o paciente ou reutilize seu prontuário pelo CPF. A conta dele manterá o histórico já registrado."
        >
          {directory.error && (
            <p role="alert" className="surface p-4 text-sm text-destructive">
              {directory.error.message}
            </p>
          )}
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
      ) : path.startsWith("/patients/") ? (
        <AccountPatientDetail
          patientId={path.slice("/patients/".length)}
          userId={account.data.userId}
        />
      ) : (
        <Page
          title="Pacientes"
          description="Os cadastros e prontuários vinculados à sua conta médica."
          actions={
            <Button asChild>
              <Link to="/patients/new" search={{ workspace: "account" }}>
                <Plus />
                Novo paciente
              </Link>
            </Button>
          }
        >
          <div className="toolbar">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
              <Input
                className="pl-9"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Pesquisar por nome, CPF, e-mail ou nascimento"
              />
            </div>
            <Button variant="outline" onClick={() => void directory.refetch()}>
              Atualizar pacientes
            </Button>
          </div>
          {directory.error ? (
            <p role="alert" className="surface p-5 text-sm text-destructive">
              {directory.error.message}
            </p>
          ) : directory.isPending ? (
            <p role="status">Carregando seus pacientes…</p>
          ) : !records.length ? (
            <EmptyState
              title="Sua carteira está pronta para começar"
              text="Cadastre o primeiro paciente. Os dados dele permanecerão neste prontuário quando criar sua conta."
            />
          ) : (
            <div className="surface overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Nascimento</th>
                    <th>Contato</th>
                    <th>Conta do paciente</th>
                    <th>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {records
                    .filter((record) =>
                      `${record.name} ${record.cpf} ${record.email} ${record.birth}`
                        .toLowerCase()
                        .includes(query.toLowerCase()),
                    )
                    .map((record) => (
                      <tr key={record.id}>
                        <td>
                          <p className="font-medium">{record.name}</p>
                          <p className="text-xs text-muted-foreground">CPF {record.cpf}</p>
                        </td>
                        <td>{record.birth.split("-").reverse().join("/")}</td>
                        <td>
                          {record.email}
                          <p className="text-xs text-muted-foreground">{record.phone}</p>
                        </td>
                        <td>
                          <StatusBadge fresh={record.linked}>
                            {record.linked ? "Conta vinculada" : "Aguardando confirmação"}
                          </StatusBadge>
                        </td>
                        <td>
                          <Button variant="outline" size="sm" asChild>
                            <Link
                              to="/patients/$patientId"
                              params={{ patientId: record.id }}
                              search={{ workspace: "account" }}
                            >
                              Abrir histórico
                            </Link>
                          </Button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </Page>
      )}
    </DemoAppShell>
  );
}
