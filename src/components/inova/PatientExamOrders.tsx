import { useCallback, useEffect, useState } from "react";
import { ArrowUpRight, Check, Download, MapPin, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getS2Quote, listExamOrders } from "@/lib/exam-orders";
import type { ExamOrder } from "@/lib/exam-order-contract";
import { S2QuoteExplorer } from "./S2QuoteExplorer";
import { saveOrderProgress } from "@/lib/care";
import type { FavoriteLab, OrderProgress } from "@/lib/care-contract";
export function PatientExamOrders({
  initialOrderId,
  onSendResults,
  patientId,
  favorites,
  progress,
  orderSnapshot,
  onCareChange,
  onFavorites,
  onPreparation,
}: {
  initialOrderId?: string | undefined;
  onSendResults: () => void;
  patientId: string;
  favorites: FavoriteLab[];
  progress: OrderProgress[];
  orderSnapshot: ExamOrder[] | undefined;
  onCareChange: () => Promise<void>;
  onFavorites: () => void;
  onPreparation: () => void;
}) {
  const [orders, setOrders] = useState<ExamOrder[]>([]);
  const [selected, setSelected] = useState(initialOrderId ?? "");
  const [cep, setCep] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [lab, setLab] = useState("");
  const [performed, setPerformed] = useState("");
  const [progressMessage, setProgressMessage] = useState("");
  const [quote, setQuote] = useState<{
    orderId: string;
    cep: string;
    message: string;
    prices: Awaited<ReturnType<typeof getS2Quote>>["prices"];
  } | null>(null);
  const refresh = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const result = await listExamOrders({ data: { patientId, audience: "patient" } });
      setOrders(result);
      setSelected((current) =>
        result.some((order) => order.id === current) ? current : (result[0]?.id ?? ""),
      );
    } catch {
      setError("Não foi possível carregar seus pedidos. Confira a conexão e tente novamente.");
    } finally {
      setBusy(false);
    }
  }, [patientId]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  useEffect(() => {
    if (!orderSnapshot) return;
    setOrders(orderSnapshot);
    setSelected((current) =>
      orderSnapshot.some((item) => item.id === current) ? current : (orderSnapshot[0]?.id ?? ""),
    );
    setQuote((current) =>
      current &&
      orderSnapshot.some((item) => item.id === current.orderId && item.status === "released")
        ? current
        : null,
    );
  }, [orderSnapshot]);
  const order = orders.find((item) => item.id === selected);
  const currentProgress = progress.find((item) => item.orderId === selected);
  useEffect(() => {
    setLab(currentProgress?.preferredLabId ?? "");
    setPerformed(currentProgress?.performedOn ?? "");
  }, [selected, currentProgress?.preferredLabId, currentProgress?.performedOn]);
  async function saveProgress(event: React.FormEvent) {
    event.preventDefault();
    if (!order || order.status !== "released" || busy) return;
    setBusy(true);
    setError("");
    setProgressMessage("");
    try {
      await saveOrderProgress({
        data: {
          patientId: "mariana-oliveira",
          orderId: order.id,
          preferredLabId: lab || null,
          performedOn: performed || null,
        },
      });
      await onCareChange();
      const favorite = favorites.find((item) => item.id === lab);
      if (favorite) setCep(favorite.cep);
      setProgressMessage(
        "Acompanhamento salvo. Preferência não é reserva; realização é informação sua, sem confirmação do laboratório.",
      );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Não foi possível guardar o acompanhamento.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function consult(event: React.FormEvent) {
    event.preventDefault();
    if (!order || busy || order.status !== "released") return;
    const normalized = cep.replace(/\D/g, "");
    setError("");
    setQuote(null);
    if (normalized.length !== 8) {
      setError("Informe um CEP com 8 dígitos.");
      return;
    }
    setBusy(true);
    try {
      const result = await getS2Quote({ data: { id: order.id, cep: normalized, simulate: true } });
      setQuote({
        orderId: order.id,
        cep: normalized,
        message: result.message,
        prices: result.prices,
      });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível consultar. Atualize seus pedidos e tente novamente.",
      );
    } finally {
      setBusy(false);
    }
  }
  function download() {
    if (!order || order.status !== "released") return;
    const text = [
      "INOVA · LISTA DEMONSTRATIVA DE EXAMES",
      "Sem assinatura ou validade de pedido médico.",
      "Paciente: Mariana Oliveira (fictício)",
      `${order.doctorName} · CRM ${order.doctorCrm}`,
      `Liberado: ${new Date(order.releasedAt ?? order.createdAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}`,
      "",
      ...order.exams.map((exam) => `- ${exam.name}`),
      "",
      order.notes,
    ].join("\n");
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "lista-exames-inova-demonstracao.txt";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Confira os exames que seu médico liberou. A consulta de preços e unidades será feita pela
          S2 quando a integração estiver disponível.
        </p>
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => {
            void refresh();
          }}
        >
          <RefreshCw className={busy ? "animate-spin" : ""} />
          Atualizar pedidos
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="grid items-start gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="surface space-y-3 p-4">
          {orders.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setSelected(item.id);
                setProgressMessage("");
                setQuote(null);
                setError("");
              }}
              aria-pressed={item.id === selected}
              className={`w-full rounded-xl border p-4 text-left ${item.id === selected ? "border-brand/30 bg-brand-soft" : "border-border"}`}
            >
              <p className="text-sm font-semibold">{item.exams.length} exame(s) solicitado(s)</p>
              <p className="mt-2 text-xs text-muted-foreground">{item.doctorName}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {new Date(item.releasedAt ?? item.createdAt).toLocaleDateString("pt-BR", {
                  timeZone: "America/Sao_Paulo",
                })}
              </p>
              <span className="mt-3 block text-xs font-medium text-brand-deep">
                {item.status === "cancelled" ? "Pedido cancelado" : "Disponível para consulta"}
              </span>
            </button>
          ))}
          {!orders.length && (
            <p className="py-6 text-sm leading-relaxed text-muted-foreground">
              {busy
                ? "Buscando seus pedidos…"
                : "Você ainda não tem exames solicitados. Eles aparecerão aqui quando seu médico liberar um pedido."}
            </p>
          )}
        </aside>
        {order ? (
          <div className="space-y-5">
            <section className="surface p-6">
              <p className="eyebrow">PEDIDO DO SEU MÉDICO · DEMONSTRAÇÃO</p>
              <h2 className="mt-3 font-display text-xl font-semibold">Exames para realizar</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {order.doctorName} · CRM {order.doctorCrm}
              </p>
              {order.status === "cancelled" && (
                <p role="status" className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
                  Este pedido foi cancelado pelo médico. A consulta de preços está desativada para
                  ele.
                </p>
              )}
              <ul className="mt-5 space-y-3">
                {order.exams.map((exam) => (
                  <li
                    key={exam.id}
                    className="flex items-center gap-3 rounded-xl bg-muted/40 p-3 text-sm"
                  >
                    <Check className="size-4 text-brand-deep" />
                    {exam.name}
                  </li>
                ))}
              </ul>
              {order.notes && (
                <div className="mt-5 border-t border-border pt-4">
                  <h3 className="text-sm font-semibold">Observações do médico</h3>
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm text-muted-foreground">
                    {order.notes}
                  </p>
                </div>
              )}
              <Button
                variant="outline"
                className="mt-5"
                disabled={order.status !== "released"}
                onClick={download}
              >
                <Download />
                Baixar lista demonstrativa
              </Button>
              <p className="mt-3 text-xs text-muted-foreground">
                Lista sem assinatura ou validade de pedido médico.
              </p>
            </section>
            <section className="surface p-6">
              <h2 className="font-display text-lg font-semibold">
                Seu acompanhamento deste pedido
              </h2>
              <form
                onSubmit={(event) => {
                  void saveProgress(event);
                }}
                className="mt-4 space-y-4"
              >
                <div>
                  <label htmlFor="order-favorite" className="label">
                    Laboratório de preferência (opcional)
                  </label>
                  <select
                    id="order-favorite"
                    value={lab}
                    disabled={busy || order.status !== "released"}
                    onChange={(event) => setLab(event.target.value)}
                    className="h-10 w-full rounded-md border border-border bg-white px-3 text-sm"
                  >
                    <option value="">Ainda não escolhi</option>
                    {favorites.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} · {item.address}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="order-performed" className="label">
                    Se já realizou esses exames, informe a data (opcional)
                  </label>
                  <Input
                    id="order-performed"
                    type="date"
                    value={performed}
                    disabled={busy || order.status !== "released"}
                    onChange={(event) => setPerformed(event.target.value)}
                  />
                  <p className="mt-2 text-xs text-muted-foreground">
                    Deixe em branco se ainda não realizou. Você pode corrigir ou remover essa
                    informação depois.
                  </p>
                </div>
                <Button disabled={busy || order.status !== "released"}>
                  Guardar acompanhamento
                </Button>
                {progressMessage && (
                  <p role="status" className="text-xs text-brand-deep">
                    {progressMessage}
                  </p>
                )}
              </form>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button variant="ghost" size="sm" onClick={onFavorites}>
                  Gerenciar laboratórios favoritos
                </Button>
                <Button variant="ghost" size="sm" onClick={onPreparation}>
                  Consultar preparo dos exames
                </Button>
                <Button variant="outline" size="sm" onClick={onSendResults}>
                  Enviar resultado PDF ao médico
                </Button>
              </div>
            </section>
            <section className="surface p-6">
              <div className="flex items-center gap-3">
                <span className="rounded-xl bg-brand-soft p-3 text-brand-deep">
                  <MapPin className="size-5" />
                </span>
                <div>
                  <h2 className="font-display text-lg font-semibold">Consultar valores na S2</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    API simulada · laboratórios e preços fictícios
                  </p>
                </div>
              </div>
              <form onSubmit={consult} className="mt-5 flex flex-wrap items-end gap-3">
                <div>
                  <label className="label" htmlFor="order-cep">
                    CEP para buscar laboratórios
                  </label>
                  <Input
                    id="order-cep"
                    inputMode="numeric"
                    autoComplete="postal-code"
                    value={cep}
                    disabled={busy || order.status !== "released"}
                    onChange={(event) => {
                      setCep(event.target.value.replace(/[^\d-]/g, "").slice(0, 9));
                      setQuote(null);
                    }}
                    placeholder="00000-000"
                  />
                </div>
                <Button disabled={busy || order.status !== "released"}>
                  <MapPin />
                  {busy ? "Simulando consulta…" : "Simular consulta de preços"}
                </Button>
              </form>
              {quote?.orderId === order.id && (
                <div role="status" className="mt-5 rounded-xl bg-brand-soft p-4">
                  <p className="text-sm font-medium">{quote.message}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    CEP informado: {quote.cep.slice(0, 5)}-{quote.cep.slice(5)}. Opções
                    ilustrativas, sem busca geográfica, reserva ou pagamento. Valores para todos os
                    exames deste pedido.
                  </p>
                  <S2QuoteExplorer
                    key={quote.orderId + quote.cep}
                    prices={quote.prices}
                    cep={quote.cep}
                  />
                </div>
              )}
              <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
                Enquanto isso, você pode consultar o site da S2 por conta própria. O INOVA não
                enviará automaticamente seu pedido, CEP ou dados pessoais; será preciso selecionar
                os exames no site.
              </p>
              <Button asChild variant="outline" className="mt-4">
                <a href="https://www.s2medica.com.br/" target="_blank" rel="noreferrer">
                  Abrir site da S2 <ArrowUpRight />
                </a>
              </Button>
            </section>
          </div>
        ) : (
          <section className="surface p-8 text-sm text-muted-foreground">
            Selecione um pedido para conferir os exames e o estado da consulta de preços.
          </section>
        )}
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        Pedidos demonstrativos ficam disponíveis por até 24 horas ou até reiniciar o servidor. Não
        há reserva, pagamento ou agendamento realizado pelo INOVA neste fluxo.
      </p>
    </div>
  );
}
