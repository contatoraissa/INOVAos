import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, ClipboardList, Download, MapPin, RefreshCw } from "lucide-react";
import {
  createRealAgendaEvent,
  getWorkspacePreference,
  saveWorkspacePreference,
} from "@/lib/real-workspace";
import { patientPreferencesSchema } from "@/lib/real-workspace-contract";
import type { ConsultationEntry } from "@/lib/real-consultation-contract";
import { createSessionId } from "@/lib/session-id";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "./Page";
export function AccountPatientOrders({
  patientId,
  userId,
  email,
  doctorName,
  entries,
  onPrepare,
  onOpen,
  compact = false,
  refresh,
}: {
  patientId: string;
  userId: string;
  email: string;
  doctorName: string;
  entries: ConsultationEntry[];
  onPrepare: (orderId: string) => void;
  onOpen: (section: "orders" | "preparation" | "favorites") => void;
  compact?: boolean;
  refresh: () => Promise<unknown>;
}) {
  const cache = useQueryClient();
  const preference = useQuery({
    queryKey: ["account-preference", userId, "patient"],
    queryFn: () => getWorkspacePreference({ data: { kind: "patient" } }),
    retry: false,
  });
  const parsed = patientPreferencesSchema.safeParse(preference.data);
  const prefs = parsed.success ? parsed.data : { phone: "", email, favorites: [], progress: [] };
  const orders = entries.filter(
    (e) => e.kind === "order" && ["published", "cancelled"].includes(e.status),
  );
  const active = orders.filter((e) => e.status === "published");
  const [selection, setSelection] = useState("");
  const [collecting, setCollecting] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [requestId, setRequestId] = useState("");
  const [performed, setPerformed] = useState<string | null>(null);
  const [lab, setLab] = useState<string | null>(null);
  const order = orders.find((e) => e.id === selection) ?? orders[0];
  const progress = prefs.progress?.find(
    (p) => p.patientId === patientId && p.orderId === order?.id,
  );
  function choose(id: string) {
    setSelection(id);
    setPerformed(null);
    setLab(null);
    setCollecting("");
    setMessage("");
    setError("");
  }
  function download() {
    if (!order) return;
    const text = `INOVA · lista de exames\n${doctorName}\n${order.payload.title}\n\n${order.payload.exams.join("\n")}\n\n${order.payload.text}\n\nLista informativa do prontuário, sem assinatura eletrônica.`;
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "INOVA_lista_exames.txt";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function act(run: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await run();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível atualizar.");
    } finally {
      setBusy(false);
    }
  }
  function collect(id: string) {
    setCollecting(id);
    setRequestId(createSessionId().replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, "$1-$2-$3-$4-$5"));
    setError("");
  }
  const collection = (id: string) => (
    <form
      className="space-y-3 rounded-xl bg-muted/30 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        void act(async () => {
          await createRealAgendaEvent({
            data: {
              patientId,
              requestId,
              title: `Coleta: ${orders.find((o) => o.id === id)?.payload.title ?? "exames"}`.slice(
                0,
                120,
              ),
              kind: "Exame",
              date,
              time,
              status: "Proposto",
              notes: "Data de coleta informada pelo paciente. Conferir com o laboratório.",
              orderId: id,
            },
          });
          setMessage("Coleta proposta na agenda compartilhada. O médico receberá um aviso.");
          setCollecting("");
          window.dispatchEvent(new Event("focus"));
        });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          Data combinada
          <Input type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="text-sm">
          Horário
          <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </label>
      </div>
      <Button disabled={busy}>Salvar coleta na agenda</Button>
      <Button type="button" variant="ghost" onClick={() => setCollecting("")}>
        Cancelar
      </Button>
    </form>
  );
  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
            <ClipboardList className="size-5 text-brand" />
            {compact ? "Seus exames solicitados" : "Exames solicitados pelo seu médico"}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Confira o pedido e os valores. A coleta entra na agenda quando você informa a data
            combinada com o laboratório.
          </p>
        </div>
        {!compact && (
          <Button variant="outline" disabled={busy} onClick={() => void act(refresh)}>
            <RefreshCw />
            Atualizar pedidos
          </Button>
        )}
      </div>
      {(error || preference.error) && (
        <p role="alert" className="surface p-4 text-sm text-destructive">
          {error || preference.error?.message}
        </p>
      )}
      {message && (
        <p role="status" className="rounded-xl bg-brand-soft p-4 text-sm text-brand-deep">
          {message}
        </p>
      )}
      {compact ? (
        <div className="surface space-y-3 p-5">
          {active.length ? (
            active.map((o) => (
              <article key={o.id} className="space-y-3 rounded-xl border p-4">
                <h3 className="text-sm font-semibold">{o.payload.title}</h3>
                <p className="text-sm">{o.payload.exams.join(" · ")}</p>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => onOpen("orders")}>
                    Ver pedido e valores <ArrowRight />
                  </Button>
                  <Button variant="outline" onClick={() => collect(o.id)}>
                    Informar data da coleta
                  </Button>
                  <Button variant="outline" onClick={() => onPrepare(o.id)}>
                    Enviar resultado ao médico
                  </Button>
                </div>
                {collecting === o.id && collection(o.id)}
              </article>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhum pedido liberado aguardando realização.
            </p>
          )}
        </div>
      ) : !order ? (
        <EmptyState
          title="Nenhum pedido liberado"
          text="Os exames aparecerão aqui quando seu médico revisar e liberar o pedido."
        />
      ) : (
        <div className="grid items-start gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="surface space-y-3 p-4">
            {orders.map((o) => (
              <button
                key={o.id}
                onClick={() => choose(o.id)}
                className={`w-full rounded-xl border p-4 text-left ${o.id === order.id ? "border-brand/30 bg-brand-soft" : "border-border"}`}
              >
                <p className="text-sm font-semibold">{o.payload.title}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {o.payload.exams.length} exame(s) ·{" "}
                  {new Date(o.created_at).toLocaleDateString("pt-BR")}
                </p>
                <p className="mt-2 text-xs text-brand-deep">
                  {o.status === "cancelled" ? "Cancelado" : "Liberado ao paciente"}
                </p>
              </button>
            ))}
          </aside>
          <div className="space-y-5">
            <section className="surface p-6">
              <p className="eyebrow">PEDIDO DO SEU MÉDICO</p>
              <h2 className="mt-3 font-display text-xl font-semibold">Exames para realizar</h2>
              <p className="mt-2 text-sm text-muted-foreground">{doctorName}</p>
              {order.status === "cancelled" && (
                <p className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
                  Este pedido foi cancelado pelo médico. A consulta de preços está desativada para
                  ele.
                </p>
              )}
              <ul className="mt-5 space-y-3">
                {order.payload.exams.map((exam) => (
                  <li key={exam} className="rounded-xl bg-muted/40 p-3 text-sm">
                    ✓ {exam}
                  </li>
                ))}
              </ul>
              {order.payload.text && (
                <div className="mt-5 border-t pt-4">
                  <h3 className="text-sm font-semibold">Observações do médico</h3>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                    {order.payload.text}
                  </p>
                </div>
              )}
              <div className="mt-5 flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  disabled={order.status !== "published"}
                  onClick={download}
                >
                  <Download />
                  Baixar lista de exames
                </Button>
                <Button variant="ghost" onClick={() => window.print()}>
                  Imprimir pedido
                </Button>
              </div>
            </section>
            <section className="surface p-6">
              <h2 className="font-display text-lg font-semibold">
                Seu acompanhamento deste pedido
              </h2>
              <form
                className="mt-4 space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  void act(async () => {
                    const value = patientPreferencesSchema.parse({
                      ...prefs,
                      progress: [
                        ...(prefs.progress ?? []).filter(
                          (p) => !(p.patientId === patientId && p.orderId === order.id),
                        ),
                        {
                          patientId,
                          orderId: order.id,
                          preferredLab: lab ?? progress?.preferredLab ?? "",
                          performedOn: performed ?? progress?.performedOn ?? "",
                        },
                      ],
                    });
                    await saveWorkspacePreference({ data: { kind: "patient", value } });
                    await cache.invalidateQueries({
                      queryKey: ["account-preference", userId, "patient"],
                    });
                    setMessage("Acompanhamento salvo na sua conta.");
                  });
                }}
              >
                <label className="block text-sm">
                  Laboratório de preferência (opcional)
                  <select
                    aria-label="Laboratório de preferência"
                    value={lab ?? progress?.preferredLab ?? ""}
                    disabled={busy || order.status !== "published"}
                    onChange={(e) => setLab(e.target.value)}
                    className="mt-2 h-10 w-full rounded-md border bg-white px-3"
                  >
                    <option value="">Ainda não escolhi</option>
                    {prefs.favorites.map((f, i) => (
                      <option key={i} value={f.name}>
                        {f.name} · {f.address}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm">
                  Se já realizou esses exames, informe a data (opcional)
                  <Input
                    aria-label="Data de realização dos exames"
                    type="date"
                    value={performed ?? progress?.performedOn ?? ""}
                    disabled={busy || order.status !== "published"}
                    onChange={(e) => setPerformed(e.target.value)}
                  />
                </label>
                <p className="text-xs text-muted-foreground">
                  Deixe em branco se ainda não realizou. Você pode corrigir ou remover essa
                  informação depois.
                </p>
                <Button disabled={busy || !preference.isSuccess || order.status !== "published"}>
                  Guardar acompanhamento
                </Button>
              </form>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button variant="ghost" size="sm" onClick={() => onOpen("favorites")}>
                  Gerenciar laboratórios favoritos
                </Button>
                <Button variant="ghost" size="sm" onClick={() => onOpen("preparation")}>
                  Consultar preparo dos exames
                </Button>
                <Button variant="outline" size="sm" onClick={() => onPrepare(order.id)}>
                  Enviar resultado PDF ao médico
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={order.status !== "published"}
                  onClick={() => collect(order.id)}
                >
                  Informar data da coleta
                </Button>
              </div>
              {collecting === order.id && <div className="mt-4">{collection(order.id)}</div>}
            </section>
            <section className="surface p-6">
              <div className="flex items-center gap-3">
                <span className="rounded-xl bg-brand-soft p-3 text-brand-deep">
                  <MapPin className="size-5" />
                </span>
                <div>
                  <h2 className="font-display text-lg font-semibold">Consultar valores na S2</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Consulta externa · preços e disponibilidade informados pela S2
                  </p>
                </div>
              </div>
              <p className="mt-5 text-sm text-muted-foreground">
                Escolha o exame para consultar no site da S2. A integração comercial de cotações
                ainda não está conectada ao INOVA.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {order.payload.exams.map((exam) => (
                  <Button
                    key={exam}
                    asChild
                    variant="outline"
                    disabled={order.status !== "published"}
                  >
                    <a
                      href={
                        order.status === "published"
                          ? `https://s2medica.com.br/busca?q=${encodeURIComponent(exam)}`
                          : undefined
                      }
                      target="_blank"
                      rel="noreferrer"
                      aria-disabled={order.status !== "published"}
                      tabIndex={order.status === "published" ? 0 : -1}
                    >
                      Consultar {exam}
                    </a>
                  </Button>
                ))}
              </div>
            </section>
          </div>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        A consulta na S2 não envia seu prontuário nem confirma valores, pagamento ou agendamento no
        INOVA. A lista de exames não inclui assinatura eletrônica.
      </p>
    </section>
  );
}
