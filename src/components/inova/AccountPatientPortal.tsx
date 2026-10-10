import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { getAccountSession, signOutAccount } from "@/lib/account-session";
import { synchronizePatientRegistration } from "@/lib/patient-identity";
import { getRealPatientOverview, listConsultationEntries } from "@/lib/real-consultation";
import { AccountNotifications } from "./AccountNotifications";
import { PatientPortalLayout } from "./PatientPortalLayout";
import { AccountResults, AccountDocuments } from "./AccountClinicalPanels";
import { RealConsultation } from "./RealConsultation";
import { PatientAccessibility, PatientSearch } from "./PatientTools";
import { AccountHealthOverview } from "./AccountHealthOverview";
import { AnnualAgenda } from "./AnnualAgenda";
import { GeneticRawPanel } from "./GeneticRawPanel";
import { AccountPatientPreferences } from "./AccountPatientPreferences";
import { AccountPatientOrders } from "./AccountPatientOrders";
import { AccountPatientDocuments } from "./AccountPatientDocuments";
import { AccountPatientHomeResources } from "./AccountPatientHomeResources";
import { readLocalPatientState } from "@/lib/account-patient-local-state";
import { AccountPatientCare } from "./AccountPatientCare";
import { navigation, sectionHelp, type Section } from "./patient-navigation";
import { Button } from "@/components/ui/button";
import { EmptyState } from "./Page";

export function AccountPatientPortal() {
  const account = useQuery({
    queryKey: ["workspace-account"],
    queryFn: () => getAccountSession(),
    retry: false,
  });
  const [section, setSection] = useState<Section>("home");
  const [orderId, setOrderId] = useState<string | undefined>(undefined);
  const [links, setLinks] = useState<Awaited<ReturnType<typeof synchronizePatientRegistration>>>(
    [],
  );
  const [linkError, setLinkError] = useState("");
  const [busy, setBusy] = useState(true);
  const [selected, setSelected] = useState("");
  const [linkOwner, setLinkOwner] = useState("");
  async function synchronize() {
    setBusy(true);
    setLinkError("");
    try {
      const list = await synchronizePatientRegistration();
      setLinkOwner(account.data?.userId ?? "");
      setLinks(list);
      setSelected((previous) =>
        list.some((record) => record.id === previous) ? previous : (list[0]?.id ?? ""),
      );
    } catch (cause) {
      setLinks([]);
      setSelected("");
      setLinkError(
        cause instanceof Error ? cause.message : "Não foi possível localizar seu cadastro.",
      );
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (account.data?.account_type === "patient") void synchronize();
  }, [account.data?.userId]); // eslint-disable-line react-hooks/exhaustive-deps
  const linkedRecords = linkOwner === account.data?.userId ? links : [];
  const profile = linkedRecords.find((link) => link.id === selected);
  const overview = useQuery({
    queryKey: ["account-care-overview", account.data?.userId, selected],
    queryFn: () => getRealPatientOverview({ data: { patientId: selected } }),
    enabled: Boolean(profile),
    retry: false,
    refetchInterval: 30000,
  });
  const entries = useQuery({
    queryKey: ["real-consultation", selected, account.data?.userId],
    queryFn: () => listConsultationEntries({ data: { patientId: selected } }),
    enabled: Boolean(profile),
    retry: false,
    refetchInterval: 30000,
  });
  const local = useQuery({
    queryKey: ["account-local-care", account.data?.userId, selected, section],
    queryFn: () => readLocalPatientState(account.data!.userId, selected),
    enabled: Boolean(profile),
    retry: false,
    staleTime: 0,
  });
  if (account.isPending)
    return (
      <main className="min-h-screen bg-background p-8">
        <p role="status">Abrindo seu espaço…</p>
      </main>
    );
  if (account.data?.account_type !== "patient")
    return (
      <main className="min-h-screen bg-background p-8">
        <EmptyState
          title="Entre na sua conta de paciente"
          text={account.error?.message ?? "O acesso ao seu prontuário exige uma conta confirmada."}
        />
        <Button asChild className="mt-4">
          <Link to="/acesso-paciente">Entrar na conta</Link>
        </Button>
      </main>
    );
  const results = overview.data?.results ?? [];
  const reports = overview.data?.reports ?? [];
  const items = entries.data ?? [];
  const open = (next: Section) => {
    setSection(next);
    if (next !== "consultation") setOrderId(undefined);
  };
  const searchRows = [
    ...results.map((r) => ({
      title: r.name,
      detail: `${r.value} ${r.unit} · ${r.collection_date}`,
      destination: "results" as const,
    })),
    ...reports.map((r) => ({
      title: r.filename,
      detail: r.kind,
      destination: "documents" as const,
    })),
    ...items.map((e) => ({
      title: e.payload.title,
      detail: e.payload.text || e.payload.symptoms || e.payload.exams.join(", "),
      destination: (e.kind === "order"
        ? "orders"
        : e.kind === "guidance"
          ? e.payload.category === "Preparo dos exames"
            ? "preparation"
            : "guidance"
          : e.kind === "return"
            ? "agenda"
            : "consultation") as "orders" | "guidance" | "preparation" | "agenda" | "consultation",
    })),
  ];
  const prepare = (id: string) => {
    setOrderId(id);
    setSection("consultation");
  };
  return (
    <PatientPortalLayout
      name={profile?.name ?? account.data.full_name}
      section={section}
      onOpen={open}
      onExit={() => {
        void signOutAccount().then(() => window.location.assign("/acesso-paciente"));
      }}
      notifications={
        <AccountNotifications
          patient
          userId={account.data.userId}
          onOpenNotification={(id, event) => {
            if (linkedRecords.some((p) => p.id === id)) setSelected(id);
            open(
              event?.includes("agenda") || event?.includes("return")
                ? "agenda"
                : event?.includes("order")
                  ? "orders"
                  : event?.includes("guidance")
                    ? "guidance"
                    : event?.includes("genetic")
                      ? "genetics"
                      : event?.includes("report")
                        ? "results"
                        : "alerts",
            );
          }}
        />
      }
    >
      <div>
        <p className="eyebrow">INOVA · SEU ESPAÇO DE CUIDADO</p>
        <h1 className="mt-3 font-display text-3xl font-semibold">
          {navigation.find((item) => item.id === section)?.label}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{sectionHelp[section]}</p>
      </div>
      {linkedRecords.length > 1 && (
        <section className="surface p-4">
          <label className="text-sm font-medium">
            Prontuário e médico
            <select
              aria-label="Selecionar médico e prontuário"
              value={selected}
              onChange={(e) => {
                setSelected(e.target.value);
                setOrderId(undefined);
              }}
              className="ml-3 max-w-full rounded-lg border bg-white p-3 text-sm"
            >
              {linkedRecords.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.doctorName}
                </option>
              ))}
            </select>
          </label>
        </section>
      )}
      {(linkError || overview.error || entries.error || local.error) && (
        <div role="alert" className="surface p-5 text-sm text-destructive">
          {linkError ||
            overview.error?.message ||
            entries.error?.message ||
            "Não foi possível recuperar seus arquivos locais neste navegador."}
          <Button
            variant="ghost"
            onClick={() => {
              void synchronize();
              void overview.refetch();
              void entries.refetch();
            }}
          >
            Tentar atualizar
          </Button>
        </div>
      )}
      {busy && <p role="status">Conferindo o vínculo do seu CPF…</p>}
      {!busy && !linkError && !profile && (
        <EmptyState
          title="Seu cadastro aguarda o vínculo"
          text="Peça ao médico para conferir CPF, nascimento e e-mail e autorizar o acesso. Assim que o vínculo estiver confirmado, seus dados aparecerão aqui."
        />
      )}
      {profile && (
        <div key={account.data.userId + profile.id} className="space-y-6">
          {section === "home" && (
            <AccountHealthOverview
              name={profile.name}
              results={results}
              entries={items}
              onOpen={open}
            />
          )}
          {section === "agenda" && (
            <>
              <AccountPatientOrders
                compact
                patientId={profile.id}
                userId={account.data.userId}
                email={profile.email}
                doctorName={profile.doctorName}
                entries={items}
                onPrepare={prepare}
                onOpen={open}
                refresh={entries.refetch}
              />
              <AnnualAgenda
                key={profile.id}
                audience="patient"
                account={{ patients: [profile], doctorName: profile.doctorName }}
              />
            </>
          )}
          <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_240px]">
            <PatientSearch data={null} documents={[]} onOpen={open} accountRows={searchRows} />
            <PatientAccessibility />
          </div>
          {(overview.isPending || entries.isPending) && (
            <p role="status">Carregando seu acompanhamento…</p>
          )}
          {section === "home" && (
            <>
              <AccountPatientCare
                primaryOnly
                mode="next"
                patientId={profile.id}
                doctorName={profile.doctorName}
                entries={items}
                results={results}
                localDocuments={local.data?.documents ?? []}
                saved={local.data?.saved ?? false}
                onOpen={open}
                refresh={async () => {
                  await entries.refetch();
                }}
              />
              <section className="surface p-5" aria-label="Acesso rápido do paciente">
                <h2 className="text-lg font-semibold">O que você quer fazer?</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {[
                    {
                      id: "orders" as const,
                      title: "Ver exames pedidos",
                      detail: "Confira o pedido do médico e as opções de laboratório.",
                    },
                    {
                      id: "consultation" as const,
                      title: "Enviar informações ao médico",
                      detail: "Escreva ou grave áudio e anexe seus laudos.",
                    },
                    {
                      id: "results" as const,
                      title: "Consultar meus resultados",
                      detail: "Abra os valores dos exames e suas referências.",
                    },
                    {
                      id: "guidance" as const,
                      title: "Ler orientações do médico",
                      detail: "Confira o que foi publicado para seu cuidado.",
                    },
                  ].map((item) => (
                    <button
                      key={item.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/20 p-4 text-left transition-colors hover:border-brand hover:bg-brand-soft"
                      onClick={() => open(item.id)}
                    >
                      <span>
                        <span className="block text-sm font-semibold text-brand-deep">
                          {item.title}
                        </span>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {item.detail}
                        </span>
                      </span>
                      <span className="text-brand-deep">→</span>
                    </button>
                  ))}
                </div>
              </section>
              <AccountPatientHomeResources
                patientId={profile.id}
                results={results}
                documents={local.data?.documents.length ?? 0}
                saved={local.data?.saved ?? false}
                onOpen={open}
              />
            </>
          )}
          {section === "profile" && (
            <AccountPatientPreferences userId={account.data.userId} profile={profile} />
          )}
          {section === "favorites" && (
            <AccountPatientPreferences userId={account.data.userId} profile={profile} favorites />
          )}
          {section === "results" && (
            <>
              <section className="surface p-5 sm:p-6">
                <AccountResults
                  results={results}
                  name={profile.name}
                  patientId={profile.id}
                  audience="patient"
                />
              </section>
            </>
          )}
          {section === "history" && (
            <>
              <AccountResults
                results={results}
                charts
                name={profile.name}
                birth={profile.birth}
                patientId={profile.id}
                audience="patient"
              />
            </>
          )}
          {section === "documents" && (
            <AccountPatientDocuments
              patientId={profile.id}
              userId={account.data.userId}
              reports={reports}
              entries={items}
              onPrepare={() => open("consultation")}
            />
          )}
          {section === "genetics" && (
            <>
              <GeneticRawPanel account patientId={profile.id} audience="patient" />
              <AccountDocuments
                patientId={profile.id}
                reports={reports.filter((r) => r.kind !== "Laboratorial")}
              />
            </>
          )}
          {section === "consultation" && (
            <RealConsultation
              onGuidance={() => setSection("guidance")}
              key={profile.id + String(orderId)}
              patientId={profile.id}
              kind="preparation"
              patient
              orderId={orderId}
            />
          )}
          {section === "orders" && (
            <AccountPatientOrders
              patientId={profile.id}
              userId={account.data.userId}
              email={profile.email}
              doctorName={profile.doctorName}
              entries={items}
              onPrepare={prepare}
              onOpen={open}
              refresh={entries.refetch}
            />
          )}
          {section === "alerts" && (
            <AccountNotifications
              patient
              panel
              userId={account.data.userId}
              onOpenNotification={(id, event) => {
                if (linkedRecords.some((p) => p.id === id)) setSelected(id);
                open(
                  event?.includes("agenda") || event?.includes("return")
                    ? "agenda"
                    : event?.includes("order")
                      ? "orders"
                      : event?.includes("guidance")
                        ? "guidance"
                        : event?.includes("genetic")
                          ? "genetics"
                          : event?.includes("report")
                            ? "results"
                            : "timeline",
                );
              }}
            />
          )}
          {(["next", "guidance", "preparation", "timeline"] as const).map(
            (mode) =>
              section === mode && (
                <AccountPatientCare
                  key={mode}
                  mode={mode}
                  patientId={profile.id}
                  doctorName={profile.doctorName}
                  entries={items}
                  results={results}
                  localDocuments={local.data?.documents ?? []}
                  saved={local.data?.saved ?? false}
                  onOpen={open}
                  refresh={async () => {
                    await Promise.all([entries.refetch(), overview.refetch(), local.refetch()]);
                  }}
                />
              ),
          )}
        </div>
      )}
      <footer className="border-t pt-5 text-xs text-muted-foreground">
        Seu espaço de cuidado · {profile?.doctorName ?? "INOVA"}. Dados do prontuário vinculado à
        sua conta.{" "}
        <Link
          to="/minha-conta"
          search={{ workspace: "account" }}
          className="text-brand-deep underline"
        >
          Dados da conta
        </Link>
      </footer>
    </PatientPortalLayout>
  );
}
