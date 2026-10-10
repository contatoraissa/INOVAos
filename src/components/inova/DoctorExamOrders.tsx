import { useCallback, useEffect, useRef, useState } from "react";
import { Check, ClipboardList, RefreshCw, Search, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { orderExams } from "@/data/order-exams";
import { createSessionId } from "@/lib/session-id";
import {
  cancelExamOrder,
  createExamOrder,
  listExamOrders,
  releaseExamOrder,
} from "@/lib/exam-orders";
import type { ExamOrder } from "@/lib/exam-order-contract";
import {
  listConsultationEntries,
  saveConsultationEntry,
  transitionConsultationEntry,
} from "@/lib/real-consultation";
import { accountOrders, emptyConsultationPayload } from "@/lib/account-care-adapters";
const orderStatus = {
  draft: "Rascunho",
  released: "Liberado ao paciente",
  cancelled: "Cancelado",
};
export function DoctorExamOrders({
  patientId,
  account = false,
}: {
  patientId: string;
  account?: boolean;
}) {
  const [orders, setOrders] = useState<ExamOrder[]>([]);
  const [query, setQuery] = useState("");
  const [chosen, setChosen] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const request = useRef({ signature: "", id: "" });
  const refresh = useCallback(async () => {
    try {
      setOrders(
        account
          ? accountOrders(await listConsultationEntries({ data: { patientId } }))
          : await listExamOrders({ data: { patientId, audience: "doctor" } }),
      );
    } catch {
      setError("Não foi possível buscar os pedidos. Confira o servidor e tente novamente.");
    }
  }, [patientId, account]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !chosen.length) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const signature = JSON.stringify({ patientId, chosen, notes });
      if (request.current.signature !== signature)
        request.current = { signature, id: createSessionId() };
      if (account)
        await saveConsultationEntry({
          data: {
            patientId,
            requestId: request.current.id,
            kind: "order",
            confirmed: true,
            payload: {
              ...emptyConsultationPayload(),
              title: "Pedido de exames",
              text: notes,
              exams: chosen.map((id) => orderExams.find((exam) => exam.id === id)!.name),
            },
          },
        });
      else
        await createExamOrder({
          data: { requestId: request.current.id, patientId, exams: chosen, notes },
        });
      setChosen([]);
      setNotes("");
      request.current = { signature: "", id: "" };
      setMessage("Rascunho salvo. Confira o pedido e libere para aparecer no portal do paciente.");
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível salvar o pedido.");
    } finally {
      setBusy(false);
    }
  }
  async function change(id: string, action: "release" | "cancel") {
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (account)
        await transitionConsultationEntry({
          data: {
            patientId,
            id,
            status: action === "release" ? "published" : "cancelled",
            confirmed: true,
          },
        });
      else if (action === "release") await releaseExamOrder({ data: { id } });
      else await cancelExamOrder({ data: { id } });
      await refresh();
      setMessage(
        action === "release"
          ? "Pedido liberado. O paciente pode consultá-lo em Exames solicitados."
          : "Pedido cancelado. O estado também aparece no portal do paciente se ele já foi liberado.",
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível atualizar o pedido.");
    } finally {
      setBusy(false);
    }
  }
  const matches = orderExams.filter((exam) =>
    `${exam.name} ${exam.group}`
      .toLocaleLowerCase("pt-BR")
      .includes(query.toLocaleLowerCase("pt-BR")),
  );
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-semibold">Solicitar exames</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Selecione, confira e libere o pedido para este paciente.
          </p>
        </div>
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => {
            void refresh();
          }}
        >
          <RefreshCw />
          Atualizar pedidos
        </Button>
      </div>
      <p className="rounded-xl border border-border bg-white p-4 text-xs leading-relaxed text-muted-foreground">
        {account
          ? "Pedidos salvos neste prontuário. Confira os exames antes de liberar para o paciente. Assinatura eletrônica, preços e agendamento da S2 ainda não estão conectados."
          : "Solicitações demonstrativas, sem assinatura ou validade de pedido médico. Os pedidos ficam temporariamente no servidor por até 24 horas ou até reiniciar. Preços e agendamento da S2 ainda não estão conectados."}
      </p>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="text-sm text-brand-deep">
          {message}
        </p>
      )}
      <form onSubmit={create} className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="surface p-5">
          <label htmlFor="search-order-exams" className="label">
            {account ? "Buscar no catálogo INOVA" : "Buscar no catálogo demonstrativo INOVA"}
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
            <Input
              id="search-order-exams"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Nome do exame ou categoria…"
              className="pl-9"
            />
          </div>
          <div className="mt-4 max-h-80 space-y-2 overflow-y-auto overscroll-contain">
            {matches.map((exam) => (
              <label
                key={exam.id}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${chosen.includes(exam.id) ? "border-brand/30 bg-brand-soft" : "border-border"}`}
              >
                <input
                  type="checkbox"
                  className="mt-1"
                  disabled={busy}
                  checked={chosen.includes(exam.id)}
                  onChange={(event) =>
                    setChosen((current) =>
                      event.target.checked
                        ? [...current, exam.id]
                        : current.filter((id) => id !== exam.id),
                    )
                  }
                />
                <span>
                  <span className="block text-sm font-medium">{exam.name}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">{exam.group}</span>
                </span>
              </label>
            ))}
            {!matches.length && (
              <p className="p-4 text-sm text-muted-foreground">
                Nenhum exame encontrado no catálogo demonstrativo.
              </p>
            )}
          </div>
        </section>
        <section className="surface space-y-4 p-5">
          <h3 className="text-base font-semibold">Pedido em preparação · {chosen.length}</h3>
          {chosen.length ? (
            <ul className="space-y-2">
              {chosen.map((id) => (
                <li key={id} className="flex items-center justify-between gap-3 text-sm">
                  <span>{orderExams.find((exam) => exam.id === id)?.name}</span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setChosen((current) => current.filter((value) => value !== id))}
                    aria-label={`Remover ${orderExams.find((exam) => exam.id === id)?.name}`}
                  >
                    <X className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">
              Selecione os exames para compor o pedido.
            </p>
          )}
          <div>
            <label htmlFor="order-notes" className="label">
              Observações do médico
            </label>
            <Textarea
              id="order-notes"
              maxLength={2000}
              disabled={busy}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Observações para o paciente…"
            />
          </div>
          <Button className="w-full" disabled={busy || !chosen.length}>
            <ClipboardList />
            {busy ? "Salvando…" : "Salvar rascunho do pedido"}
          </Button>
        </section>
      </form>
      <section className="surface p-5">
        <h3 className="font-display text-lg font-semibold">Pedidos deste paciente</h3>
        <div className="mt-4 space-y-4">
          {orders.map((order) => (
            <article
              key={order.id}
              data-order-id={order.id}
              className="rounded-xl border border-border p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-semibold">
                  Pedido ·{" "}
                  {new Date(order.createdAt).toLocaleString("pt-BR", {
                    timeZone: "America/Sao_Paulo",
                  })}
                </p>
                <span
                  className={`rounded-full px-3 py-1 text-xs ${order.status === "released" ? "bg-brand-soft text-brand-deep" : "bg-muted text-muted-foreground"}`}
                >
                  {orderStatus[order.status]}
                </span>
              </div>
              <ul className="mt-4 space-y-2">
                {order.exams.map((exam) => (
                  <li key={exam.id} className="flex items-center gap-2 text-sm">
                    <Check className="size-3 text-brand-deep" />
                    {exam.name}
                  </li>
                ))}
              </ul>
              {order.notes && (
                <p className="mt-4 whitespace-pre-wrap break-words text-sm text-muted-foreground">
                  {order.notes}
                </p>
              )}
              <p className="mt-3 text-xs text-muted-foreground">
                {account
                  ? "Registrado na sua conta médica"
                  : `${order.doctorName} · CRM ${order.doctorCrm}`}
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                {order.status === "draft" && (
                  <Button
                    size="sm"
                    disabled={busy}
                    onClick={() => {
                      void change(order.id, "release");
                    }}
                  >
                    <Send className="size-3" />
                    Liberar para paciente
                  </Button>
                )}
                {order.status !== "cancelled" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    onClick={() => {
                      void change(order.id, "cancel");
                    }}
                  >
                    Cancelar pedido
                  </Button>
                )}
              </div>
            </article>
          ))}
          {!orders.length && (
            <p className="py-5 text-sm text-muted-foreground">
              Nenhum pedido criado para este paciente.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
