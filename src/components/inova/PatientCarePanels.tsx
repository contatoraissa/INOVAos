import { useState } from "react";
import { ArrowRight, Bell, Check, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { readCareEvents, removeFavoriteLab } from "@/lib/care";
import type { CareDestination, MedicalGuidance } from "@/lib/care-contract";
import type { PatientCareData } from "./usePatientCare";
import { PatientPlannedReturns } from "./PlannedReturns";
import { localDay } from "@/lib/return-contract";
import { S2FavoriteDemo } from "./S2FavoriteDemo";
import { patientHistoryById } from "@/data/demo";
const when = (date: string) =>
  new Date(date).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
function GuidanceCard({ item }: { item: MedicalGuidance }) {
  return (
    <article className="surface p-5">
      <p className="eyebrow">{item.category}</p>
      <h3 className="mt-3 font-display text-lg font-semibold">{item.title}</h3>
      <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed">{item.text}</p>
      <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
        Publicado após revisão por {item.doctorName} · {when(item.publishedAt!)} · demonstração
      </p>
      {item.sourceName && (
        <div className="mt-3 text-xs text-muted-foreground">
          <p>
            Fonte informada pelo médico: {item.sourceName}
            {item.sourceDate
              ? ` · atualização da fonte: ${item.sourceDate.split("-").reverse().join("/")}`
              : ""}
          </p>
          {item.sourceUrl && (
            <a
              href={item.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block text-brand-deep underline"
            >
              Consultar fonte original
            </a>
          )}
        </div>
      )}
    </article>
  );
}
export function PatientNextSteps({
  data,
  localDocuments,
  saved,
  onOpen,
  primaryOnly = false,
}: {
  primaryOnly?: boolean;
  data: PatientCareData;
  localDocuments: number;
  saved: boolean;
  onOpen: (section: CareDestination | "next") => void;
}) {
  const active = data.orders.filter((order) => order.status === "released");
  const pending = data.submissions.filter((item) => !item.reviewed);
  const performed = active.filter((order) =>
    data.progress.some((item) => item.orderId === order.id && item.performedOn),
  );
  const steps: { title: string; detail: string; destination: CareDestination }[] = [];
  const withoutPreparation = active.filter(
    (order) =>
      !data.guidance.some(
        (item) => item.category === "Preparo dos exames" && item.orderId === order.id,
      ),
  );
  const withoutReport = performed.filter(
    (order) => !data.submissions.some((item) => item.orderId === order.id && item.documents.length),
  );
  const generalGuidance = data.guidance.filter((item) => item.category !== "Preparo dos exames");
  const planned = data.returns?.find((item) => item.publishedAt && !item.cancelledAt);
  if (planned)
    steps.push({
      title:
        planned.targetDate < localDay()
          ? "Confirme o retorno com o consultório"
          : "Organize seu retorno planejado",
      detail: `${planned.title} · ${planned.targetDate.split("-").reverse().join("/")}. Esta orientação não confirma uma consulta agendada.`,
      destination: "guidance",
    });
  if (active.length > performed.length)
    steps.push({
      title: "Confira os exames solicitados",
      detail: `${active.length - performed.length} pedido(s) sem realização informada. Escolha sua preferência de laboratório e confira as opções externas.`,
      destination: "orders",
    });
  if (withoutPreparation.length)
    steps.push({
      title: "Confirme o preparo com a unidade escolhida",
      detail:
        "Ainda não há instrução publicada para esses pedidos. Não altere medicamentos nem faça jejum por conta de um nome de exame.",
      destination: "preparation",
    });
  if (withoutReport.length)
    steps.push({
      title: "Adicione o laudo quando estiver disponível",
      detail: `${withoutReport.length} pedido(s) realizados sem laudo vinculado. Adicione o PDF e selecione o pedido ao enviar sua preparação.`,
      destination: "consultation",
    });
  if (localDocuments)
    steps.push({
      title: "Confira os documentos desta sessão",
      detail: `${localDocuments} PDF(s) local(is). A adição ao portal não confirma envio; confira os anexos em Preparar consulta.`,
      destination: "consultation",
    });
  if (!data.submissions.length)
    steps.push({
      title: saved ? "Revise e envie sua preparação" : "Prepare sua próxima conversa com o médico",
      detail:
        "Escreva ou grave como está se sentindo, medicamentos e perguntas. Você escolhe quando enviar.",
      destination: "consultation",
    });
  if (pending.length)
    steps.push({
      title: "Acompanhe a revisão do seu envio",
      detail: `${pending.length} envio(s) aguardando revisão na caixa médica. Recebido não significa atendimento concluído.`,
      destination: "timeline",
    });
  if (generalGuidance.length)
    steps.push({
      title: "Leia as orientações liberadas",
      detail: `${generalGuidance.length} orientação(ões) publicada(s) pelo médico para você.`,
      destination: "guidance",
    });
  return (
    <section className="surface p-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-display text-xl font-semibold">
          {primaryOnly ? "Por onde começar" : "Seus próximos passos"}
        </h2>
        <span className="text-xs text-muted-foreground">Com base no seu acompanhamento</span>
      </div>
      <div className="mt-5 space-y-3">
        {(primaryOnly ? steps.slice(0, 1) : steps).map((step, index) => (
          <button
            key={step.title}
            onClick={() => onOpen(step.destination)}
            className={`flex w-full items-start gap-4 rounded-xl border p-4 text-left hover:bg-brand-soft/40 ${index === 0 ? "border-brand/40 bg-brand-soft" : "border-border"}`}
          >
            <span className="min-w-0 flex-1">
              {index === 0 && (
                <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-brand-deep">
                  Seu próximo passo
                </span>
              )}
              <span className="block text-sm font-semibold">{step.title}</span>
              <span className="mt-2 block text-xs leading-relaxed text-muted-foreground">
                {step.detail}
              </span>
            </span>
            <ArrowRight className="mt-1 size-4 shrink-0 text-brand-deep" />
          </button>
        ))}
        {primaryOnly && steps.length > 1 && (
          <Button variant="outline" onClick={() => onOpen("next")}>
            Ver todos os próximos passos ({steps.length})
          </Button>
        )}
        {!steps.length && (
          <p className="text-sm text-muted-foreground">
            Sem pendências identificadas neste acompanhamento. Você pode consultar sua linha do
            tempo.
          </p>
        )}
      </div>
    </section>
  );
}
export function PatientCarePanels({
  mode,
  data,
  refresh,
  onOpen,
  localDocuments,
  saved,
}: {
  mode: "next" | "alerts" | "guidance" | "preparation" | "favorites" | "timeline";
  data: PatientCareData;
  refresh: () => Promise<void>;
  onOpen: (section: CareDestination | "next") => void;
  localDocuments: { id: string; name: string; createdAt: string }[];
  saved: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("Todos");
  async function act(task: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await task();
      await refresh();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Não foi possível atualizar. Tente novamente.",
      );
    } finally {
      setBusy(false);
    }
  }
  const unread = data.events.filter((item) => !item.read);
  const guides = data.guidance.filter((item) =>
    mode === "preparation"
      ? item.category === "Preparo dos exames" &&
        data.orders.some((order) => order.id === item.orderId && order.status === "released")
      : item.category !== "Preparo dos exames",
  );
  const timeline = [
    ...data.events.map((item) => ({
      ...item,
      displayAt: when(item.at),
      source: "Evento registrado no servidor",
    })),
    ...localDocuments.map((item) => ({
      id: `local-${item.id}`,
      at: item.createdAt,
      displayAt: when(item.createdAt),
      title: "PDF adicionado nesta sessão",
      detail: `${item.name} · adicionado localmente, sem confirmar envio ao médico.`,
      destination: "documents" as CareDestination,
      source: "Documento local",
    })),
    ...(patientHistoryById["mariana-oliveira"]?.history ?? []).map((item) => {
      const [month, year] = item.period.split("/");
      const months = [
        "Jan",
        "Fev",
        "Mar",
        "Abr",
        "Mai",
        "Jun",
        "Jul",
        "Ago",
        "Set",
        "Out",
        "Nov",
        "Dez",
      ];
      return {
        id: `history-${item.period}`,
        at: `20${year}-${String(months.indexOf(month ?? "") + 1).padStart(2, "0")}`,
        displayAt: `Coleta ${item.period} · dia não informado`,
        title: "Resultados da coleta · exemplo fictício",
        detail: `Glicemia: ${item.glicemia} mg/dL · LDL: ${item.ldl} mg/dL. Consulte todos os valores em Minha evolução.`,
        destination: "history" as CareDestination,
        source: "Histórico demonstrativo pré-existente",
      };
    }),
  ]
    .filter(
      (item) =>
        (filter === "Todos" || item.destination === filter) &&
        `${item.title} ${item.detail}`.toLowerCase().includes(query.toLowerCase()),
    )
    .sort((a, b) => b.at.localeCompare(a.at));
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Dados demonstrativos · atualização automática a cada 30 segundos enquanto esta aba está
          visível.
        </p>
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => {
            void act(async () => {});
          }}
        >
          <RefreshCw />
          Atualizar acompanhamento
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {mode === "next" && (
        <PatientNextSteps
          data={data}
          localDocuments={localDocuments.length}
          saved={saved}
          onOpen={onOpen}
        />
      )}
      {mode === "alerts" && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-xl font-semibold">{unread.length} aviso(s) não lido(s)</h2>
            <Button
              variant="outline"
              disabled={busy || !unread.length}
              onClick={() => {
                void act(() =>
                  readCareEvents({
                    data: {
                      patientId: "mariana-oliveira",
                      ids: unread.slice(0, 100).map((item) => item.id),
                    },
                  }),
                );
              }}
            >
              Marcar avisos como lidos
            </Button>
          </div>
          {data.events.map((item) => (
            <article key={item.id} className={`surface p-5 ${!item.read ? "border-brand/30" : ""}`}>
              <div className="flex items-start gap-3">
                <Bell className="mt-1 size-4 shrink-0 text-brand-deep" />
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{item.detail}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {when(item.at)} · {item.read ? "Lido" : "Novo"}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        onOpen(item.destination);
                        void act(() =>
                          readCareEvents({
                            data: { patientId: "mariana-oliveira", ids: [item.id] },
                          }),
                        );
                      }}
                    >
                      Ver acompanhamento
                    </Button>
                    {!item.read && (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={() => {
                          void act(() =>
                            readCareEvents({
                              data: { patientId: "mariana-oliveira", ids: [item.id] },
                            }),
                          );
                        }}
                      >
                        <Check className="size-3" />
                        Marcar como lido
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </article>
          ))}
          {!data.events.length && (
            <p className="surface p-8 text-sm text-muted-foreground">
              Nenhum aviso registrado. Pedidos liberados, envios recebidos, revisões e orientações
              publicadas aparecerão aqui.
            </p>
          )}
        </>
      )}
      {(mode === "guidance" || mode === "preparation") && (
        <>
          {mode === "guidance" && <PatientPlannedReturns records={data.returns ?? []} />}
          <p className="rounded-xl border border-border bg-white p-4 text-sm leading-relaxed text-muted-foreground">
            {mode === "preparation"
              ? "O preparo depende do exame, da unidade e das suas condições. Instruções abaixo só aparecem quando o médico publica uma fonte conferida para um pedido ativo. A integração com os laboratórios da S2 ainda não fornece instruções."
              : "Aqui aparecem apenas textos que o médico revisou e publicou para você. Uma revisão de envio, por si só, não produz uma orientação automática."}
          </p>
          {guides.map((item) => (
            <GuidanceCard key={item.id} item={item} />
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
                  ? "Confirme as instruções com a unidade escolhida e com o médico. Não há instrução de jejum, coleta ou mudança de medicação criada automaticamente aqui."
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
      {mode === "favorites" && (
        <>
          <S2FavoriteDemo
            favoriteNames={data.favorites.map((item) => item.name)}
            onSaved={async () => {
              await refresh();
            }}
            onOrders={() => onOpen("orders")}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            {data.favorites.map((item) => (
              <article key={item.id} className="surface p-5">
                <h3 className="text-base font-semibold">{item.name}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.address}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  CEP: {item.cep.slice(0, 5)}-{item.cep.slice(5)}
                </p>
                <p className="mt-3 text-xs text-muted-foreground">
                  Preferência cadastrada por você · sem confirmação de parceria
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  {item.website && (
                    <a
                      href={item.website}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-medium text-brand-deep underline"
                    >
                      Abrir site informado
                    </a>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => {
                      void act(() =>
                        removeFavoriteLab({ data: { id: item.id, patientId: "mariana-oliveira" } }),
                      );
                    }}
                  >
                    <Trash2 className="size-3" />
                    Remover favorito
                  </Button>
                </div>
              </article>
            ))}
          </div>
          {!data.favorites.length && (
            <p className="text-sm text-muted-foreground">Nenhum laboratório favorito cadastrado.</p>
          )}
        </>
      )}
      {mode === "timeline" && (
        <>
          <div className="flex flex-wrap gap-3">
            <Input
              aria-label="Pesquisar linha do tempo"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar pedidos, envios e revisões…"
              className="sm:max-w-sm"
            />
            <select
              aria-label="Filtrar linha do tempo"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              className="h-10 rounded-md border border-border bg-white px-3 text-sm"
            >
              <option>Todos</option>
              <option value="orders">Pedidos e realização informada</option>
              <option value="consultation">Envios recebidos</option>
              <option value="guidance">Revisões e orientações</option>
              <option value="preparation">Preparo publicado</option>
              <option value="documents">Documentos locais</option>
              <option value="history">Coletas do histórico</option>
              <option value="genetics">Arquivos genéticos brutos</option>
            </select>
          </div>
          <div className="surface p-6">
            {timeline.map((item) => (
              <article key={item.id} className="relative border-l border-brand/30 pb-7 pl-6">
                <span className="absolute -left-1.5 top-1 size-3 rounded-full bg-brand" />
                <p className="text-xs text-muted-foreground">{item.displayAt}</p>
                <h3 className="mt-2 text-sm font-semibold">{item.title}</h3>
                <p className="mt-2 break-words text-sm text-muted-foreground">{item.detail}</p>
                <p className="mt-2 text-[11px] text-muted-foreground">{item.source}</p>
                <Button
                  size="sm"
                  variant="ghost"
                  className="mt-2"
                  onClick={() => onOpen(item.destination)}
                >
                  Abrir detalhe <ArrowRight className="size-3" />
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
