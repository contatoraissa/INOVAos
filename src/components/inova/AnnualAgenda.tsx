import { useCallback, useEffect, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { toast } from "sonner";
import { listAgenda, createAgendaEvent, cancelAgendaEvent, confirmAgendaEvent } from "@/lib/agenda";
import { agendaKinds, type AgendaEvent } from "@/lib/agenda-contract";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { usePatientDirectory } from "./patient-directory";
import { AgendaBriefing } from "./AgendaBriefing";

const months = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];
const reasons = [
  "Guia do convênio ainda não emitida",
  "Convênio não autorizou",
  "Imprevisto pessoal",
  "Solicitação do médico",
  "Outro motivo",
];
const colors = {
  Proposto: "bg-amber-400",
  Confirmado: "bg-brand",
  Previsto: "bg-violet-400",
  Cancelado: "bg-slate-400",
};
export function AnnualAgenda({ audience }: { audience: "doctor" | "patient" }) {
  const { patients } = usePatientDirectory();
  const eligible =
    audience === "patient" ? patients.filter((p) => p.id === "mariana-oliveira") : patients;
  const ids = JSON.stringify(eligible.map((p) => p.id));
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [day, setDay] = useState("");
  const [filterPatient, setFilterPatient] = useState("all");
  const [showCancelled, setShowCancelled] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [add, setAdd] = useState(false);
  const [cancel, setCancel] = useState<AgendaEvent | null>(null);
  const [reason, setReason] = useState(reasons[0] ?? "");
  const [other, setOther] = useState("");
  const [draft, setDraft] = useState({
    patientId: "mariana-oliveira",
    title: "",
    kind: "Consulta" as (typeof agendaKinds)[number],
    date: "",
    time: "",
    status: "Proposto" as "Proposto" | "Confirmado" | "Previsto",
    notes: "",
  });
  const refresh = useCallback(async () => {
    try {
      const result = await listAgenda({ data: { patientIds: JSON.parse(ids), audience } });
      setEvents(result);
      setError("");
    } catch {
      setError("Não foi possível carregar a agenda. Tente atualizar.");
    } finally {
      setLoading(false);
    }
  }, [ids, audience]);
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
  async function act(task: () => Promise<unknown>) {
    if (busy) return;
    setBusy(true);
    try {
      await task();
      await refresh();
      window.dispatchEvent(new Event("focus"));
      toast.success("Agenda demonstrativa atualizada.");
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível salvar.");
      return false;
    } finally {
      setBusy(false);
    }
  }
  const visible = events.filter(
    (e) =>
      e.date.startsWith(String(year) + "-") &&
      (filterPatient === "all" || e.patientId === filterPatient) &&
      (showCancelled || e.status !== "Cancelado"),
  );
  const list = visible
    .filter((e) =>
      day ? e.date === day : e.date.startsWith(`${year}-${String(month + 1).padStart(2, "0")}-`),
    )
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const update = (key: string, value: string) => setDraft((d) => ({ ...d, [key]: value }));
  function moveMonth(amount: number) {
    const next = new Date(year, month + amount, 1);
    setYear(next.getFullYear());
    setMonth(next.getMonth());
    setDay("");
  }
  function moveDay(amount: number) {
    const current = day ? new Date(day + "T12:00:00") : new Date(year, month, 1, 12);
    current.setDate(current.getDate() + amount);
    setYear(current.getFullYear());
    setMonth(current.getMonth());
    setDay(
      `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}-${String(current.getDate()).padStart(2, "0")}`,
    );
  }
  function today() {
    const now = new Date();
    setYear(now.getFullYear());
    setMonth(now.getMonth());
    setDay(
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`,
    );
  }
  return (
    <div className="space-y-5">
      <div className="surface p-4 text-xs leading-relaxed text-muted-foreground">
        Agenda compartilhada da demonstração · Dr. Rafael Mendes. Consulta confirmada, retorno
        proposto e previsão de resultado são estados distintos. Datas são informadas manualmente;
        não há integração com laboratório ou convênio. Cancelar aqui altera apenas o evento
        demonstrativo.
      </div>
      <div className="surface flex flex-wrap items-center justify-between gap-4 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            aria-label="Mês anterior"
            disabled={year <= 2000 && month === 0}
            onClick={() => moveMonth(-1)}
          >
            <ChevronLeft />
          </Button>
          <h2 className="min-w-32 text-center font-display text-xl font-semibold">
            {months[month]} <span className="text-muted-foreground">{year}</span>
          </h2>
          <Button
            variant="outline"
            size="icon"
            aria-label="Próximo mês"
            disabled={year >= 2100 && month === 11}
            onClick={() => moveMonth(1)}
          >
            <ChevronRight />
          </Button>
          <Button variant="ghost" onClick={today}>
            Hoje
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void refresh()}>
            Atualizar agenda
          </Button>
          <Button
            onClick={() => {
              setDraft((d) => ({
                ...d,
                title: "",
                date: day || `${year}-${String(month + 1).padStart(2, "0")}-01`,
                time: "",
                notes: "",
                status: "Proposto",
                kind: "Consulta",
              }));
              setAdd(true);
            }}
          >
            <Plus />
            Adicionar evento
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        {audience === "doctor" && (
          <label className="text-xs font-medium">
            Paciente
            <select
              aria-label="Filtrar paciente na agenda"
              className="ml-2 h-10 rounded-lg border border-input bg-background px-3 text-sm"
              value={filterPatient}
              onChange={(e) => setFilterPatient(e.target.value)}
            >
              <option value="all">Todos os meus pacientes</option>
              {eligible.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showCancelled}
            onChange={(e) => setShowCancelled(e.target.checked)}
          />
          Mostrar cancelados
        </label>
        <div className="flex flex-wrap gap-3 text-xs">
          {Object.entries(colors).map(([status, color]) => (
            <span key={status} className="flex items-center gap-1">
              <span className={`size-2 rounded-full ${color}`} />
              {status}
            </span>
          ))}
        </div>
      </div>
      {error && (
        <p role="alert" className="surface p-4 text-sm text-destructive">
          {error}
        </p>
      )}
      {audience === "doctor" && (
        <AgendaBriefing
          date={
            day ||
            `${year}-${String(month + 1).padStart(2, "0")}-${year === new Date().getFullYear() && month === new Date().getMonth() ? String(new Date().getDate()).padStart(2, "0") : "01"}`
          }
          revision={JSON.stringify(events.map((event) => [event.id, event.updatedAt]))}
        />
      )}
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="surface min-w-0 overflow-hidden" aria-label="Calendário mensal">
          <div className="grid grid-cols-7 border-b border-border bg-muted/30 py-4 text-center text-xs font-medium text-muted-foreground">
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {Array.from({ length: 42 }, (_, index) => {
              const first = new Date(year, month, 1).getDay();
              const current = new Date(year, month, index - first + 1);
              const date =
                current.getFullYear() +
                "-" +
                String(current.getMonth() + 1).padStart(2, "0") +
                "-" +
                String(current.getDate()).padStart(2, "0");
              const onDate = visible.filter((e) => e.date === date);
              const inMonth = current.getMonth() === month;
              const now = new Date();
              const isToday = current.toDateString() === now.toDateString();
              return (
                <button
                  type="button"
                  key={date}
                  aria-label={
                    current.getDate() +
                    " de " +
                    months[current.getMonth()] +
                    " de " +
                    current.getFullYear() +
                    ": " +
                    onDate.length +
                    " evento(s)"
                  }
                  aria-pressed={day === date}
                  onClick={() => {
                    setYear(current.getFullYear());
                    setMonth(current.getMonth());
                    setDay(date);
                  }}
                  className={
                    "group flex min-h-[68px] min-w-0 flex-col gap-1 border-b border-r border-border/60 p-1.5 text-left transition-colors sm:min-h-[110px] sm:p-2.5 " +
                    (day === date
                      ? "bg-brand-soft ring-1 ring-inset ring-brand"
                      : inMonth
                        ? "bg-white hover:bg-brand-soft/40"
                        : "bg-muted/30 text-muted-foreground/50")
                  }
                >
                  <span
                    className={
                      "flex size-7 items-center justify-center self-end rounded-full text-xs sm:text-sm " +
                      (isToday
                        ? "bg-brand font-semibold text-white"
                        : day === date
                          ? "font-semibold text-brand-deep"
                          : "")
                    }
                  >
                    {current.getDate()}
                  </span>
                  <div className="hidden min-w-0 space-y-1 sm:block">
                    {onDate.slice(0, 2).map((event) => (
                      <span
                        key={event.id}
                        className={
                          "block truncate rounded-md px-1.5 py-1 text-[10px] " +
                          (event.status === "Cancelado"
                            ? "bg-slate-100 text-slate-500 line-through"
                            : "bg-brand-soft text-brand-deep")
                        }
                      >
                        {event.time ? event.time + " " : ""}
                        {event.title}
                      </span>
                    ))}
                    {onDate.length > 2 && (
                      <span className="text-[10px] text-muted-foreground">
                        +{onDate.length - 2} eventos
                      </span>
                    )}
                  </div>
                  <span className="flex flex-wrap gap-1 sm:hidden">
                    {onDate.slice(0, 3).map((e) => (
                      <span key={e.id} className={"size-1.5 rounded-full " + colors[e.status]} />
                    ))}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="flex items-center justify-between gap-3 bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
            <span>Selecione um dia para ver os detalhes.</span>
            <span>
              {
                visible.filter((e) =>
                  e.date.startsWith(year + "-" + String(month + 1).padStart(2, "0") + "-"),
                ).length
              }{" "}
              evento(s) no mês
            </span>
          </div>
        </section>
        <section className="surface min-w-0 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <CalendarDays className="size-5 text-brand" />
              {day
                ? `Eventos de ${day.split("-").reverse().join("/")}`
                : `Eventos de ${months[month]}`}
            </h2>
            {day && (
              <Button variant="ghost" onClick={() => setDay("")}>
                Ver mês
              </Button>
            )}
          </div>
          <div className="mt-4 flex items-center justify-between border-b border-border pb-4">
            <Button
              variant="outline"
              size="icon"
              aria-label="Dia anterior"
              onClick={() => moveDay(-1)}
            >
              <ChevronLeft />
            </Button>
            <span className="text-xs text-muted-foreground">Navegar pelos dias</span>
            <Button
              variant="outline"
              size="icon"
              aria-label="Próximo dia"
              onClick={() => moveDay(1)}
            >
              <ChevronRight />
            </Button>
          </div>
          <div
            className="mt-5 max-h-[380px] space-y-3 overflow-y-auto overscroll-contain pr-2 outline-none focus-visible:ring-2 focus-visible:ring-brand sm:max-h-[520px]"
            tabIndex={0}
            role="region"
            aria-label="Lista de compromissos com rolagem independente"
          >
            {loading ? (
              <p className="text-sm text-muted-foreground">Carregando agenda…</p>
            ) : !list.length && !error ? (
              <p className="text-sm text-muted-foreground">
                Nenhum evento neste período. Adicione uma consulta, retorno ou exame.
              </p>
            ) : (
              list.map((event) => (
                <article
                  key={event.id}
                  data-agenda-event={event.id}
                  className="rounded-xl border border-border p-4"
                >
                  <div className="flex flex-wrap justify-between gap-3">
                    <div>
                      <p className="font-semibold">{event.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {event.kind} · {event.date.split("-").reverse().join("/")}{" "}
                        {event.time || "· Horário não informado"} ·{" "}
                        {eligible.find((p) => p.id === event.patientId)?.name}
                      </p>
                    </div>
                    <span className="flex items-center gap-2 text-xs">
                      <span className={`size-2 rounded-full ${colors[event.status]}`} />
                      {event.status}
                    </span>
                  </div>
                  {event.notes && (
                    <p className="mt-3 whitespace-pre-wrap break-words text-sm text-muted-foreground">
                      {event.notes}
                    </p>
                  )}
                  {event.reason && <p className="mt-3 text-sm">Motivo: {event.reason}</p>}
                  {event.status !== "Cancelado" && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {audience === "doctor" && event.status === "Proposto" && (
                        <Button
                          size="sm"
                          disabled={busy}
                          onClick={() =>
                            void act(() =>
                              confirmAgendaEvent({
                                data: { id: event.id, patientId: event.patientId, audience },
                              }),
                            )
                          }
                        >
                          Confirmar evento
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => {
                          setCancel(event);
                          setReason(reasons[0] ?? "");
                          setOther("");
                        }}
                      >
                        Cancelar evento
                      </Button>
                    </div>
                  )}
                </article>
              ))
            )}
          </div>
        </section>
      </div>
      <Dialog
        open={add}
        onOpenChange={(value) => {
          if (!busy) setAdd(value);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Adicionar à agenda</DialogTitle>
            <DialogDescription>
              {audience === "patient"
                ? "Você propõe um evento; a confirmação cabe ao médico."
                : "Registre o combinado com o paciente. Previsões não garantem a liberação do resultado."}
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              if (await act(() => createAgendaEvent({ data: { ...draft, audience } })))
                setAdd(false);
            }}
          >
            <fieldset disabled={busy} className="space-y-4">
              {audience === "doctor" && (
                <label className="block text-xs font-medium">
                  Paciente
                  <select
                    id="agenda-patient"
                    className="mt-2 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                    value={draft.patientId}
                    onChange={(e) => update("patientId", e.target.value)}
                  >
                    {eligible.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label className="block text-xs font-medium">
                Título
                <Input
                  id="agenda-title"
                  required
                  minLength={3}
                  maxLength={120}
                  className="mt-2"
                  value={draft.title}
                  onChange={(e) => update("title", e.target.value)}
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs font-medium">
                  Tipo
                  <select
                    id="agenda-kind"
                    className="mt-2 h-10 w-full rounded-lg border border-input bg-background px-2 text-sm"
                    value={draft.kind}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        kind: e.target.value as typeof d.kind,
                        status:
                          e.target.value === "Previsão de resultado" ? "Previsto" : "Proposto",
                      }))
                    }
                  >
                    {agendaKinds
                      .filter((k) => audience === "doctor" || k !== "Previsão de resultado")
                      .map((k) => (
                        <option key={k}>{k}</option>
                      ))}
                  </select>
                </label>
                <label className="text-xs font-medium">
                  Status
                  <select
                    id="agenda-status"
                    disabled={audience === "patient" || draft.kind === "Previsão de resultado"}
                    className="mt-2 h-10 w-full rounded-lg border border-input bg-background px-2 text-sm"
                    value={draft.status}
                    onChange={(e) => update("status", e.target.value)}
                  >
                    {draft.kind === "Previsão de resultado" ? (
                      <option>Previsto</option>
                    ) : (
                      <>
                        <option>Proposto</option>
                        <option>Confirmado</option>
                      </>
                    )}
                  </select>
                </label>
                <label className="text-xs font-medium">
                  Data
                  <Input
                    id="agenda-date"
                    type="date"
                    required
                    min={`${year}-01-01`}
                    max={`${year}-12-31`}
                    value={draft.date}
                    onChange={(e) => update("date", e.target.value)}
                    className="mt-2"
                  />
                </label>
                <label className="text-xs font-medium">
                  Horário (opcional)
                  <Input
                    type="time"
                    value={draft.time}
                    onChange={(e) => update("time", e.target.value)}
                    className="mt-2"
                  />
                </label>
              </div>
              <label className="block text-xs font-medium">
                Observações / fonte da previsão
                <Textarea
                  id="agenda-notes"
                  className="mt-2"
                  maxLength={1000}
                  value={draft.notes}
                  onChange={(e) => update("notes", e.target.value)}
                  placeholder="Local, guia pendente ou previsão informada pelo laboratório…"
                />
              </label>
              <Button type="submit" disabled={busy}>
                {busy ? "Salvando…" : "Salvar evento"}
              </Button>
            </fieldset>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!cancel}
        onOpenChange={(value) => {
          if (!value && !busy) setCancel(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar evento?</DialogTitle>
            <DialogDescription>
              {cancel?.title}. O histórico e o motivo serão mantidos e compartilhados com o outro
              perfil. Não cancela agendamento externo ou guia do convênio.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              if (
                cancel &&
                (await act(() =>
                  cancelAgendaEvent({
                    data: {
                      id: cancel.id,
                      patientId: cancel.patientId,
                      audience,
                      reason: reason === "Outro motivo" ? other : reason,
                    },
                  }),
                ))
              )
                setCancel(null);
            }}
          >
            <label className="block text-sm">
              Motivo
              <select
                id="agenda-cancel-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="mt-2 h-10 w-full rounded-lg border border-input bg-background px-2 text-sm"
              >
                {reasons.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </label>
            {reason === "Outro motivo" && (
              <Textarea
                required
                minLength={3}
                maxLength={1000}
                aria-label="Outro motivo de cancelamento"
                value={other}
                onChange={(e) => setOther(e.target.value)}
              />
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => setCancel(null)}
              >
                Voltar
              </Button>
              <Button type="submit" disabled={busy}>
                Confirmar cancelamento
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
