import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  cancelPlannedReturn,
  createPlannedReturn,
  getDoctorWork,
  publishPlannedReturn,
} from "@/lib/care";
import { createSessionId } from "@/lib/session-id";
import { localDay, type PlannedReturn } from "@/lib/return-contract";

const day = (value: string) => value.split("-").reverse().join("/");
export function PatientPlannedReturns({ records }: { records: PlannedReturn[] }) {
  if (!records.length) return null;
  return (
    <section className="surface p-5" aria-label="Retorno planejado pelo médico">
      <h2 className="text-lg font-semibold">Seu retorno planejado</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Orientação para reavaliar seu cuidado. Não é uma consulta agendada; entre em contato com o
        consultório para combinar o atendimento.
      </p>
      <div className="mt-4 space-y-3">
        {records.map((item) => (
          <article
            key={item.id}
            className={`rounded-xl border p-4 ${item.cancelledAt ? "border-border bg-muted/30" : "border-brand/30 bg-brand-soft"}`}
          >
            <p className="text-xs font-semibold text-brand-deep">
              {item.cancelledAt
                ? "Plano cancelado"
                : item.targetDate < localDay()
                  ? "Data planejada já passou · confirme com o consultório"
                  : "Retorno orientado"}
            </p>
            <h3 className="mt-2 font-semibold">{item.title}</h3>
            <p className="mt-2 text-lg font-semibold">{day(item.targetDate)}</p>
            {item.days && (
              <p className="mt-1 text-xs text-muted-foreground">
                Prazo de {item.days} dia(s), contado a partir da criação do plano.
              </p>
            )}
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">
              {item.notes || "Sem observações adicionais."}
            </p>
            <p className="mt-3 text-xs text-muted-foreground">
              {item.doctorName} · publicado em {new Date(item.publishedAt!).toLocaleString("pt-BR")}
              {item.cancelledAt
                ? ` · cancelado em ${new Date(item.cancelledAt).toLocaleString("pt-BR")}`
                : ""}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function DoctorPlannedReturns({
  patientId,
  onChange,
}: {
  patientId: string;
  onChange?: () => void;
}) {
  const [mode, setMode] = useState("days");
  const [date, setDate] = useState("");
  const [days, setDays] = useState("30");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [records, setRecords] = useState<PlannedReturn[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [persistent, setPersistent] = useState(false);
  const [confirmed, setConfirmed] = useState<Record<string, boolean>>({});
  const [cancelId, setCancelId] = useState("");
  const request = useRef({ signature: "", id: "" });
  useEffect(() => {
    let current = true;
    void getDoctorWork({ data: { patientIds: [patientId] } })
      .then((result) => {
        if (current) {
          setRecords(result[0]?.returns ?? []);
          setPersistent(result[0]?.returnPersistence === "supabase");
          setLoaded(true);
        }
      })
      .catch(() => {
        if (current)
          setError("Não foi possível carregar os retornos. Reabra a seção para tentar novamente.");
      });
    return () => {
      current = false;
    };
  }, [patientId]);
  async function perform(action: () => Promise<PlannedReturn>) {
    setBusy(true);
    setError("");
    try {
      const item = await action();
      setRecords((items) => [item, ...items.filter((entry) => entry.id !== item.id)]);
      if (item.cancelledAt) request.current = { signature: "", id: "" };
      setCancelId("");
      onChange?.();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível atualizar o retorno.");
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    const fields = {
      patientId,
      title,
      notes,
      date: mode === "date" ? date : null,
      days: mode === "days" ? Number(days) : null,
    };
    const signature = JSON.stringify(fields);
    if (request.current.signature !== signature)
      request.current = { signature, id: createSessionId() };
    await perform(() =>
      createPlannedReturn({ data: { ...fields, requestId: request.current.id } }),
    );
  }
  return (
    <section className="surface p-6" aria-label="Planejar retorno do paciente">
      <h3 className="text-xl font-semibold">Planejar retorno</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        Defina quando reavaliar, confira o rascunho e publique para o paciente. Não reserva horário
        nem confirma consulta.
      </p>
      <p className="mt-2 text-xs text-muted-foreground">
        {persistent
          ? "Retornos guardados no banco conectado."
          : "Retornos temporários da demonstração: serão perdidos se o servidor reiniciar. A conexão com o banco está pendente."}
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          Motivo do retorno
          <Input
            id="return-title"
            value={title}
            maxLength={120}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Ex.: revisar os exames solicitados"
          />
        </label>
        <label className="text-sm">
          Como definir o retorno
          <select
            id="return-mode"
            value={mode}
            onChange={(event) => setMode(event.target.value)}
            className="mt-1 block w-full rounded-md border border-border bg-white p-2"
          >
            <option value="days">Prazo em dias</option>
            <option value="date">Data específica</option>
          </select>
        </label>
        {mode === "days" ? (
          <label className="text-sm">
            Prazo a partir de hoje (dias)
            <Input
              id="return-days"
              type="number"
              min={1}
              max={365}
              value={days}
              onChange={(event) => setDays(event.target.value)}
            />
          </label>
        ) : (
          <label className="text-sm">
            Data planejada
            <Input
              id="return-date"
              type="date"
              min={localDay()}
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </label>
        )}
      </div>
      <label className="mt-4 block text-sm" htmlFor="return-notes">
        Observações para o paciente
      </label>
      <Textarea
        id="return-notes"
        className="mt-1"
        maxLength={2000}
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
      />
      <Button
        className="mt-4"
        type="button"
        disabled={
          busy ||
          !loaded ||
          title.trim().length < 3 ||
          (mode === "date"
            ? !date
            : !Number.isInteger(Number(days)) || Number(days) < 1 || Number(days) > 365)
        }
        onClick={() => {
          void save();
        }}
      >
        {busy ? "Salvando…" : "Salvar rascunho do retorno"}
      </Button>
      {error && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="mt-5 space-y-3">
        {records.map((item) => (
          <article
            key={item.id}
            data-return-id={item.id}
            className="rounded-xl border border-border p-4"
          >
            <p className="text-xs font-semibold text-brand-deep">
              {item.cancelledAt
                ? "Cancelado"
                : item.publishedAt
                  ? "Publicado para o paciente"
                  : "Rascunho · paciente ainda não vê"}
            </p>
            <h4 className="mt-2 font-semibold">{item.title}</h4>
            <p className="mt-2 text-sm">
              Retorno orientado: <strong>{day(item.targetDate)}</strong>
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{item.notes}</p>
            {!item.publishedAt && !item.cancelledAt && (
              <>
                <label className="mt-3 flex items-start gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={!!confirmed[item.id]}
                    disabled={busy}
                    onChange={(event) =>
                      setConfirmed((items) => ({ ...items, [item.id]: event.target.checked }))
                    }
                  />
                  Conferi motivo, data e observações. Quero publicar esta orientação para o
                  paciente.
                </label>
                <Button
                  size="sm"
                  className="mt-3"
                  disabled={busy || !confirmed[item.id]}
                  onClick={() => {
                    void perform(() =>
                      publishPlannedReturn({ data: { id: item.id, confirmed: true } }),
                    );
                  }}
                >
                  Publicar retorno para o paciente
                </Button>
              </>
            )}
            {!item.cancelledAt && (
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => {
                    if (cancelId !== item.id) setCancelId(item.id);
                    else void perform(() => cancelPlannedReturn({ data: { id: item.id } }));
                  }}
                >
                  {cancelId === item.id
                    ? "Confirmar cancelamento do retorno"
                    : "Cancelar plano de retorno"}
                </Button>
                {cancelId === item.id && (
                  <Button size="sm" variant="ghost" onClick={() => setCancelId("")}>
                    Manter retorno
                  </Button>
                )}
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
