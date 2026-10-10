import { useState } from "react";
import { ArrowRight, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { listRealAgenda, getWorkspacePreference } from "@/lib/real-workspace";
import { getAccountSession } from "@/lib/account-session";
import { patientPreferencesSchema } from "@/lib/real-workspace-contract";
import { listRealGenetics } from "@/lib/real-complements";
import { accountReturns } from "@/lib/account-care-adapters";
import type { ConsultationEntry } from "@/lib/real-consultation-contract";
import type { MedicalResult } from "@/lib/medical-reports";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PatientPlannedReturns } from "./PlannedReturns";
import type { Section } from "./patient-navigation";
const destination = (e: ConsultationEntry): Section =>
  e.kind === "order"
    ? "orders"
    : e.kind === "return"
      ? "agenda"
      : e.kind === "guidance"
        ? e.payload.category === "Preparo dos exames"
          ? "preparation"
          : "guidance"
        : "consultation";
export function AccountPatientCare({
  mode,
  patientId,
  doctorName,
  entries,
  results,
  localDocuments,
  saved,
  onOpen,
  refresh,
  primaryOnly = false,
}: {
  mode: "next" | "guidance" | "preparation" | "timeline";
  patientId: string;
  doctorName: string;
  entries: ConsultationEntry[];
  results: MedicalResult[];
  localDocuments: { id: string; name: string; createdAt?: string }[];
  saved: boolean;
  onOpen: (section: Section) => void;
  refresh: () => Promise<unknown>;
  primaryOnly?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Todos");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const account = useQuery({ queryKey: ["workspace-account"], queryFn: () => getAccountSession() });
  const preferences = useQuery({
    queryKey: ["account-preference", account.data?.userId, "patient"],
    queryFn: () => getWorkspacePreference({ data: { kind: "patient" } }),
    enabled: Boolean(account.data),
    retry: false,
  });
  const parsed = patientPreferencesSchema.safeParse(preferences.data);
  const progress = parsed.success ? (parsed.data.progress ?? []) : [];
  const agenda = useQuery({
    queryKey: ["account-care-agenda", patientId],
    queryFn: () => listRealAgenda({ data: { patientId } }),
    enabled: mode === "timeline",
    retry: false,
  });
  const genetics = useQuery({
    queryKey: ["account-care-genetics", patientId],
    queryFn: () => listRealGenetics({ data: { patientId } }),
    enabled: mode === "timeline",
    retry: false,
  });
  const orders = entries.filter((e) => e.kind === "order" && e.status === "published");
  const submissions = entries.filter((e) => e.kind === "preparation");
  const guidance = entries.filter((e) => e.kind === "guidance" && e.status === "published");
  const guides = guidance.filter((e) =>
    mode === "preparation"
      ? e.payload.category === "Preparo dos exames" &&
        orders.some((o) => o.id === e.payload.orderId)
      : e.payload.category !== "Preparo dos exames",
  );
  const steps: { title: string; detail: string; destination: Section }[] = [];
  const collections = new Map<string, MedicalResult[]>();
  for (const row of results)
    collections.set(row.collection_date, [...(collections.get(row.collection_date) ?? []), row]);
  const returns = entries.filter((e) => e.kind === "return" && e.status === "published");
  if (returns.length)
    steps.push({
      title: "Organize seu retorno planejado",
      detail: `${returns[0]!.payload.title} · ${returns[0]!.payload.date.split("-").reverse().join("/")}. Confirme o atendimento com o consultório.`,
      destination: "guidance",
    });
  const pendingOrders = orders.filter(
    (o) => !progress.some((p) => p.patientId === patientId && p.orderId === o.id && p.performedOn),
  );
  const awaitingPdfs = orders.filter(
    (o) =>
      progress.some((p) => p.patientId === patientId && p.orderId === o.id && p.performedOn) &&
      !submissions.some(
        (s) => s.payload.orderId === o.id && (s.payload.document || s.payload.documents.length),
      ),
  );
  if (awaitingPdfs.length)
    steps.push({
      title: "Envie os resultados dos exames realizados",
      detail: `${awaitingPdfs.length} pedido(s) com realização informada e ainda sem PDF enviado ao médico.`,
      destination: "orders",
    });
  if (pendingOrders.length)
    steps.push({
      title: "Confira os exames solicitados",
      detail: `${pendingOrders.length} pedido(s) liberado(s) aguardando realização. Confira os exames e combine a coleta com o laboratório.`,
      destination: "orders",
    });
  if (
    orders.some(
      (o) =>
        !guidance.some(
          (g) => g.payload.category === "Preparo dos exames" && g.payload.orderId === o.id,
        ),
    )
  )
    steps.push({
      title: "Confirme o preparo com a unidade escolhida",
      detail:
        "Ainda há pedidos sem instrução publicada. Confira o preparo com o laboratório e com seu médico.",
      destination: "preparation",
    });
  if (localDocuments.length)
    steps.push({
      title: "Confira os documentos deste navegador",
      detail: `${localDocuments.length} PDF(s) local(is), ainda sem confirmar envio ao médico.`,
      destination: "consultation",
    });
  if (!submissions.length)
    steps.push({
      title: saved ? "Revise e envie sua preparação" : "Prepare sua próxima conversa com o médico",
      detail:
        "Escreva ou grave como está se sentindo, medicamentos e perguntas. Você escolhe quando enviar.",
      destination: "consultation",
    });
  if (submissions.some((e) => e.status !== "reviewed"))
    steps.push({
      title: "Acompanhe a revisão do seu envio",
      detail: "Há informações recebidas que ainda aguardam revisão médica.",
      destination: "timeline",
    });
  if (guides.length)
    steps.push({
      title: "Leia as orientações liberadas",
      detail: `${guides.length} orientação(ões) publicada(s) pelo médico para você.`,
      destination: "guidance",
    });
  const timeline = [
    ...entries.map((e) => ({
      id: e.id,
      at: e.updated_at,
      title: e.payload.title,
      detail: e.payload.text || e.payload.symptoms || e.payload.exams.join(" · "),
      destination: destination(e),
      source:
        e.status === "cancelled"
          ? "Cancelado / retirado"
          : e.status === "reviewed"
            ? "Revisado pelo médico"
            : "Registro publicado no prontuário",
    })),
    ...[...collections].map(([date, rows]) => ({
      id: `collection-${date}`,
      at: date + "T12:00:00",
      title: "Resultados da coleta",
      detail: rows?.map((r) => `${r.name}: ${r.value} ${r.unit}`).join(" · ") ?? "",
      destination: "history" as Section,
      source: "Coleta do seu histórico",
    })),
    ...localDocuments.map((d) => ({
      id: `local-${d.id}`,
      at: d.createdAt ?? "",
      title: "PDF adicionado neste navegador",
      detail: d.name,
      destination: "documents" as Section,
      source: "Documento local · ainda não confirma envio",
    })),
    ...(agenda.data ?? []).map((e) => ({
      id: `agenda-${e.id}`,
      at: e.updatedAt,
      title: e.title,
      detail: `${e.date.split("-").reverse().join("/")} · ${e.status}${e.reason ? " · " + e.reason : ""}`,
      destination: "agenda" as Section,
      source: "Agenda compartilhada",
    })),
    ...(genetics.data ?? []).map((e) => ({
      id: `genetics-${e.id}`,
      at: e.created_at,
      title: "Arquivo genético importado",
      detail: e.filename,
      destination: "genetics" as Section,
      source: e.reviewed_at ? "Revisado pelo médico" : "Aguardando revisão",
    })),
  ]
    .filter(
      (e) =>
        (filter === "Todos" || e.destination === filter) &&
        `${e.title} ${e.detail}`
          .toLocaleLowerCase("pt-BR")
          .includes(search.toLocaleLowerCase("pt-BR")),
    )
    .sort((a, b) => b.at.localeCompare(a.at));
  return (
    <div className="space-y-5">
      {!primaryOnly && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Dados do seu prontuário · atualização automática a cada 30 segundos.
          </p>
          <Button
            variant="outline"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                await refresh();
                if (mode === "timeline") await Promise.all([agenda.refetch(), genetics.refetch()]);
              } catch {
                setError("Não foi possível atualizar. Tente novamente.");
              } finally {
                setBusy(false);
              }
            }}
          >
            <RefreshCw />
            Atualizar acompanhamento
          </Button>
        </div>
      )}
      {(error || (mode === "timeline" && (agenda.error || genetics.error))) && (
        <p role="alert" className="text-sm text-destructive">
          {error || agenda.error?.message || genetics.error?.message}
        </p>
      )}
      {mode === "next" && (
        <section className="surface p-6">
          <div className="flex flex-wrap justify-between gap-4">
            <h2 className="font-display text-xl font-semibold">
              {primaryOnly ? "Por onde começar" : "Seus próximos passos"}
            </h2>
            <span className="text-xs text-muted-foreground">Com base no seu acompanhamento</span>
          </div>
          <div className="mt-5 space-y-3">
            {(primaryOnly ? steps.slice(0, 1) : steps).map((s, i) => (
              <button
                key={s.title}
                onClick={() => onOpen(s.destination)}
                className={`flex w-full items-start gap-4 rounded-xl border p-4 text-left hover:bg-brand-soft/40 ${i === 0 ? "border-brand/40 bg-brand-soft" : "border-border"}`}
              >
                <span className="min-w-0 flex-1">
                  {i === 0 && (
                    <span className="mb-2 block text-xs font-semibold uppercase text-brand-deep">
                      Seu próximo passo
                    </span>
                  )}
                  <span className="block text-sm font-semibold">{s.title}</span>
                  <span className="mt-2 block text-xs leading-relaxed text-muted-foreground">
                    {s.detail}
                  </span>
                </span>
                <ArrowRight className="size-4 shrink-0 text-brand-deep" />
              </button>
            ))}
            {primaryOnly && steps.length > 1 && (
              <Button variant="outline" onClick={() => onOpen("next")}>
                Ver todos os próximos passos ({steps.length})
              </Button>
            )}
            {!steps.length && (
              <p className="text-sm text-muted-foreground">
                Sem pendências identificadas neste acompanhamento. Consulte sua linha do tempo.
              </p>
            )}
          </div>
        </section>
      )}
      {(mode === "guidance" || mode === "preparation") && (
        <>
          {mode === "guidance" && (
            <PatientPlannedReturns
              records={accountReturns(entries, doctorName).filter((r) => r.publishedAt)}
            />
          )}
          <p className="rounded-xl border bg-white p-4 text-sm text-muted-foreground">
            {mode === "preparation"
              ? "O preparo depende do exame, da unidade e das suas condições. As instruções aparecem quando o médico publica uma fonte conferida para um pedido ativo."
              : "Aqui aparecem apenas textos que o médico revisou e publicou para você. Uma revisão de envio não produz uma orientação automática."}
          </p>
          {guides.map((e) => (
            <article key={e.id} className="surface p-5">
              <p className="eyebrow">{e.payload.category}</p>
              <h3 className="mt-3 font-display text-lg font-semibold">{e.payload.title}</h3>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{e.payload.text}</p>
              <p className="mt-4 border-t pt-3 text-xs text-muted-foreground">
                Publicado após revisão por {doctorName} ·{" "}
                {new Date(e.updated_at).toLocaleString("pt-BR")}
              </p>
              {e.payload.sourceName && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Fonte informada pelo médico: {e.payload.sourceName} · {e.payload.sourceDate}
                </p>
              )}
              {e.payload.sourceUrl && (
                <a
                  href={e.payload.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block text-xs text-brand-deep underline"
                >
                  Consultar fonte original
                </a>
              )}
            </article>
          ))}
          {!guides.length && (
            <section className="surface p-8">
              <h2 className="text-lg font-semibold">
                {mode === "preparation"
                  ? "Preparo ainda não informado"
                  : "Nenhuma orientação liberada"}
              </h2>
              <p className="mt-3 text-sm text-muted-foreground">
                {mode === "preparation"
                  ? "Confirme as instruções com a unidade escolhida e com o médico. Nenhuma instrução de jejum ou alteração de medicação é criada automaticamente."
                  : "Quando o médico publicar uma orientação, ela aparecerá aqui e você receberá um aviso no portal."}
              </p>
              <Button
                className="mt-5"
                variant="outline"
                onClick={() => onOpen(mode === "preparation" ? "favorites" : "consultation")}
              >
                {mode === "preparation"
                  ? "Consultar meus locais favoritos"
                  : "Preparar minhas perguntas"}
                <ArrowRight />
              </Button>
            </section>
          )}
        </>
      )}
      {mode === "timeline" && (
        <>
          <div className="flex flex-wrap gap-3">
            <Input
              aria-label="Pesquisar linha do tempo"
              placeholder="Buscar pedidos, envios e revisões…"
              className="sm:max-w-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              aria-label="Filtrar linha do tempo"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="h-10 rounded-md border bg-white px-3 text-sm"
            >
              <option>Todos</option>
              {[
                ["orders", "Pedidos"],
                ["consultation", "Envios recebidos"],
                ["guidance", "Revisões e orientações"],
                ["preparation", "Preparo publicado"],
                ["documents", "Documentos locais"],
                ["history", "Coletas do histórico"],
                ["genetics", "Arquivos genéticos brutos"],
                ["agenda", "Agenda e retornos"],
              ].map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="surface p-6">
            {timeline.map((e) => (
              <article key={e.id} className="relative border-l border-brand/30 pb-7 pl-6">
                <span className="absolute -left-1.5 top-1 size-3 rounded-full bg-brand" />
                <p className="text-xs text-muted-foreground">
                  {e.at ? new Date(e.at).toLocaleString("pt-BR") : "Data local não informada"}
                </p>
                <h3 className="mt-2 text-sm font-semibold">{e.title}</h3>
                <p className="mt-2 break-words text-sm text-muted-foreground">{e.detail}</p>
                <p className="mt-2 text-[11px] text-muted-foreground">{e.source}</p>
                <Button
                  size="sm"
                  variant="ghost"
                  className="mt-2"
                  onClick={() => onOpen(e.destination)}
                >
                  Abrir detalhe <ArrowRight />
                </Button>
              </article>
            ))}
            {!timeline.length && (
              <p className="text-sm text-muted-foreground">
                Nenhum evento encontrado para este filtro.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
