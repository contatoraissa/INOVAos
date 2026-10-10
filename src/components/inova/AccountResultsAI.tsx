import { useState } from "react";
import { Sparkles } from "lucide-react";
import type { MedicalResult } from "@/lib/medical-reports";
import { interpretRealPatientResults } from "@/lib/real-workspace-ai";
import { resultSeries } from "@/lib/account-records";
import { Button } from "@/components/ui/button";
export function AccountResultsAI({
  patientId,
  results,
  history = false,
}: {
  patientId: string;
  results: MedicalResult[];
  history?: boolean;
}) {
  const series = resultSeries(results);
  const [names, setNames] = useState<string[]>([...new Set(series.map((s) => s.name))].slice(0, 4));
  const [consent, setConsent] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [result, setResult] = useState<Awaited<
    ReturnType<typeof interpretRealPatientResults>
  > | null>(null);
  const selected = history
    ? results.filter((r) => names.includes(r.name)).slice(-24)
    : series.filter((s) => names.includes(s.name)).map((s) => s.latest);
  if (!results.length) return null;
  return (
    <section className="surface space-y-4 border-brand/20 p-5">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-brand-deep">
          <Sparkles className="size-5" />
          {history ? "Entenda sua evolução com IA" : "Entenda seus resultados com IA"}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Selecione até quatro exames liberados. A explicação ajuda a preparar perguntas para seu
          médico.
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        {[...new Set(series.map((s) => s.name))].map((name) => (
          <label key={name} className="flex items-center gap-2 rounded-lg border p-3 text-sm">
            <input
              type="checkbox"
              checked={names.includes(name)}
              disabled={busy || (!names.includes(name) && names.length >= 4)}
              onChange={(e) => {
                setNames((old) =>
                  e.target.checked ? [...old, name] : old.filter((v) => v !== name),
                );
                setResult(null);
                setConsent(false);
              }}
            />
            {name}
          </label>
        ))}
      </div>
      <details className="text-xs">
        <summary className="cursor-pointer text-brand-deep">
          Conferir dados que serão enviados à IA
        </summary>
        <ul className="mt-3 space-y-2">
          {selected.map((r) => (
            <li key={r.id}>
              {r.name}: {r.value} {r.unit} · {r.collection_date} · referência:{" "}
              {r.reference || "Não informada"}
            </li>
          ))}
        </ul>
      </details>
      <label className="flex gap-2 text-xs leading-relaxed">
        <input
          type="checkbox"
          checked={consent}
          disabled={busy}
          onChange={(e) => setConsent(e.target.checked)}
        />
        Autorizo enviar ao Gemini os exames, valores, datas e referências exibidos. Meu nome, CPF,
        conta e os PDFs não serão incluídos.
      </label>
      <Button
        disabled={!selected.length || !consent || busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            setResult(
              await interpretRealPatientResults({
                data: { patientId, resultIds: selected.map((r) => r.id), confirmed: true },
              }),
            );
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : "Não foi possível interpretar.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <Sparkles />
        {busy ? "Preparando explicação…" : "Interpretar com IA"}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {result && (
        <div className="space-y-4 border-t pt-4">
          <p className="text-xs text-muted-foreground">
            Explicação por IA · {result.model} · confira os valores originais.
          </p>
          <p className="text-sm leading-relaxed">{result.explanation.summary}</p>
          {result.explanation.markers.map((m) => (
            <article key={m.name} className="rounded-xl bg-muted/30 p-4">
              <h3 className="font-semibold">{m.name}</h3>
              <p className="mt-2 text-sm leading-relaxed">{m.explanation}</p>
            </article>
          ))}
          <ul className="list-disc space-y-2 pl-5 text-xs text-muted-foreground">
            {result.explanation.limitations.map((v, i) => (
              <li key={i}>{v}</li>
            ))}
          </ul>
          <h3 className="font-semibold">Perguntas para o médico</h3>
          {result.explanation.questions.map((q, i) => (
            <p key={i} className="text-sm">
              {q}
            </p>
          ))}
        </div>
      )}
    </section>
  );
}
