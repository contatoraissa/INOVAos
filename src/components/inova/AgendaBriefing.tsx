import { useEffect, useRef, useState } from "react";
import { Sparkles, FileText, MessageSquare } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { getAiStatus, getAgendaBriefingContext, summarizeAgenda } from "@/lib/ai";
import type { BriefingContext } from "@/lib/agenda-briefing-contract";
import { Button } from "@/components/ui/button";
import { usePatientDirectory } from "./patient-directory";
import {
  getRealAiStatus,
  getRealAgendaBriefingContext,
  summarizeRealAgenda,
} from "@/lib/real-workspace-ai";
export function AgendaBriefing({
  date,
  revision,
  accountPatients,
}: {
  date: string;
  revision: string;
  accountPatients?: { id: string; name: string }[] | undefined;
}) {
  const directory = usePatientDirectory();
  const patients = accountPatients ?? directory.patients;
  const real = Boolean(accountPatients);
  const ids = JSON.stringify(patients.map((p) => p.id));
  const [mode, setMode] = useState<"day" | "upcoming">("day");
  const [context, setContext] = useState<BriefingContext | null>(null);
  const [result, setResult] = useState<Awaited<ReturnType<typeof summarizeAgenda>> | null>(null);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<{
    available: boolean;
    model: string | null;
    message: string;
  } | null>(null);
  const current = useRef("");
  const key = date + ids + revision + mode;
  useEffect(() => {
    let alive = true;
    current.current = key;
    setLoading(true);
    setResult(null);
    setConsent(false);
    setError("");
    setContext(null);
    void Promise.all([
      (real ? getRealAgendaBriefingContext : getAgendaBriefingContext)({
        data: { date, patientIds: JSON.parse(ids), mode },
      }),
      (real ? getRealAiStatus : getAiStatus)(),
    ])
      .then(([ctx, info]) => {
        if (alive) {
          setContext(ctx);
          setStatus(info);
        }
      })
      .catch(() => {
        if (alive) setError("Não foi possível carregar as informações para o briefing.");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
      current.current = "";
    };
  }, [date, ids, key, mode, real]);
  async function generate() {
    if (!consent || busy) return;
    setBusy(true);
    setError("");
    const requestKey = key;
    try {
      const output = await (real ? summarizeRealAgenda : summarizeAgenda)({
        data: { date, patientIds: JSON.parse(ids), mode, confirmed: true },
      });
      if (current.current === requestKey) setResult(output);
    } catch (e) {
      if (current.current === requestKey)
        setError(e instanceof Error ? e.message : "Não foi possível gerar o briefing.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="surface border-brand/20 p-5" aria-label="Briefing da agenda com IA">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-brand-deep">
            <Sparkles className="size-5" />
            {mode === "upcoming"
              ? "Prepare seus próximos eventos com IA"
              : "Prepare seu dia com IA"}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "upcoming"
              ? `Próximos 30 dias, incluindo hoje${context ? ` · ${context.date.split("-").reverse().join("/")} a ${context.endDate?.split("-").reverse().join("/")}` : ""} · eventos ativos, incluindo propostas.`
              : `Briefing de ${date.split("-").reverse().join("/")} · consultas e retornos ativos, incluindo propostas.`}
          </p>
        </div>
        <span className="rounded-full bg-brand-soft px-3 py-1 text-xs text-brand-deep">
          Assistente pré-consulta
        </span>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          variant={mode === "upcoming" ? "default" : "outline"}
          disabled={busy}
          onClick={() => setMode("upcoming")}
        >
          <Sparkles className="size-4" /> Ler eventos futuros
        </Button>
        {mode === "upcoming" && (
          <Button variant="outline" disabled={busy} onClick={() => setMode("day")}>
            Dia selecionado
          </Button>
        )}
      </div>
      {loading ? (
        <p className="mt-4 text-sm text-muted-foreground">Conferindo compromissos e envios…</p>
      ) : context && !context.patients.length ? (
        <p className="mt-4 text-sm text-muted-foreground">
          {mode === "upcoming"
            ? "Não há eventos ativos nos próximos 30 dias."
            : "Não há consultas ou retornos neste dia. Selecione no calendário um dia com compromissos ou leia os eventos futuros."}
        </p>
      ) : (
        context && (
          <>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {context.patients.map((p) => (
                <article key={p.reference} className="rounded-xl bg-muted/30 p-4">
                  <p className="text-sm font-semibold">
                    {patients.find((patient) => patient.id === p.patientId)?.name ?? p.reference}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {p.appointments
                      .map(
                        (a) =>
                          `${a.date.split("-").reverse().join("/")} · ${a.kind} · ${a.time || "Sem horário"} · ${a.status}`,
                      )
                      .join(" / ")}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MessageSquare className="size-3" />
                      {p.submissions.length} envio(s)
                    </span>
                    <span className="flex items-center gap-1">
                      <FileText className="size-3" />
                      {p.submissions.reduce((n, s) => n + s.pdfs, 0)} PDF(s) ·{" "}
                      {p.submissions.reduce((n, s) => n + s.audios, 0)} áudio(s)
                    </span>
                  </div>
                  <details className="mt-3 text-xs">
                    <summary className="cursor-pointer text-brand-deep">
                      Conferir textos usados no briefing
                    </summary>
                    <div className="mt-3 max-h-52 space-y-3 overflow-y-auto whitespace-pre-wrap break-words">
                      {p.appointments.map((a, i) => (
                        <p key={i}>
                          Compromisso: {a.title}. Anotação de {a.author}:{" "}
                          {a.notes || "Não informada."}
                        </p>
                      ))}
                      {p.submissions.map((s, i) => (
                        <div key={i}>
                          <p>
                            Envio de {new Date(s.at).toLocaleString("pt-BR")} ·{" "}
                            {s.reviewed ? "Revisado" : "Não revisado"}
                          </p>
                          <p>Relato: {s.notes.symptoms || "Não informado"}</p>
                          <p>Medicamentos: {s.notes.medicines || "Não informados"}</p>
                          <p>Perguntas: {s.notes.questions || "Não informadas"}</p>
                        </div>
                      ))}
                      {p.guidance.map((g, i) => (
                        <p key={i}>
                          Orientação publicada: {g.title} — {g.text}
                        </p>
                      ))}
                    </div>
                  </details>
                </article>
              ))}
            </div>
            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
              A IA organiza os textos disponíveis. O conteúdo dos PDFs e áudios não é enviado nem
              analisado neste briefing. Suspeitas só aparecem quando explicitamente registradas; não
              há diagnóstico ou agendamento automático.
            </p>
            <label className="mt-4 flex items-start gap-2 text-xs leading-relaxed">
              <input
                className="mt-0.5"
                type="checkbox"
                checked={consent}
                disabled={busy}
                onChange={(e) => setConsent(e.target.checked)}
              />
              Autorizo enviar ao Gemini os textos {real ? "do prontuário" : "fictícios"} exibidos
              acima, horários, status e contagens de anexos. Identificadores de conta e CPF não são
              incluídos; os textos livres são enviados como estão.
            </label>
            <Button
              className="mt-4"
              disabled={busy || !consent || !status?.available}
              onClick={() => void generate()}
            >
              <Sparkles />
              {busy
                ? "Preparando briefing…"
                : mode === "upcoming"
                  ? "Gerar briefing dos próximos 30 dias"
                  : "Gerar briefing do dia"}
            </Button>
            {status && !status.available && (
              <p className="mt-2 text-xs text-muted-foreground">{status.message}</p>
            )}
          </>
        )
      )}
      {error && (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {error}
        </p>
      )}
      {result && current.current === key && (
        <div className="mt-5 space-y-4 border-t border-border pt-5">
          <p className="text-xs text-muted-foreground">
            Gerado por IA · {result.model} ·{" "}
            {new Date(result.generatedAt).toLocaleTimeString("pt-BR")}. Confira os registros
            originais antes da consulta.
          </p>
          {result.summary.patients.map((p) => {
            const source = result.context.patients.find((item) => item.reference === p.reference);
            return (
              <article key={p.reference} className="rounded-xl border border-brand/20 p-4">
                <h3 className="font-semibold">
                  {patients.find((patient) => patient.id === source?.patientId)?.name ??
                    p.reference}
                </h3>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{p.summary}</p>
                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  {[
                    ["Suspeitas registradas", p.recordedSuspicions],
                    ["Pontos para conferir", p.reviewPoints],
                    ["Informações faltantes", p.missingInformation],
                  ].map(([label, entries]) => (
                    <div key={String(label)}>
                      <p className="text-xs font-semibold text-brand-deep">{String(label)}</p>
                      {(entries as string[]).length ? (
                        <ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-relaxed">
                          {(entries as string[]).map((text, i) => (
                            <li key={i}>{text}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2 text-xs text-muted-foreground">
                          {label === "Suspeitas registradas"
                            ? "Nenhuma suspeita médica identificada nos textos."
                            : "Nenhum item informado pela IA."}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
                {source && (
                  <Button asChild variant="outline" size="sm" className="mt-4">
                    <Link
                      to="/patients/$patientId"
                      params={{ patientId: source.patientId }}
                      search={real ? { workspace: "account" } : {}}
                      hash="Envios do paciente"
                    >
                      Abrir envios do paciente
                    </Link>
                  </Button>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
