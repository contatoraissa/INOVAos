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
import { PatientAccessibility } from "./PatientTools";
import { navigation, sectionHelp, type Section } from "./patient-navigation";
import { resultSeries } from "@/lib/account-records";
import { Button } from "@/components/ui/button";
import { EmptyState } from "./Page";

export function AccountPatientPortal() {
  const account = useQuery({
    queryKey: ["workspace-account"],
    queryFn: () => getAccountSession(),
    retry: false,
  });
  const [section, setSection] = useState<Section>("home");
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
  });
  const entries = useQuery({
    queryKey: ["real-consultation", selected, account.data?.userId],
    queryFn: () => listConsultationEntries({ data: { patientId: selected } }),
    enabled: Boolean(profile),
    retry: false,
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
  const latest = resultSeries(results);
  return (
    <PatientPortalLayout
      name={profile?.name ?? account.data.full_name}
      section={section}
      onOpen={setSection}
      onExit={() => {
        void signOutAccount().then(() => window.location.assign("/acesso-paciente"));
      }}
      notifications={<AccountNotifications patient userId={account.data.userId} />}
    >
      <div>
        <p className="eyebrow">INOVA · SEU ESPAÇO DE CUIDADO</p>
        <h1 className="mt-3 font-display text-3xl font-semibold">
          {navigation.find((item) => item.id === section)?.label}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{sectionHelp[section]}</p>
      </div>
      <section className="surface flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <p className="font-semibold">
            {profile ? `Seu cadastro com ${profile.doctorName}` : "Seu cadastro no INOVA"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {profile
              ? "Dados e histórico do prontuário cadastrado pelo médico."
              : "Aguardando o vínculo autorizado pelo médico."}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {linkedRecords.length > 1 && (
            <select
              aria-label="Selecionar médico e prontuário"
              value={selected}
              onChange={(event) => setSelected(event.target.value)}
              className="max-w-full rounded-lg border bg-white px-3 py-2 text-sm"
            >
              {linkedRecords.map((link) => (
                <option key={link.id} value={link.id}>
                  {link.doctorName}
                </option>
              ))}
            </select>
          )}
          <Button variant="outline" disabled={busy} onClick={() => void synchronize()}>
            Atualizar meu cadastro
          </Button>
        </div>
      </section>
      {linkError && (
        <p role="alert" className="surface p-5 text-sm text-destructive">
          {linkError}
        </p>
      )}
      {busy && <p role="status">Conferindo o vínculo do seu CPF…</p>}
      {!busy && !linkError && !profile && (
        <EmptyState
          title="Seu cadastro aguarda o vínculo"
          text="Peça ao médico para conferir CPF, nascimento e e-mail e autorizar o acesso. Assim que o vínculo estiver confirmado, seus dados aparecerão aqui."
        />
      )}
      {profile && (
        <div key={profile.id} className="space-y-6">
          {(overview.error || entries.error) && (
            <p role="alert" className="surface p-4 text-sm text-destructive">
              {overview.error?.message ?? entries.error?.message}
            </p>
          )}
          {section === "home" && (
            <>
              <section className="rounded-2xl border border-brand/20 bg-brand-soft p-6">
                <p className="eyebrow">SEU PANORAMA · {profile.name}</p>
                <h2 className="mt-3 font-display text-2xl font-semibold">
                  Seu cuidado, com o histórico preservado
                </h2>
                <p className="mt-3 text-sm text-muted-foreground">
                  O cadastro e os dados liberados por {profile.doctorName} já fazem parte do seu
                  espaço.
                </p>
                <div className="mt-5 grid gap-4 sm:grid-cols-3">
                  {[
                    { label: "Resultados disponíveis", count: results.length },
                    { label: "Laudos revisados", count: reports.length },
                    {
                      label: "Orientações publicadas",
                      count: items.filter((item) => item.kind === "guidance").length,
                    },
                  ].map((item) => (
                    <div key={item.label} className="rounded-xl border bg-white p-4">
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className="mt-3 text-3xl font-semibold">{item.count}</p>
                    </div>
                  ))}
                </div>
              </section>
              <section className="surface p-5">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold">Meus últimos resultados</h2>
                  <Button variant="ghost" onClick={() => setSection("history")}>
                    Ver minha evolução
                  </Button>
                </div>
                {latest.length ? (
                  <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {latest.map((series) => (
                      <article
                        key={`${series.name}:${series.unit}`}
                        className="rounded-xl border p-4"
                      >
                        <h3 className="text-sm font-semibold">{series.name}</h3>
                        <p className="mt-4 text-2xl font-semibold">
                          {series.latest.value}{" "}
                          <span className="text-xs font-normal text-muted-foreground">
                            {series.unit}
                          </span>
                        </p>
                        <p className="mt-3 text-xs text-muted-foreground">
                          {series.latest.collection_date}
                        </p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-muted-foreground">
                    Os resultados aparecerão após registro e liberação pelo médico.
                  </p>
                )}
              </section>
              <section className="surface p-5">
                <h2 className="font-semibold">O que você quer fazer?</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Button variant="outline" onClick={() => setSection("consultation")}>
                    Enviar informações ao médico
                  </Button>
                  <Button variant="outline" onClick={() => setSection("profile")}>
                    Conferir meus dados cadastrados
                  </Button>
                  <Button variant="outline" onClick={() => setSection("orders")}>
                    Ver exames pedidos
                  </Button>
                  <Button variant="outline" onClick={() => setSection("documents")}>
                    Abrir meus laudos
                  </Button>
                </div>
              </section>
            </>
          )}
          {section === "profile" && (
            <section className="surface max-w-2xl p-6">
              <h2 className="text-xl font-semibold">Seus dados</h2>
              <div className="mt-5 rounded-xl bg-muted/50 p-4">
                <p className="font-semibold">{profile.name}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  CPF {profile.cpf} · Nascimento: {profile.birth.split("-").reverse().join("/")}
                </p>
              </div>
              <dl className="mt-6 grid gap-4 sm:grid-cols-2">
                {[
                  { label: "E-mail de contato", value: profile.email },
                  { label: "Telefone", value: profile.phone },
                  { label: "RG", value: profile.rg },
                  {
                    label: "Sexo",
                    value: (
                      { f: "Feminino", m: "Masculino", o: "Outro" } as Record<string, string>
                    )[profile.sex],
                  },
                  { label: "Endereço", value: profile.address },
                ].map((item) => (
                  <div key={item.label}>
                    <dt className="label">{item.label}</dt>
                    <dd className="break-words rounded-lg border px-3 py-3 text-sm">
                      {item.value || "Não informado"}
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="mt-5 text-xs text-muted-foreground">
                Dados do cadastro vinculado ao médico. Para corrigir informações de identidade, peça
                a conferência do seu cadastro.
              </p>
            </section>
          )}
          {section === "results" && <AccountResults results={results} />}
          {section === "history" && <AccountResults results={results} charts />}
          {section === "documents" && <AccountDocuments patientId={profile.id} reports={reports} />}
          {section === "genetics" && (
            <AccountDocuments
              patientId={profile.id}
              reports={reports.filter((report) => report.kind !== "Laboratorial")}
            />
          )}
          {section === "consultation" && (
            <RealConsultation patientId={profile.id} kind="preparation" patient />
          )}
          {section === "orders" && <RealConsultation patientId={profile.id} kind="order" patient />}
          {section === "guidance" && (
            <RealConsultation patientId={profile.id} kind="guidance" patient />
          )}
          {section === "agenda" && (
            <RealConsultation patientId={profile.id} kind="return" patient />
          )}
          {["next", "alerts", "timeline"].includes(section) && (
            <section className="space-y-4">
              {items.length ? (
                items.map((item) => (
                  <article key={item.id} className="surface p-5">
                    <p className="text-xs text-muted-foreground">
                      {new Date(item.created_at).toLocaleString("pt-BR")}
                    </p>
                    <h2 className="mt-2 font-semibold">{item.payload.title}</h2>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                      {item.payload.text || item.payload.symptoms}
                    </p>
                    <Button
                      variant="ghost"
                      className="mt-2"
                      onClick={() =>
                        setSection(
                          item.kind === "order"
                            ? "orders"
                            : item.kind === "guidance"
                              ? "guidance"
                              : item.kind === "return"
                                ? "agenda"
                                : "consultation",
                        )
                      }
                    >
                      Abrir detalhes
                    </Button>
                  </article>
                ))
              ) : (
                <EmptyState
                  title="Nenhuma atualização disponível"
                  text="Pedidos, orientações e envios aparecerão quando registrados no prontuário."
                />
              )}
            </section>
          )}
          {["preparation", "favorites"].includes(section) && (
            <EmptyState
              title="Este recurso ainda não está conectado à sua conta"
              text="O vínculo ao prontuário está disponível. Nesta etapa, consultas de laboratório e instruções de preparo precisam ser confirmadas com o médico e a unidade escolhida."
            />
          )}
          <PatientAccessibility />
        </div>
      )}
      <footer className="border-t pt-5 text-xs text-muted-foreground">
        Seus dados são carregados do prontuário vinculado à sua conta.{" "}
        <Link to="/minha-conta" className="text-brand-deep underline">
          Dados da conta
        </Link>
      </footer>
    </PatientPortalLayout>
  );
}
