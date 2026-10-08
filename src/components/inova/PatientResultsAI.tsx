import { useEffect, useState } from "react";
import { Sparkles, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAiStatus, interpretPatientResults } from "@/lib/ai";
import type { PatientExplanation } from "@/lib/patient-results-ai.server";
import type { MarkerKey } from "@/lib/marker-reference";

export function PatientResultsAI({
  mode,
  periods,
  markers,
}: {
  mode: "results" | "history";
  periods: string[];
  markers: MarkerKey[];
}) {
  const [available, setAvailable] = useState(false);
  const [message, setMessage] = useState("Conferindo disponibilidade da IA…");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{
    explanation: PatientExplanation;
    model: string;
    at: string;
  } | null>(null);
  useEffect(() => {
    let current = true;
    void getAiStatus()
      .then((status) => {
        if (current) {
          setAvailable(status.available);
          setMessage(status.message + (status.model ? ` Modelo: ${status.model}.` : ""));
        }
      })
      .catch(() => {
        if (current)
          setMessage("Não foi possível verificar a IA. Reabra esta seção para tentar novamente.");
      });
    return () => {
      current = false;
    };
  }, []);
  async function analyze() {
    if (!confirmed || busy || !available) return;
    setBusy(true);
    setError("");
    try {
      const response = await interpretPatientResults({
        data: { mode, periods, markers, confirmed: true },
      });
      if (!response.ok) {
        setError(response.error);
        return;
      }
      setResult({
        explanation: response.explanation,
        model: response.model,
        at: new Date().toISOString(),
      });
    } catch {
      setError("Não foi possível interpretar agora. Confira a conexão e tente novamente.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="rounded-2xl border border-brand/25 bg-white p-5"
      aria-label="Interpretação dos resultados por IA"
    >
      <h3 className="flex items-center gap-2 text-lg font-semibold text-brand-deep">
        <Sparkles className="size-5" />
        {mode === "history" ? "Entenda sua evolução com IA" : "Entenda seus resultados com IA"}
      </h3>
      <p className="mt-2 text-sm text-muted-foreground">
        {mode === "history"
          ? "Uma explicação das mudanças nos valores do período selecionado."
          : "Uma explicação dos marcadores exibidos nesta coleta."}{" "}
        Dados fictícios · {periods.join(" → ")}
      </p>
      <p className="mt-2 text-xs text-muted-foreground">{message}</p>
      <label className="mt-4 flex items-start gap-2 text-xs leading-relaxed">
        <input
          type="checkbox"
          checked={confirmed}
          disabled={busy}
          onChange={(event) => setConfirmed(event.target.checked)}
          className="mt-1"
        />
        Autorizo enviar ao Google Gemini os valores fictícios selecionados, unidades, idade na
        última coleta e parâmetros de referência. Nome, CPF, nascimento, áudios e documentos não
        serão enviados nesta análise.
      </label>
      <Button
        type="button"
        className="mt-4"
        disabled={!available || !confirmed || busy}
        onClick={() => {
          void analyze();
        }}
      >
        {busy ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
        {busy ? "Interpretando…" : result ? "Interpretar novamente" : "Interpretar com Gemini"}
      </Button>
      {busy && (
        <p role="status" className="mt-3 text-sm text-muted-foreground">
          Preparando sua explicação. Você pode continuar consultando os resultados.
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      )}
      {result && (
        <div
          className="mt-5 max-h-[560px] space-y-4 overflow-y-auto overscroll-contain border-t border-border pt-4"
          role="region"
          aria-label="Explicação gerada por IA"
          tabIndex={0}
        >
          <p className="text-xs text-muted-foreground">
            Gerado pelo Gemini · {result.model} · {new Date(result.at).toLocaleString("pt-BR")} ·
            não revisado pelo médico
          </p>
          <div className="rounded-xl border border-brand/20 bg-brand-soft p-4">
            <h4 className="font-semibold">Resumo para você</h4>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
              {result.explanation.summary}
            </p>
          </div>
          {result.explanation.markers.map((item) => (
            <article key={item.name}>
              <h4 className="text-sm font-semibold">{item.name}</h4>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                {item.explanation}
              </p>
            </article>
          ))}
          <h4 className="text-sm font-semibold">O que ainda precisa ser confirmado</h4>
          <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            {result.explanation.limitations.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
          {result.explanation.questions.length > 0 && (
            <>
              <h4 className="text-sm font-semibold">Perguntas para sua consulta</h4>
              <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                {result.explanation.questions.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        A IA pode errar. Esta explicação não estabelece diagnóstico nem orienta tratamento. Confira
        o laudo original e converse com seu médico. O resultado fica apenas nesta tela durante a
        sessão.
      </p>
    </section>
  );
}
