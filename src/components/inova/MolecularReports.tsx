import { useEffect, useRef, useState } from "react";
import {
  Dna,
  FileText,
  Upload,
  Sparkles,
  ArrowRight,
  BookOpen,
  Check,
  LoaderCircle,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { EmptyState } from "./Page";
import { type ReportKind, type Evidence } from "@/data/molecular-reports";
import { useConsultation } from "./consultation-state";
import { getAiStatus, summarizeDocument } from "@/lib/ai";
import { MAX_PDF_BYTES } from "@/lib/ai-contract";
import { createSessionId } from "@/lib/session-id";

const isConclusion = (title: string) =>
  /\bconclus(?:ao|oes)\b/.test(
    title
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase(),
  );

const readBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("Não foi possível ler o PDF."));
    reader.readAsDataURL(file);
  });
export function MolecularReports({
  kind,
  patientName,
}: {
  kind: ReportKind;
  patientId: string;
  patientName: string;
}) {
  const {
    reportsByKind,
    setReportsByKind,
    reviewed,
    setReviewed,
    identityVerified,
    setIdentityVerified,
    selectedReports,
    setSelectedReports,
  } = useConsultation();
  const reports = reportsByKind[kind];
  const selectedId = selectedReports[kind] ?? reports[0]?.id ?? "";
  const setSelectedId = (id: string) => setSelectedReports((items) => ({ ...items, [kind]: id }));
  const [demoVisible, setDemoVisible] = useState("");
  const [source, setSource] = useState<Evidence | null>(null);
  const [available, setAvailable] = useState(false);
  const [status, setStatus] = useState("Verificando conexão com a IA...");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [url, setUrl] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [attaching, setAttaching] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const report = reports.find((item) => item.id === selectedId);
  useEffect(() => {
    let alive = true;
    getAiStatus()
      .then((result) => {
        if (alive) {
          setAvailable(result.available);
          setStatus(
            result.available
              ? "Gemini configurado para análise local de exemplos."
              : result.message,
          );
        }
      })
      .catch(() => {
        if (alive) setStatus("Não foi possível verificar a IA. Confira a conexão com o servidor.");
      });
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    setSource(null);
    setError("");
    setConfirmed(false);
    if (!report?.file) {
      setUrl("");
      return;
    }
    const objectUrl = URL.createObjectURL(report.file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [report?.id, report?.file]);
  const attach = async (file: File | undefined) => {
    if (!file) return;
    setUploadError("");
    setAttaching(true);
    try {
      if (!file.name.toLowerCase().endsWith(".pdf") || file.size > MAX_PDF_BYTES) {
        setUploadError("Selecione um PDF de até 8 MB.");
        return;
      }
      const signature = new TextDecoder().decode(await file.slice(0, 5).arrayBuffer());
      if (signature !== "%PDF-") {
        setUploadError("O arquivo não é um PDF válido.");
        return;
      }
      const id = createSessionId();
      setReportsByKind((items) => ({
        ...items,
        [kind]: [
          ...items[kind],
          {
            id,
            title: file.name,
            date: "Selecionado nesta sessão",
            source: "PDF local · ainda não enviado",
            demo: false,
            file,
            scope: "",
            findings: [],
            limitations: [],
          },
        ],
      }));
      setSelectedId(id);
      if (input.current) input.current.value = "";
      toast.success("PDF aberto. Confira o documento antes de solicitar a análise.");
    } catch {
      setUploadError(
        "Não foi possível abrir o arquivo. Confira se ele está disponível neste computador e selecione o PDF novamente.",
      );
    } finally {
      setAttaching(false);
      if (input.current) input.current.value = "";
    }
  };
  const analyze = async () => {
    if (!report?.file || !confirmed || !available || busy) return;
    const id = report.id;
    setBusy(id);
    setError("");
    try {
      const result = await summarizeDocument({
        data: { kind, pdf: await readBase64(report.file) },
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setReportsByKind((items) => ({
        ...items,
        [kind]: items[kind].map((item) =>
          item.id === id
            ? {
                ...item,
                analysis: result.summary,
                scope: result.summary.scope,
                findings: result.summary.findings,
                limitations: result.summary.limitations,
                pages: result.summary.pages,
                model: result.model,
                generatedAt: new Date().toISOString(),
                source: "PDF analisado pelo Gemini",
              }
            : item,
        ),
      }));
      setReviewed((items) => ({ ...items, [id]: false }));
      setIdentityVerified((items) => ({ ...items, [id]: false }));
      toast.success("Síntese gerada. Confira as fontes e a identidade no laudo.");
    } catch {
      setError("Falha na análise. Confira a conexão e tente novamente.");
    } finally {
      setBusy("");
    }
  };
  const showSummary = Boolean(report?.analysis) || demoVisible === report?.id;
  const pageLabel = (page: number | null) =>
    page === null ? "Página não identificada" : `p. ${page}`;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-semibold">
            Laudos {kind === "Laboratorial" ? "laboratoriais" : `de ${kind.toLowerCase()}`}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Consulte o documento original e uma síntese profissional com achados, limitações e
            fontes para revisão.
          </p>
        </div>
        <Button variant="outline" disabled={attaching} onClick={() => input.current?.click()}>
          <Upload />
          {attaching ? "Abrindo PDF..." : "Selecionar PDF"}
        </Button>
        <input
          ref={input}
          type="file"
          accept=".pdf,application/pdf"
          className="hidden"
          aria-label="Selecionar laudo PDF"
          onChange={(event) => {
            void attach(event.target.files?.[0]);
          }}
        />
      </div>
      {uploadError && (
        <p
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
        >
          {uploadError}
        </p>
      )}
      <div className="rounded-xl border border-border bg-white p-4 text-xs text-muted-foreground">
        {status} PDFs e resultados ficam apenas na memória desta sessão. Use documentos fictícios ou
        anonimizados neste ambiente demonstrativo.
      </div>
      <div className="grid items-start gap-5 lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="surface p-4">
          <p className="eyebrow mb-4">DOCUMENTOS DO PACIENTE</p>
          {reports.length ? (
            <div className="space-y-2">
              {reports.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                  aria-pressed={selectedId === item.id}
                  className={`w-full rounded-xl border p-4 text-left ${selectedId === item.id ? "border-brand/30 bg-brand-soft" : "border-transparent hover:bg-muted"}`}
                >
                  <FileText className="mb-3 size-5 text-brand-deep" />
                  <p className="break-words text-sm font-semibold">{item.title}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {item.demo
                      ? "Exemplo fictício"
                      : item.analysis
                        ? "Analisado · conferir fontes"
                        : "PDF pronto para análise"}
                  </p>
                  <p className="mt-2 text-[10px] text-muted-foreground">
                    {reviewed[item.id] ? "Revisado nesta sessão" : "Pendente de revisão"}
                  </p>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhum laudo nesta categoria. Selecione um PDF de exemplo para começar.
            </p>
          )}
        </aside>
        <div className="min-w-0 space-y-5">
          {report ? (
            <>
              <section className="surface p-5">
                <p className="eyebrow">
                  {patientName} · {kind.toUpperCase()}
                </p>
                <h3 className="mt-3 break-words font-display text-xl font-semibold">
                  {report.title}
                </h3>
                <p className="mt-2 text-xs text-muted-foreground">
                  {report.source}
                  {report.pages
                    ? ` · ${report.pages} páginas ${report.demo ? "ilustrativas" : ""}`
                    : ""}
                </p>
                {report.demo ? (
                  <Button
                    className="mt-5"
                    disabled={demoVisible === report.id}
                    onClick={() => setDemoVisible(report.id)}
                  >
                    <Sparkles />
                    Ver resumo demonstrativo
                  </Button>
                ) : (
                  <>
                    <label className="mt-5 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={confirmed}
                        onChange={(event) => setConfirmed(event.target.checked)}
                        className="mt-1 accent-[#087f9a]"
                      />
                      Confirmo que este PDF é fictício ou anonimizado. Ao analisar, seu conteúdo
                      será enviado ao Google Gemini.
                    </label>
                    {!available && (
                      <p role="status" className="mt-3 text-sm text-amber-800">
                        Análise indisponível: {status}
                      </p>
                    )}
                    {available && !confirmed && (
                      <p className="mt-3 text-xs text-muted-foreground">
                        Marque a confirmação acima para habilitar a análise.
                      </p>
                    )}
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        disabled={!available || !confirmed || Boolean(busy)}
                        onClick={() => {
                          void analyze();
                        }}
                      >
                        {busy === report.id ? (
                          <LoaderCircle className="animate-spin" />
                        ) : (
                          <Sparkles />
                        )}
                        {busy === report.id
                          ? "Analisando documento..."
                          : report.analysis
                            ? "Gerar nova síntese"
                            : "Analisar com Gemini"}
                      </Button>
                      <Button
                        variant="ghost"
                        disabled={Boolean(busy)}
                        onClick={() => {
                          setReportsByKind((items) => ({
                            ...items,
                            [kind]: items[kind].filter((item) => item.id !== report.id),
                          }));
                          setSelectedId(reports.find((item) => item.id !== report.id)?.id ?? "");
                          setReviewed((items) => {
                            const copy = { ...items };
                            delete copy[report.id];
                            return copy;
                          });
                        }}
                      >
                        <Trash2 />
                        Remover da sessão
                      </Button>
                    </div>
                    {error && (
                      <p
                        role="alert"
                        className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700"
                      >
                        {error}
                      </p>
                    )}
                  </>
                )}
              </section>
              <div
                className={
                  url && showSummary ? "grid items-start gap-5 xl:grid-cols-2" : "space-y-5"
                }
              >
                {url && (
                  <section className="surface overflow-hidden">
                    <div className="flex items-center justify-between gap-2 p-4">
                      <h3 className="text-sm font-semibold">Documento original</h3>
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-medium text-brand-deep"
                      >
                        Abrir PDF
                      </a>
                    </div>
                    <iframe
                      title={`Laudo original: ${report.title}`}
                      src={source?.page ? `${url}#page=${source.page}` : url}
                      className="h-[min(650px,60dvh)] w-full border-t border-border"
                    />
                    <p className="p-3 text-[11px] text-muted-foreground">
                      Se o navegador não exibir o documento, use Abrir PDF.
                    </p>
                  </section>
                )}
                {showSummary && (
                  <section
                    className="insight-panel flex max-h-[min(760px,80dvh)] flex-col"
                    aria-live="polite"
                  >
                    <header className="insight-header shrink-0">
                      <div className="flex items-center gap-3">
                        <span className="insight-symbol">
                          <Sparkles className="size-5" />
                        </span>
                        <div>
                          <p className="eyebrow">INTELIGÊNCIA INOVA</p>
                          <h3 className="mt-1 font-display text-lg font-semibold">
                            Síntese para revisão médica
                          </h3>
                        </div>
                      </div>
                      <span className="insight-label">
                        {report.demo ? "Ilustrativo · sem IA" : "Gerado pelo Gemini · validar"}
                      </span>
                    </header>
                    <div
                      className="insight-body min-h-0 overflow-y-auto overscroll-contain [scrollbar-gutter:stable]"
                      role="region"
                      aria-label="Resultado da análise por IA"
                      tabIndex={0}
                    >
                      {report.analysis && (
                        <div className="mb-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm">
                          <p className="mb-2 font-semibold">
                            Conferência de identidade obrigatória
                          </p>
                          <p className="mb-2">
                            Paciente selecionado: <strong>{patientName}</strong>
                          </p>
                          <strong>Identidade no laudo:</strong>{" "}
                          {report.analysis.subjectName ?? "Não identificada"}
                          <p className="mt-2 text-xs leading-relaxed">
                            Confira se o documento pertence ao paciente selecionado. Nenhum
                            resultado foi adicionado automaticamente ao histórico.
                          </p>
                          {report.analysis.subjectName &&
                            report.analysis.subjectName
                              .normalize("NFD")
                              .replace(/[\u0300-\u036f]/g, "")
                              .trim()
                              .toLowerCase() !==
                              patientName
                                .normalize("NFD")
                                .replace(/[\u0300-\u036f]/g, "")
                                .trim()
                                .toLowerCase() && (
                              <p role="alert" className="mt-3 font-semibold text-amber-900">
                                O nome no laudo difere do paciente selecionado. Confira o original e
                                o cadastro; não use a síntese neste prontuário sem confirmar a
                                identidade.
                              </p>
                            )}
                          <label className="mt-3 flex items-start gap-2 text-xs leading-relaxed">
                            <input
                              type="checkbox"
                              checked={!!identityVerified[report.id]}
                              onChange={(event) => {
                                setIdentityVerified((items) => ({
                                  ...items,
                                  [report.id]: event.target.checked,
                                }));
                                if (!event.target.checked)
                                  setReviewed((items) => ({ ...items, [report.id]: false }));
                              }}
                              className="mt-1"
                            />
                            Conferi a identidade no documento original e confirmo que este laudo
                            pertence ao paciente selecionado. O nome extraído pela IA pode conter
                            erros.
                          </label>
                        </div>
                      )}
                      <p className="text-sm leading-relaxed">{report.scope}</p>
                      {[
                        { title: "Achados e escopo", items: report.findings },
                        { title: "Limitações e pontos de revisão", items: report.limitations },
                      ].map((group) => (
                        <div className="mt-6" key={group.title}>
                          <h4 className="insight-section-title">
                            <Dna className="size-4" />
                            {group.title}
                          </h4>
                          <div className="mt-3 space-y-4">
                            {group.items.length ? (
                              group.items.map((finding, index) => (
                                <article
                                  className={
                                    isConclusion(finding.title)
                                      ? "rounded-xl border border-brand/30 border-l-4 border-l-brand bg-brand-soft p-5 shadow-sm"
                                      : "border-b border-border pb-4"
                                  }
                                  key={index}
                                >
                                  <h5
                                    className={
                                      isConclusion(finding.title)
                                        ? "flex items-center gap-2 text-base font-bold text-brand-deep"
                                        : "text-sm font-semibold"
                                    }
                                  >
                                    {isConclusion(finding.title) && (
                                      <FileText className="size-5 shrink-0" aria-hidden="true" />
                                    )}
                                    {finding.title}
                                  </h5>
                                  <p
                                    className={
                                      isConclusion(finding.title)
                                        ? "mt-3 text-sm leading-7 text-foreground"
                                        : "mt-2 text-sm leading-relaxed text-muted-foreground"
                                    }
                                  >
                                    {finding.text}
                                  </p>
                                  <button
                                    onClick={() => setSource(finding)}
                                    className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand-deep"
                                  >
                                    <BookOpen className="size-3" />
                                    {report.demo
                                      ? "Fonte ilustrativa"
                                      : "Conferir fonte sugerida"}{" "}
                                    · {pageLabel(finding.page)}
                                    <ArrowRight className="size-3" />
                                  </button>
                                </article>
                              ))
                            ) : (
                              <p className="text-xs text-muted-foreground">
                                Nenhum item identificado nesta seção.
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                      {report.analysis && report.analysis.observations.length > 0 && (
                        <div className="mt-6">
                          <h4 className="insight-section-title">
                            Resultados extraídos · conferir no original
                          </h4>
                          <div className="mt-3 space-y-3">
                            {report.analysis.observations.map((item, index) => (
                              <button
                                key={index}
                                className="block w-full rounded-lg border border-border p-3 text-left"
                                onClick={() =>
                                  setSource({
                                    page: item.page,
                                    title: item.name,
                                    text: `${item.value} ${item.unit} · Referência no laudo: ${item.reference || "não informada"}`,
                                    quote: item.quote,
                                  })
                                }
                              >
                                <span className="text-sm font-medium">
                                  {item.name}: {item.value} {item.unit}
                                </span>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  Referência: {item.reference || "não informada"} ·{" "}
                                  {pageLabel(item.page)}
                                </p>
                                {item.flag !== "sem_classificacao" && (
                                  <p className="mt-1 text-xs text-amber-700">
                                    {item.flag === "reportado_critico"
                                      ? "Crítico informado pelo laudo"
                                      : "Alteração informada pelo laudo"}{" "}
                                    · confirmar no documento
                                  </p>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="mt-6 border-t border-border pt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={
                            !!reviewed[report.id] ||
                            (!!report.analysis && !identityVerified[report.id])
                          }
                          onClick={() => setReviewed((items) => ({ ...items, [report.id]: true }))}
                        >
                          <Check />
                          {reviewed[report.id]
                            ? "Revisado nesta sessão"
                            : "Marcar síntese como revisada"}
                        </Button>
                      </div>
                    </div>
                    <footer className="insight-footer shrink-0">
                      {report.demo
                        ? "Exemplo fictício, sem PDF original."
                        : "A síntese pode conter erros de extração; referências e trechos devem ser conferidos no PDF. Sem diagnóstico ou prescrição."}
                      {report.model ? ` Modelo: ${report.model}.` : ""}
                    </footer>
                  </section>
                )}
              </div>
            </>
          ) : (
            <EmptyState
              title="Laudos em um só lugar"
              text="Selecione um documento para consultar o original e gerar uma síntese com fontes."
            />
          )}
        </div>
      </div>
      <Dialog
        open={source !== null}
        onOpenChange={(open) => {
          if (!open) setSource(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{source?.title}</DialogTitle>
            <DialogDescription>
              {report?.title} · {pageLabel(source?.page ?? null)}
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm leading-relaxed">{source?.text}</p>
          {source?.quote && (
            <blockquote className="rounded-lg border-l-2 border-brand bg-brand-soft p-3 text-sm">
              {source.quote}
            </blockquote>
          )}
          <p className="text-xs text-muted-foreground">
            {report?.demo
              ? "Trecho fictício da demonstração."
              : "Trecho extraído pela IA. Confira a transcrição e a página no original."}
          </p>
          {url && (
            <Button asChild variant="outline">
              <a
                href={source?.page ? `${url}#page=${source.page}` : url}
                target="_blank"
                rel="noreferrer"
              >
                Abrir página no PDF
                <BookOpen />
              </a>
            </Button>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
