import { PatientHealthOverview } from "./PatientHealthOverview";
import { AnnualAgenda } from "./AnnualAgenda";
import { PatientAgendaOrders } from "./PatientAgendaOrders";
import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Activity,
  Bell,
  Dna,
  ArrowRight,
  Check,
  ClipboardList,
  FileText,
  HeartPulse,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  MapPin,
  Plus,
  Trash2,
  Upload,
  User,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Logo } from "./Logo";
import { PatientLabResults } from "./PatientLabResults";
import { MarkerEvolution } from "./MarkerEvolution";
import { patientHistoryById } from "@/data/demo";
import { createSessionId } from "@/lib/session-id";
import { MAX_PDF_BYTES } from "@/lib/ai-contract";
import { AudioAnswer, type AudioClip } from "./AudioAnswer";
import { PatientSubmissionStatus } from "./PatientSubmissionStatus";
import { PreparationSendPanel } from "./PreparationSendPanel";
import type { PreparationField } from "@/lib/preparation-contract";
import { PatientExamOrders } from "./PatientExamOrders";
import { usePatientCare } from "./usePatientCare";
import { PatientCarePanels, PatientNextSteps } from "./PatientCarePanels";
import { patientDraft } from "@/lib/patient-draft";
import { PatientSearch, PatientAccessibility } from "./PatientTools";
import { GeneticRawPanel } from "./GeneticRawPanel";

import { navigation, patientGroups, sectionHelp, type Section } from "./patient-navigation";
type Document = { id: string; name: string; kind: string; file: File; createdAt: string };
type Preparation = { symptoms: string; medicines: string; questions: string };
type StoredPreparation = {
  draft: Preparation;
  saved: Preparation | null;
  audios: Partial<Record<PreparationField, AudioClip>>;
  documents: Document[];
};
const patientId = "mariana-oliveira";

export function PatientPortal() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const care = usePatientCare(ready);
  const [section, setSection] = useState<Section>("home");
  const [agendaOrderId, setAgendaOrderId] = useState<string | undefined>(undefined);
  const [menu, setMenu] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selected, setSelected] = useState("");
  const [kind, setKind] = useState("Análises clínicas");
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [url, setUrl] = useState("");
  const [draft, setDraft] = useState<Preparation>({ symptoms: "", medicines: "", questions: "" });
  const [saved, setSaved] = useState<Preparation | null>(null);
  const [audios, setAudios] = useState<Partial<Record<PreparationField, AudioClip>>>({});
  const [activeRecording, setActiveRecording] = useState<PreparationField | null>(null);
  const [profile, setProfile] = useState({ phone: "", email: "mariana@exemplo.com" });
  const [profileSaved, setProfileSaved] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [draftStorageReady, setDraftStorageReady] = useState(false);
  const [draftStatus, setDraftStatus] = useState("Carregando rascunho…");
  const [clearDraft, setClearDraft] = useState(false);
  const draftGeneration = useRef(0);
  const input = useRef<HTMLInputElement>(null);
  const selectedDocument = documents.find((item) => item.id === selected);
  const history = patientHistoryById[patientId];
  useEffect(() => {
    if (sessionStorage.getItem("inova-patient-demo") !== patientId) {
      void navigate({ to: "/acesso-paciente", replace: true });
    } else setReady(true);
  }, [navigate]);
  useEffect(() => {
    if (!selectedDocument) {
      setUrl("");
      return;
    }
    const next = URL.createObjectURL(selectedDocument.file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [selectedDocument]);
  useEffect(() => {
    if (!ready) return;
    let current = true;
    void patientDraft<StoredPreparation>(patientId, "read")
      .then((record) => {
        if (!current) return;
        if (record?.value) {
          if (
            !record.value.draft ||
            !["symptoms", "medicines", "questions"].every(
              (field) => typeof record.value.draft[field as keyof Preparation] === "string",
            ) ||
            !Array.isArray(record.value.documents) ||
            record.value.documents.some((item) => !(item.file instanceof File)) ||
            !record.value.audios ||
            Object.values(record.value.audios).some((item) => item && !(item.blob instanceof Blob))
          )
            throw new Error("Rascunho incompatível.");
          setDraft(record.value.draft);
          setSaved(record.value.saved);
          setAudios(record.value.audios);
          setDocuments(record.value.documents);
          setDraftStatus("Rascunho recuperado deste navegador.");
        } else setDraftStatus("Rascunho salvo automaticamente neste navegador.");
        setDraftStorageReady(true);
      })
      .catch(() => {
        if (current)
          setDraftStatus("Salvamento local indisponível. Os dados ficarão apenas nesta página.");
      })
      .finally(() => {
        if (current) setDraftLoaded(true);
      });
    return () => {
      current = false;
    };
  }, [ready]);
  useEffect(() => {
    if (!ready || !draftLoaded || !draftStorageReady) return;
    const generation = ++draftGeneration.current;
    const value = { draft, saved, audios, documents };
    const size =
      documents.reduce((total, item) => total + item.file.size, 0) +
      Object.values(audios).reduce((total, item) => total + (item?.blob.size ?? 0), 0);
    if (size > 50 * 1024 * 1024) {
      setDraftStatus(
        "Anexos excedem 50 MB. O último rascunho salvo foi preservado; remova arquivos para salvar novamente.",
      );
      return;
    }
    void patientDraft(patientId, "save", value)
      .then(() => {
        if (generation === draftGeneration.current)
          setDraftStatus(
            "Rascunho salvo neste navegador · " + new Date().toLocaleTimeString("pt-BR"),
          );
      })
      .catch(() => {
        if (generation === draftGeneration.current)
          setDraftStatus(
            "Não foi possível salvar. Mantenha esta página aberta para preservar os dados.",
          );
      });
  }, [ready, draftLoaded, draftStorageReady, draft, saved, audios, documents]);
  async function discardDraft() {
    if (!clearDraft) {
      setClearDraft(true);
      return;
    }
    try {
      await patientDraft(patientId, "remove");
      setDraftStorageReady(true);
      setDraft({ symptoms: "", medicines: "", questions: "" });
      setSaved(null);
      setAudios({});
      setDocuments([]);
      setSelected("");
      setClearDraft(false);
    } catch {
      setDraftStatus("Não foi possível apagar o rascunho local. Tente novamente.");
    }
  }
  function open(next: Section) {
    setSection(next);
    setMenu(false);
  }
  async function attach(file?: File) {
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      if (!file.name.toLowerCase().endsWith(".pdf") || file.size > MAX_PDF_BYTES)
        throw new Error("Escolha um PDF de até 8 MB.");
      if (new TextDecoder().decode(await file.slice(0, 5).arrayBuffer()) !== "%PDF-")
        throw new Error("Este arquivo não é um PDF válido.");
      const id = createSessionId();
      setDocuments((items) => [
        ...items,
        { id, name: file.name, kind, file, createdAt: new Date().toISOString() },
      ]);
      setSelected(id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível abrir o arquivo.");
    } finally {
      setUploading(false);
      if (input.current) input.current.value = "";
    }
  }
  if (!ready || !draftLoaded)
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <p role="status" className="text-sm text-muted-foreground">
          Abrindo seu espaço…
        </p>
      </main>
    );
  return (
    <div className="patient-portal min-h-screen bg-[#f4f8fa]">
      {menu && (
        <button
          aria-label="Fechar menu"
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={() => setMenu(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-border bg-white transition-transform lg:translate-x-0 ${menu ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex items-center justify-between px-7 py-8">
          <button
            type="button"
            onClick={() => open("home")}
            aria-label="INOVA · voltar ao início do paciente"
            className="rounded-md focus-visible:outline-2 focus-visible:outline-brand"
          >
            <Logo />
          </button>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMenu(false)}
            aria-label="Fechar navegação"
          >
            <X />
          </Button>
        </div>
        <p className="px-7 pb-5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          ESPAÇO DO PACIENTE
        </p>
        <nav
          className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3"
          aria-label="Navegação do paciente"
        >
          {patientGroups.map((group) => (
            <div key={group.label} className="mb-5">
              <p className="mb-2 px-4 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {group.label}
              </p>
              {navigation
                .filter((item) => group.ids.includes(item.id))
                .map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => open(id)}
                    aria-current={section === id ? "page" : undefined}
                    className={`flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-left text-sm transition-colors ${section === id ? "bg-brand-soft font-semibold text-brand-deep" : "text-muted-foreground hover:bg-muted"}`}
                  >
                    <Icon className="size-4 shrink-0" />
                    {label}
                  </button>
                ))}
            </div>
          ))}
        </nav>
        <div className="mt-auto p-4">
          <div className="rounded-2xl bg-[#f3f8f9] p-4">
            <p className="text-sm font-semibold">Mariana Oliveira</p>
            <p className="mt-1 text-xs text-muted-foreground">Perfil demonstrativo</p>
          </div>
          <button
            onClick={() => {
              sessionStorage.removeItem("inova-patient-demo");
              void navigate({ to: "/acesso-paciente", replace: true });
            }}
            className="mt-4 flex items-center gap-2 px-3 text-sm text-muted-foreground"
          >
            <LogOut className="size-4" />
            Sair do meu espaço
          </button>
        </div>
      </aside>
      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 flex h-20 items-center justify-between gap-3 border-b border-border bg-white/95 px-5 backdrop-blur sm:px-8">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              aria-label="Abrir menu"
              onClick={() => setMenu(true)}
            >
              <Menu />
            </Button>
            <p className="hidden text-sm font-medium sm:block">Cuidado em perspectiva</p>
          </div>
          <Button
            variant="ghost"
            onClick={() => open("alerts")}
            aria-label="Abrir avisos do paciente"
          >
            <Bell className="size-4" />
            {care.data?.events.filter((event) => !event.read).length ?? 0}
            <span className="sr-only">avisos não lidos</span>
          </Button>
          <span className="rounded-full bg-brand-soft px-3 py-1.5 text-[11px] font-medium text-brand-deep">
            Dados fictícios
          </span>
        </header>
        <main className="mx-auto max-w-6xl space-y-6 px-5 py-8 sm:px-8">
          <div>
            <p className="eyebrow">INOVA · SEU ESPAÇO DE CUIDADO</p>
            <h1 className="mt-3 font-display text-3xl font-semibold">
              {section === "home"
                ? "Minha saúde"
                : navigation.find((item) => item.id === section)?.label}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {sectionHelp[section]}
            </p>
          </div>
          {section === "home" && <PatientHealthOverview onOpen={open} />}
          {section === "agenda" && (
            <div className="space-y-5">
              <PatientAgendaOrders
                orders={care.data?.orders ?? []}
                progress={care.data?.progress ?? []}
                onOpenOrder={(id) => {
                  setAgendaOrderId(id);
                  open("orders");
                }}
              />
              <AnnualAgenda audience="patient" />
            </div>
          )}
          <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_240px]">
            <PatientSearch data={care.data} documents={documents} onOpen={open} />
            <PatientAccessibility />
          </div>
          {care.error && (
            <div
              role="alert"
              className="rounded-xl border border-border bg-white p-4 text-sm text-destructive"
            >
              {care.error}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  void care.refresh();
                }}
              >
                Tentar atualizar
              </Button>
            </div>
          )}
          {(
            ["next", "alerts", "guidance", "preparation", "favorites", "timeline"] as Section[]
          ).includes(section) &&
            (care.data ? (
              <PatientCarePanels
                key={section}
                mode={
                  section as
                    "next" | "alerts" | "guidance" | "preparation" | "favorites" | "timeline"
                }
                data={care.data}
                refresh={care.refresh}
                onOpen={open}
                localDocuments={documents}
                saved={Boolean(saved)}
              />
            ) : (
              <p role="status" className="surface p-6 text-sm text-muted-foreground">
                Carregando acompanhamento…
              </p>
            ))}
          {section === "home" && (
            <>
              {care.data && (
                <PatientNextSteps
                  primaryOnly
                  data={care.data}
                  localDocuments={documents.length}
                  saved={Boolean(saved)}
                  onOpen={open}
                />
              )}
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
                      onClick={() => open(item.id)}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/20 p-4 text-left transition-colors hover:border-brand hover:bg-brand-soft"
                    >
                      <span>
                        <span className="block text-sm font-semibold text-brand-deep">
                          {item.title}
                        </span>
                        <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                          {item.detail}
                        </span>
                      </span>
                      <ArrowRight className="size-4 shrink-0 text-brand" />
                    </button>
                  ))}
                </div>
              </section>

              <GeneticRawPanel
                patientId={patientId}
                audience="patient"
                compact
                onOpen={() => open("genetics")}
              />
              <section className="relative overflow-hidden rounded-3xl bg-[#123e4a] p-7 text-white sm:p-9">
                <div className="absolute -right-16 -top-16 size-64 rounded-full border-[30px] border-white/5" />
                <p className="text-xs font-medium uppercase tracking-widest text-cyan-200">
                  PREPARAR MINHA CONSULTA
                </p>
                <h2 className="relative mt-4 max-w-lg font-display text-2xl font-semibold">
                  Mais tranquilidade para sua próxima consulta.
                </h2>
                <p className="relative mt-3 max-w-lg text-sm leading-relaxed text-white/70">
                  Registre o que você está sentindo, os medicamentos que usa e as perguntas que
                  deseja fazer.
                </p>
                <Button
                  onClick={() => open("consultation")}
                  className="relative mt-6 bg-white text-[#123e4a] hover:bg-white/90"
                >
                  Preparar minha consulta <ArrowRight />
                </Button>
              </section>
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  {
                    title: "Coletas no histórico",
                    value: String(history?.history.length ?? 0),
                    detail: "Resultados demonstrativos",
                    next: "history" as const,
                  },
                  {
                    title: "Documentos adicionados",
                    value: String(documents.length),
                    detail: "Salvos neste navegador",
                    next: "documents" as const,
                  },
                  {
                    title: "Preparação da consulta",
                    value: saved ? "Salva" : "A fazer",
                    detail: "Suas anotações pessoais",
                    next: "consultation" as const,
                  },
                ].map((item) => (
                  <button
                    key={item.title}
                    onClick={() => open(item.next)}
                    className="surface p-5 text-left hover:border-brand/30"
                  >
                    <p className="text-xs text-muted-foreground">{item.title}</p>
                    <p className="mt-3 font-display text-3xl font-semibold">{item.value}</p>
                    <p className="mt-2 text-xs text-muted-foreground">{item.detail}</p>
                  </button>
                ))}
              </div>
              <section className="surface p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-display text-lg font-semibold">Sua última coleta</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      18 de setembro de 2026 · exemplo fictício
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => open("results")}>
                    Ver meus resultados <ArrowRight />
                  </Button>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    { label: "Glicemia", value: "92", unit: "mg/dL" },
                    { label: "Hemoglobina", value: "13,8", unit: "g/dL" },
                    { label: "Colesterol LDL", value: "108", unit: "mg/dL" },
                    { label: "Vitamina D", value: "34,6", unit: "ng/mL" },
                  ].map((item) => (
                    <div key={item.label} className="rounded-xl bg-[#f5f9fa] p-4">
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className="mt-3 text-2xl font-semibold">
                        {item.value}{" "}
                        <span className="text-xs font-normal text-muted-foreground">
                          {item.unit}
                        </span>
                      </p>
                    </div>
                  ))}
                </div>
                <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
                  Os valores precisam ser avaliados junto ao seu histórico pelo profissional que
                  acompanha você.
                </p>
              </section>
              <div className="grid gap-4 sm:grid-cols-2">
                <button
                  className="surface flex items-center gap-4 p-6 text-left"
                  onClick={() => open("documents")}
                >
                  <span className="rounded-xl bg-brand-soft p-3 text-brand-deep">
                    <Upload />
                  </span>
                  <div>
                    <h2 className="text-sm font-semibold">Tem um novo laudo?</h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Adicione e organize seu PDF.
                    </p>
                  </div>
                  <ArrowRight className="ml-auto size-4 shrink-0" />
                </button>
                <button
                  className="surface flex items-center gap-4 p-6 text-left"
                  onClick={() => open("history")}
                >
                  <span className="rounded-xl bg-brand-soft p-3 text-brand-deep">
                    <HeartPulse />
                  </span>
                  <div>
                    <h2 className="text-sm font-semibold">Acompanhe sua evolução</h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Compare os valores ao longo do tempo.
                    </p>
                  </div>
                  <ArrowRight className="ml-auto size-4 shrink-0" />
                </button>
              </div>
            </>
          )}
          {section === "results" && (
            <section className="surface p-5 sm:p-6">
              <PatientLabResults patientId={patientId} patientAI />
            </section>
          )}
          {section === "orders" && (
            <PatientExamOrders
              initialOrderId={agendaOrderId}
              onSendResults={() => open("preparation")}
              patientId={patientId}
              favorites={care.data?.favorites ?? []}
              progress={care.data?.progress ?? []}
              orderSnapshot={care.data?.orders}
              onCareChange={care.refresh}
              onFavorites={() => open("favorites")}
              onPreparation={() => open("preparation")}
            />
          )}
          {section === "genetics" && (
            <GeneticRawPanel
              patientId={patientId}
              audience="patient"
              onChanged={() => {
                void care.refresh();
              }}
            />
          )}
          {section === "history" && history && (
            <>
              <p className="rounded-xl border border-border bg-white p-4 text-xs text-muted-foreground">
                Histórico fictício. As variações numéricas não representam um diagnóstico ou uma
                orientação de tratamento.
              </p>
              <MarkerEvolution patient={history} audience="patient" />
            </>
          )}
          {section === "documents" && (
            <>
              <section className="surface p-5">
                <h2 className="text-lg font-semibold">Seus laudos, organizados</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Adicione PDFs fictícios ou anonimizados. Para enviá-los à caixa médica
                  demonstrativa, selecione os documentos em Preparar consulta e confirme o envio.
                </p>
                <div className="mt-5 flex flex-wrap items-end gap-3">
                  <div>
                    <label htmlFor="document-kind" className="label">
                      Tipo de documento
                    </label>
                    <select
                      id="document-kind"
                      value={kind}
                      onChange={(event) => setKind(event.target.value)}
                      className="h-10 rounded-md border border-border bg-white px-3 text-sm"
                    >
                      {["Análises clínicas", "Genética", "Genômica", "Outros laudos"].map(
                        (item) => (
                          <option key={item}>{item}</option>
                        ),
                      )}
                    </select>
                  </div>
                  <Button onClick={() => input.current?.click()} disabled={uploading}>
                    <Plus />
                    {uploading ? "Abrindo PDF…" : "Adicionar PDF"}
                  </Button>
                  <Button variant="outline" onClick={() => open("consultation")}>
                    Enviar junto da preparação <ArrowRight />
                  </Button>
                  <input
                    ref={input}
                    type="file"
                    accept=".pdf,application/pdf"
                    className="hidden"
                    aria-label="Adicionar documento do paciente"
                    onChange={(event) => {
                      void attach(event.target.files?.[0]);
                    }}
                  />
                </div>
                {error && (
                  <p role="alert" className="mt-4 text-sm text-destructive">
                    {error}
                  </p>
                )}
              </section>
              <Input
                aria-label="Pesquisar meus documentos"
                placeholder="Pesquisar pelo nome do documento…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <div className="grid items-start gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
                <section className="surface space-y-3 p-4">
                  {documents
                    .filter((item) => item.name.toLowerCase().includes(query.toLowerCase()))
                    .map((item) => (
                      <div
                        key={item.id}
                        className={`rounded-xl border p-4 ${item.id === selected ? "border-brand/30 bg-brand-soft" : "border-border"}`}
                      >
                        <button className="w-full text-left" onClick={() => setSelected(item.id)}>
                          <FileText className="mb-2 size-5 text-brand-deep" />
                          <p className="break-words text-sm font-medium">{item.name}</p>
                          <p className="mt-2 text-xs text-muted-foreground">
                            {item.kind} · rascunho neste navegador
                          </p>
                        </button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-3"
                          onClick={() => {
                            setDocuments((items) => items.filter((other) => other.id !== item.id));
                            if (selected === item.id) setSelected("");
                          }}
                        >
                          <Trash2 className="size-3" />
                          Remover
                        </Button>
                      </div>
                    ))}
                  {documents.filter((item) => item.name.toLowerCase().includes(query.toLowerCase()))
                    .length === 0 && (
                    <div className="py-8 text-center">
                      <FileText className="mx-auto size-7 text-brand-deep" />
                      <p className="mt-3 text-sm text-muted-foreground">
                        {documents.length
                          ? "Nenhum documento encontrado."
                          : "Seus documentos aparecerão aqui."}
                      </p>
                    </div>
                  )}
                </section>
                <section className="surface overflow-hidden">
                  {selectedDocument && url ? (
                    <>
                      <div className="flex items-center justify-between gap-3 p-4">
                        <h2 className="min-w-0 break-words text-sm font-semibold">
                          Documento original
                        </h2>
                        <a
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="shrink-0 text-xs text-brand-deep"
                        >
                          Abrir PDF
                        </a>
                      </div>
                      <iframe
                        title={`Meu documento: ${selectedDocument.name}`}
                        src={url}
                        className="h-[60dvh] w-full border-t border-border"
                      />
                    </>
                  ) : (
                    <p className="p-8 text-sm text-muted-foreground">
                      Selecione um documento para visualizar o original.
                    </p>
                  )}
                </section>
              </div>
            </>
          )}
          {section === "consultation" && (
            <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
              <section
                className="surface p-4 xl:col-span-2 print:hidden"
                aria-label="Rascunho da preparação"
              >
                <p role="status" className="text-sm font-semibold text-brand-deep">
                  {draftStatus}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Textos, áudios concluídos e PDFs são guardados apenas neste navegador e podem ser
                  recuperados ao retornar, inclusive depois de sair. Envio ao médico continua
                  exigindo confirmação. Use somente dados fictícios; em dispositivo compartilhado,
                  apague o rascunho ao terminar.
                </p>
                <div className="mt-3 flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={activeRecording !== null}
                    onClick={() => {
                      void discardDraft();
                    }}
                  >
                    {clearDraft
                      ? "Confirmar exclusão do rascunho e anexos"
                      : "Apagar rascunho deste navegador"}
                  </Button>
                  {clearDraft && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setClearDraft(false)}
                    >
                      Cancelar exclusão
                    </Button>
                  )}
                </div>
              </section>
              <div className="xl:col-span-2">
                <PatientSubmissionStatus
                  data={care.data}
                  loading={care.loading}
                  onRefresh={() => {
                    void care.refresh();
                  }}
                  onGuidance={() => open("guidance")}
                />
              </div>
              <form
                className="patient-consultation-form surface space-y-6 p-6"
                onSubmit={(event) => {
                  event.preventDefault();
                  setSaved({ ...draft });
                }}
              >
                <div>
                  <h2 className="font-display text-xl font-semibold">O que você quer conversar?</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Escreva ou grave uma mensagem. Você pode ouvir, apagar e gravar novamente antes
                    de enviar.
                  </p>
                </div>
                {[
                  {
                    key: "symptoms" as const,
                    label: "Como você tem se sentido?",
                    placeholder: "O que mudou, quando começou e o que mais preocupa você…",
                  },
                  {
                    key: "medicines" as const,
                    label: "Medicamentos e suplementos",
                    placeholder: "Nome, dose e frequência, se souber…",
                  },
                  {
                    key: "questions" as const,
                    label: "Suas perguntas para a consulta",
                    placeholder: "O que você gostaria de esclarecer?",
                  },
                ].map((item) => (
                  <div key={item.key}>
                    <label htmlFor={item.key} className="label">
                      {item.label}
                    </label>
                    <Textarea
                      id={item.key}
                      value={draft[item.key]}
                      placeholder={item.placeholder}
                      onChange={(event) => setDraft({ ...draft, [item.key]: event.target.value })}
                      className="min-h-28"
                      maxLength={3000}
                    />
                    <AudioAnswer
                      field={item.key}
                      label={item.label}
                      clip={audios[item.key]}
                      disabled={activeRecording !== null && activeRecording !== item.key}
                      onChange={(clip) =>
                        setAudios((items) => {
                          const next = { ...items };
                          if (clip) next[item.key] = clip;
                          else delete next[item.key];
                          return next;
                        })
                      }
                      onRecordingChange={(recording) =>
                        setActiveRecording((current) =>
                          recording ? item.key : current === item.key ? null : current,
                        )
                      }
                    />
                  </div>
                ))}
                <Button>
                  <Check />
                  Salvar minhas anotações
                </Button>
                {saved && (
                  <p role="status" className="text-sm text-brand-deep">
                    {JSON.stringify(saved) === JSON.stringify(draft)
                      ? "Anotações salvas neste navegador."
                      : "Você fez alterações. Salve novamente para atualizar."}
                  </p>
                )}
                <div className="border-t border-border pt-5">
                  <label htmlFor="consultation-document-kind" className="label">
                    Adicionar laudo à preparação
                  </label>
                  <div className="flex flex-wrap gap-3">
                    <select
                      id="consultation-document-kind"
                      value={kind}
                      onChange={(event) => setKind(event.target.value)}
                      className="h-10 rounded-md border border-border bg-white px-3 text-sm"
                    >
                      {["Análises clínicas", "Genética", "Genômica", "Outros laudos"].map(
                        (item) => (
                          <option key={item}>{item}</option>
                        ),
                      )}
                    </select>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={uploading}
                      onClick={() => input.current?.click()}
                    >
                      <Plus />
                      {uploading ? "Abrindo PDF…" : "Adicionar PDF"}
                    </Button>
                    <input
                      ref={input}
                      type="file"
                      className="hidden"
                      accept=".pdf,application/pdf"
                      aria-label="Adicionar laudo à preparação"
                      onChange={(event) => {
                        void attach(event.target.files?.[0]);
                      }}
                    />
                  </div>
                  {error && (
                    <p role="alert" className="mt-2 text-sm text-destructive">
                      {error}
                    </p>
                  )}
                </div>
                <PreparationSendPanel
                  orders={care.data?.orders ?? []}
                  notes={draft}
                  audios={audios}
                  documents={documents}
                  recording={activeRecording !== null}
                  onSent={() => {
                    setSaved({ ...draft });
                    void care.refresh();
                  }}
                />
              </form>
              <aside className="patient-consultation-tips surface p-6">
                <ClipboardList className="size-6 text-brand-deep" />
                <h2 className="mt-4 text-lg font-semibold">Antes da consulta</h2>
                <ul className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
                  <li>Tenha seus exames e laudos em mãos.</li>
                  <li>Confira os medicamentos e suplementos que usa.</li>
                  <li>Liste suas principais dúvidas.</li>
                </ul>
                <p className="mt-6 border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">
                  Ouça seus áudios e confira os anexos antes de enviar. As respostas só chegam à
                  caixa médica quando você confirma o envio. Este espaço não é um canal de
                  atendimento.
                </p>
                {saved && (
                  <Button
                    variant="outline"
                    className="mt-4"
                    disabled={JSON.stringify(saved) !== JSON.stringify(draft)}
                    onClick={() => window.print()}
                  >
                    Imprimir preparação
                  </Button>
                )}
              </aside>
              {saved && (
                <article className="patient-preparation-print hidden">
                  <h2 className="text-xl font-semibold">
                    Preparação para consulta · Mariana Oliveira
                  </h2>
                  <p className="mt-2 text-sm">Anotações pessoais · exemplo fictício</p>
                  {[
                    { title: "Como tenho me sentido", text: saved.symptoms },
                    { title: "Medicamentos e suplementos", text: saved.medicines },
                    { title: "Minhas perguntas", text: saved.questions },
                  ].map((item) => (
                    <section className="mt-6" key={item.title}>
                      <h3 className="font-semibold">{item.title}</h3>
                      <p className="mt-2 whitespace-pre-wrap break-words">
                        {item.text || "Não informado."}
                      </p>
                    </section>
                  ))}
                </article>
              )}
            </div>
          )}
          {section === "profile" && (
            <section className="surface max-w-2xl p-6">
              <h2 className="font-display text-xl font-semibold">Seus dados</h2>
              <div className="mt-5 rounded-xl bg-muted/50 p-4">
                <p className="font-medium">Mariana Oliveira</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Nascimento: 14/03/1994 · perfil fictício
                </p>
              </div>
              <form
                className="mt-6 space-y-5"
                onSubmit={(event) => {
                  event.preventDefault();
                  setProfileSaved(true);
                }}
              >
                <div>
                  <label htmlFor="profile-email" className="label">
                    E-mail de contato
                  </label>
                  <Input
                    id="profile-email"
                    type="email"
                    required
                    value={profile.email}
                    onChange={(event) => {
                      setProfile({ ...profile, email: event.target.value });
                      setProfileSaved(false);
                    }}
                  />
                </div>
                <div>
                  <label htmlFor="profile-phone" className="label">
                    Telefone
                  </label>
                  <Input
                    id="profile-phone"
                    type="tel"
                    value={profile.phone}
                    onChange={(event) => {
                      setProfile({ ...profile, phone: event.target.value });
                      setProfileSaved(false);
                    }}
                    placeholder="(11) 99999-9999"
                  />
                </div>
                <Button>Salvar contato nesta sessão</Button>
                {profileSaved && (
                  <p role="status" className="text-sm text-brand-deep">
                    Contato atualizado nesta sessão.
                  </p>
                )}
              </form>
              <p className="mt-6 text-xs text-muted-foreground">
                Este cadastro demonstrativo não altera os dados na área médica nem as credenciais de
                acesso.
              </p>
            </section>
          )}
          <footer className="border-t border-border pt-5 text-xs leading-relaxed text-muted-foreground">
            Ambiente demonstrativo · documentos e anotações são perdidos ao atualizar ou sair desta
            página.{" "}
            <Link to="/acesso-paciente" className="text-brand-deep underline">
              Sobre o acesso
            </Link>
          </footer>
        </main>
      </div>
    </div>
  );
}
