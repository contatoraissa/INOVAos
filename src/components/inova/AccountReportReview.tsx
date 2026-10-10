import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getRealAiStatus } from "@/lib/real-workspace-ai";
import { FileText, Sparkles, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState, StatusBadge } from "./Page";
import {
  openMedicalReport,
  uploadMedicalReport,
  analyzeMedicalReport,
  reviewMedicalReport,
  saveManualMedicalResults,
  type MedicalReport,
} from "@/lib/medical-reports";
import { MAX_PDF_BYTES } from "@/lib/ai-contract";

export function AccountReportReview({
  patientId,
  patientName,
  userId,
  reports,
  kind,
  refresh,
  initialReportId,
}: {
  patientId: string;
  patientName: string;
  userId: string;
  reports: MedicalReport[];
  kind: MedicalReport["kind"];
  refresh: () => Promise<unknown>;
  initialReportId?: string;
}) {
  const cache = useQueryClient();
  const ai = useQuery({
    queryKey: ["account-ai-status", userId],
    queryFn: () => getRealAiStatus(),
    retry: false,
  });
  const [selected, setSelected] = useState(initialReportId ?? "");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [consent, setConsent] = useState(false),
    [confirmed, setConfirmed] = useState(false);
  const [collection, setCollection] = useState("");
  const [manual, setManual] = useState("");
  const list = reports.filter((r) => r.kind === kind);
  const report = list.find((r) => r.id === selected) ?? list[0];
  useEffect(() => {
    let alive = true;
    setUrl("");
    setError("");
    setConsent(false);
    setConfirmed(false);
    setManual("");
    setCollection("");
    if (report)
      void openMedicalReport({ data: { patientId, id: report.id } })
        .then((value) => {
          if (alive) setUrl(value.url);
        })
        .catch((cause) => {
          if (alive) setError(cause.message);
        });
    return () => {
      alive = false;
    };
  }, [patientId, report?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  async function act(task: () => Promise<unknown>) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await task();
      await refresh();
      await cache.invalidateQueries({ queryKey: ["account-exams", userId] });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível concluir a ação.");
    } finally {
      setBusy(false);
    }
  }
  async function attach(file: File) {
    await act(async () => {
      if (
        file.size > MAX_PDF_BYTES ||
        !/\.pdf$/i.test(file.name) ||
        new TextDecoder().decode(await file.slice(0, 5).arrayBuffer()) !== "%PDF-"
      )
        throw new Error("Selecione um PDF válido de até 8 MB.");
      const pdf = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1]!);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const saved = await uploadMedicalReport({
        data: { patientId, filename: file.name, kind, pdf },
      });
      setSelected(saved.id);
    });
  }
  return (
    <div className="space-y-5">
      <section className="surface flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <p className="eyebrow">LAUDOS E DOCUMENTOS</p>
          <h2 className="mt-2 text-xl font-semibold">
            {kind === "Laboratorial" ? "Laudos laboratoriais" : `Laudos de ${kind.toLowerCase()}`}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Abra o original, confira a identidade e revise a síntese antes de liberar os dados.
          </p>
        </div>
        <label className="cursor-pointer rounded-lg bg-brand px-4 py-3 text-sm font-semibold text-white">
          <Upload className="mr-2 inline size-4" />
          Adicionar PDF
          <input
            aria-label={`Adicionar PDF ${kind}`}
            type="file"
            accept=".pdf,application/pdf"
            className="sr-only"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void attach(file);
              e.target.value = "";
            }}
          />
        </label>
      </section>
      {error && (
        <p role="alert" className="surface p-4 text-sm text-destructive">
          {error}
        </p>
      )}
      {!report ? (
        <EmptyState
          title="Nenhum laudo disponível"
          text="Adicione um PDF deste paciente para abrir o original e solicitar uma análise assistida por IA."
        />
      ) : (
        <div className="grid items-start gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="surface max-h-[600px] space-y-3 overflow-auto p-4">
            {list.map((r) => (
              <button
                key={r.id}
                disabled={busy}
                className={`w-full rounded-xl border p-4 text-left ${report.id === r.id ? "border-brand bg-brand-soft" : "bg-white"}`}
                onClick={() => setSelected(r.id)}
              >
                <FileText className="size-5 text-brand" />
                <p className="mt-3 break-words text-sm font-semibold">{r.filename}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleDateString("pt-BR")}
                </p>
                <div className="mt-3">
                  <StatusBadge fresh={!r.reviewed_at}>
                    {r.reviewed_at ? "Revisado" : "Aguardando revisão"}
                  </StatusBadge>
                </div>
              </button>
            ))}
          </aside>
          <div className="space-y-5">
            <div className={report.summary ? "grid items-start gap-5 xl:grid-cols-2" : "space-y-5"}>
              <section className="surface p-5">
                <h3 className="font-semibold">Documento original · {patientName}</h3>
                {url ? (
                  <>
                    <iframe
                      title="PDF original do prontuário"
                      src={url}
                      className="mt-4 h-[min(650px,60dvh)] w-full rounded-lg border"
                    />
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-block text-sm text-brand-deep underline"
                    >
                      Abrir original em outra aba
                    </a>
                  </>
                ) : (
                  <p role="status" className="mt-3 text-sm">
                    Carregando documento…
                  </p>
                )}
              </section>
              <div className="space-y-5">
                {!report.reviewed_at && (
                  <section className="surface space-y-4 p-5">
                    <h3 className="flex items-center gap-2 font-semibold">
                      <Sparkles className="size-5 text-brand" />
                      Síntese assistida por IA
                    </h3>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      A solicitação envia o PDF inteiro ao Gemini, incluindo os dados que constam
                      nele. Confira o documento e sua autorização para compartilhar antes de
                      continuar.
                    </p>
                    {!ai.data?.available && (
                      <p role="status" className="text-sm text-amber-800">
                        {ai.data?.message ?? "Conferindo disponibilidade da IA…"}
                      </p>
                    )}
                    <label className="flex gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={consent}
                        disabled={busy}
                        onChange={(e) => setConsent(e.target.checked)}
                      />
                      Autorizo enviar este PDF ao Gemini para gerar uma síntese.
                    </label>
                    <Button
                      disabled={!consent || busy || !ai.data?.available}
                      onClick={() =>
                        void act(() =>
                          analyzeMedicalReport({
                            data: {
                              patientId,
                              id: report.id,
                              consent: true,
                              regenerate: Boolean(report.summary),
                            },
                          }),
                        )
                      }
                    >
                      <Sparkles />
                      {busy
                        ? "Processando…"
                        : report.summary
                          ? "Gerar nova síntese"
                          : "Analisar laudo com IA"}
                    </Button>
                  </section>
                )}
                {report.summary && (
                  <section className="insight-panel flex max-h-[min(760px,80dvh)] flex-col">
                    <header className="insight-header shrink-0">
                      <span className="insight-symbol">
                        <Sparkles className="size-5" />
                      </span>
                      <div>
                        <p className="eyebrow">INTELIGÊNCIA INOVA</p>
                        <h3 className="mt-1 font-display text-lg font-semibold">
                          Síntese para revisão médica
                        </h3>
                      </div>
                      <span className="insight-label">Validar no original</span>
                    </header>
                    <div
                      className="insight-body min-h-0 space-y-4 overflow-y-auto overscroll-contain [scrollbar-gutter:stable]"
                      role="region"
                      aria-label="Resultado da análise por IA"
                      tabIndex={0}
                    >
                      <p className="text-xs text-muted-foreground">
                        {report.summary.pages} página(s) · síntese vinculada a este documento
                      </p>
                      <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm">
                        <p className="font-semibold">Conferência de identidade obrigatória</p>
                        <p className="mt-2">Paciente selecionado: {patientName}</p>
                        <p className="mt-2">
                          Identidade no laudo: {report.summary.subjectName ?? "Não identificada"}
                        </p>
                        {report.summary.subjectName &&
                          report.summary.subjectName
                            .normalize("NFD")
                            .replace(/[\u0300-\u036f]/g, "")
                            .toLowerCase()
                            .trim() !==
                            patientName
                              .normalize("NFD")
                              .replace(/[\u0300-\u036f]/g, "")
                              .toLowerCase()
                              .trim() && (
                            <p role="alert" className="mt-3 font-semibold text-amber-900">
                              O nome no laudo difere do paciente selecionado. Confira o original e o
                              cadastro antes de liberar os resultados.
                            </p>
                          )}
                      </div>
                      <p className="text-sm">{report.summary.scope}</p>
                      {report.summary.findings.map((f, i) => (
                        <article key={i} className="rounded-xl border p-4">
                          <h4 className="font-semibold">{f.title}</h4>
                          <p className="mt-2 text-sm">{f.text}</p>
                          <details className="mt-3 text-xs">
                            <summary className="cursor-pointer text-brand-deep">
                              Conferir fontes no laudo
                            </summary>
                            <blockquote className="mt-2 whitespace-pre-wrap border-l-2 pl-3">
                              {f.quote || "Trecho literal não identificado."}
                            </blockquote>
                            {f.page !== null && url && (
                              <a
                                className="mt-2 inline-block underline"
                                href={`${url.split("#")[0]}#page=${f.page}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                Abrir página {f.page} do original
                              </a>
                            )}
                          </details>
                        </article>
                      ))}
                      {report.summary.limitations.map((item, i) => (
                        <details key={i} className="rounded-xl border bg-muted/20 p-4 text-xs">
                          <summary className="cursor-pointer font-semibold">{item.title}</summary>
                          <p className="mt-2 text-muted-foreground">{item.text}</p>
                          <blockquote className="mt-3 border-l pl-3">
                            {item.quote || "Trecho literal não identificado."}
                          </blockquote>
                          {item.page !== null && url && (
                            <a
                              href={`${url.split("#")[0]}#page=${item.page}`}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-3 inline-block text-brand-deep underline"
                            >
                              Abrir página {item.page} do original
                            </a>
                          )}
                        </details>
                      ))}
                      {!!report.summary.observations.length && (
                        <div className="overflow-x-auto">
                          <table className="data-table">
                            <thead>
                              <tr>
                                <th>Exame</th>
                                <th>Valor</th>
                                <th>Referência</th>
                                <th>Página</th>
                                <th>Fonte</th>
                              </tr>
                            </thead>
                            <tbody>
                              {report.summary.observations.map((r, i) => (
                                <tr key={i}>
                                  <td>{r.name}</td>
                                  <td>
                                    {r.value} {r.unit}
                                  </td>
                                  <td>{r.reference}</td>
                                  <td>{r.page ?? "Não informada"}</td>
                                  <td>
                                    <details>
                                      <summary className="cursor-pointer text-brand-deep">
                                        Conferir no original
                                      </summary>
                                      <blockquote className="mt-2 border-l pl-3">
                                        {r.quote || "Trecho literal não identificado."}
                                      </blockquote>
                                      {r.page !== null && url && (
                                        <a
                                          href={`${url.split("#")[0]}#page=${r.page}`}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="mt-2 block underline"
                                        >
                                          Abrir página {r.page}
                                        </a>
                                      )}
                                    </details>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </section>
                )}
              </div>
            </div>
            {!report.reviewed_at && (
              <section className="surface space-y-4 p-5">
                <h3 className="font-semibold">Revisão médica e liberação</h3>
                <label className="block text-sm">
                  Data da coleta
                  <Input
                    type="date"
                    required
                    value={collection}
                    onChange={(e) => setCollection(e.target.value)}
                  />
                </label>
                {kind === "Laboratorial" && (
                  <label className="block text-sm">
                    Preencher ou corrigir resultados manualmente
                    <Textarea
                      value={manual}
                      onChange={(e) => setManual(e.target.value)}
                      className="mt-2 min-h-28"
                      placeholder="Uma linha por exame: Nome | Valor | Unidade | Referência"
                    />
                    <span className="mt-2 block text-xs text-muted-foreground">
                      Use quatro campos separados por |. A data e os valores devem corresponder ao
                      PDF original.
                    </span>
                  </label>
                )}
                <label className="flex gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    disabled={busy}
                    onChange={(e) => setConfirmed(e.target.checked)}
                  />
                  Conferi a identidade de {patientName}, o PDF original, a data e os dados que serão
                  liberados.
                </label>
                <Button
                  disabled={
                    busy || !confirmed || !collection || (!report.summary && !manual.trim())
                  }
                  onClick={() =>
                    void act(async () => {
                      if (manual.trim()) {
                        const observations = manual
                          .trim()
                          .split(/\r?\n/)
                          .map((line) => {
                            const fields = line.split("|").map((v) => v.trim());
                            if (fields.length !== 4)
                              throw new Error(
                                "Use Nome | Valor | Unidade | Referência em cada linha.",
                              );
                            return {
                              name: fields[0]!,
                              value: fields[1]!,
                              unit: fields[2]!,
                              reference: fields[3]!,
                            };
                          });
                        await saveManualMedicalResults({
                          data: {
                            patientId,
                            id: report.id,
                            confirmed: true,
                            collectionDate: collection,
                            observations,
                          },
                        });
                      } else
                        await reviewMedicalReport({
                          data: {
                            patientId,
                            id: report.id,
                            confirmed: true,
                            collectionDate: collection,
                          },
                        });
                    })
                  }
                >
                  Confirmar revisão e liberar para o paciente
                </Button>
              </section>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
