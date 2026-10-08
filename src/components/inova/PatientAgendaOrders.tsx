import { useCallback, useEffect, useState } from "react";
import { CalendarDays, ClipboardList, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";
import { listAgenda } from "@/lib/agenda";
import { scheduleExamOrder } from "@/lib/exam-orders";
import type { ExamOrder } from "@/lib/exam-order-contract";
import type { AgendaEvent } from "@/lib/agenda-contract";
import type { OrderProgress } from "@/lib/care-contract";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export function PatientAgendaOrders({
  orders,
  progress,
  onOpenOrder,
}: {
  orders: ExamOrder[];
  progress: OrderProgress[];
  onOpenOrder: (id: string) => void;
}) {
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<ExamOrder | null>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [laboratory, setLaboratory] = useState("");
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => {
    try {
      setEvents(
        await listAgenda({ data: { patientIds: ["mariana-oliveira"], audience: "patient" } }),
      );
      setError("");
    } catch {
      setError("Não foi possível conferir as coletas na agenda. Tente atualizar.");
    }
  }, []);
  useEffect(() => {
    void refresh();
    const update = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const timer = window.setInterval(update, 30000);
    window.addEventListener("focus", update);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", update);
    };
  }, [refresh]);
  const active = orders.filter(
    (order) =>
      order.status === "released" &&
      !progress.some((item) => item.orderId === order.id && item.performedOn),
  );
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!selected || busy) return;
    setBusy(true);
    try {
      await scheduleExamOrder({ data: { orderId: selected.id, date, time, laboratory } });
      await refresh();
      window.dispatchEvent(new Event("focus"));
      setSelected(null);
      toast.success("Coleta informada na agenda. O laboratório não foi agendado pelo INOVA.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível informar a coleta.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="surface p-5" aria-label="Exames solicitados na agenda">
      <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
        <ClipboardList className="size-5 text-brand" /> Seus exames solicitados
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Consulte o pedido e os valores. A coleta só entra no calendário quando você informa a data
        combinada com o laboratório.
      </p>
      {error && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      )}
      {!active.length && (
        <p className="mt-4 text-sm text-muted-foreground">
          Nenhum pedido liberado aguardando realização.
        </p>
      )}
      <div className="mt-4 max-h-80 space-y-3 overflow-y-auto overscroll-contain">
        {active.map((order) => {
          const scheduled = events.find(
            (item) => item.orderId === order.id && item.status !== "Cancelado",
          );
          return (
            <article key={order.id} className="rounded-xl border border-border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold">
                  {order.exams.map((exam) => exam.name).join(" · ")}
                </h3>
                <span className="rounded-full bg-brand-soft px-3 py-1 text-xs text-brand-deep">
                  {scheduled ? "Coleta informada" : "Aguardando realização"}
                </span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Solicitado por {order.doctorName} ·{" "}
                {new Date(order.releasedAt!).toLocaleDateString("pt-BR")}
              </p>
              {scheduled && (
                <p className="mt-2 text-sm">
                  Coleta: {scheduled.date.split("-").reverse().join("/")} ·{" "}
                  {scheduled.time || "Horário não informado"} · informado por você, sem confirmação
                  do laboratório.
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => onOpenOrder(order.id)}>
                  Ver pedido e consultar valores
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href="https://www.s2medica.com.br/" target="_blank" rel="noreferrer">
                    Consultar valores na S2 Labs <ArrowUpRight className="size-4" />
                  </a>
                </Button>
                {!scheduled && (
                  <Button
                    size="sm"
                    disabled={!!error}
                    onClick={() => {
                      setSelected(order);
                      setDate("");
                      setTime("");
                      setLaboratory("");
                    }}
                  >
                    <CalendarDays className="size-4" /> Informar coleta
                  </Button>
                )}
              </div>
            </article>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        A consulta no site da S2 não envia o pedido nem confirma preços ou agendamento no INOVA.
        Após receber o resultado, abra o pedido para enviar seu PDF ao médico.
      </p>
      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open && !busy) setSelected(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Informar coleta combinada</DialogTitle>
            <DialogDescription>
              Informe a data que você combinou diretamente com o laboratório. Este registro não faz
              uma reserva externa.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div>
              <label className="label" htmlFor="exam-collection-date">
                Data da coleta
              </label>
              <Input
                id="exam-collection-date"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={busy}
              />
            </div>
            <div>
              <label className="label" htmlFor="exam-collection-time">
                Horário (opcional)
              </label>
              <Input
                id="exam-collection-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                disabled={busy}
              />
            </div>
            <div>
              <label className="label" htmlFor="exam-collection-lab">
                Laboratório / unidade
              </label>
              <Input
                id="exam-collection-lab"
                required
                minLength={2}
                maxLength={150}
                value={laboratory}
                onChange={(e) => setLaboratory(e.target.value)}
                disabled={busy}
              />
            </div>
            <Button disabled={busy}>{busy ? "Salvando…" : "Salvar coleta na agenda"}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
