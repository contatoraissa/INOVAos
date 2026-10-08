import { useCallback, useEffect, useRef, useState } from "react";
import { Check, FileText, LoaderCircle, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getPreparationAttachment,
  listPreparations,
  removePreparation,
  reviewPreparation,
} from "@/lib/preparation";
import { preparationLabels, type PreparationReceipt } from "@/lib/preparation-contract";
import { useConsultation } from "./consultation-state";
import type { ReportKind } from "@/data/molecular-reports";
type Destination = "Laudos laboratoriais" | "Genética" | "Genômica";
function ReceivedAttachment({
  receiptId,
  index,
  kind,
  name,
  onAnalyze,
}: {
  receiptId: string;
  index: number;
  kind: "audio" | "document";
  name: string;
  onAnalyze?: (file: File) => void;
}) {
  const [media, setMedia] = useState<{ file: File; url: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(
    () => () => {
      if (media) URL.revokeObjectURL(media.url);
    },
    [media],
  );
  async function load() {
    setBusy(true);
    setError("");
    try {
      const result = await getPreparationAttachment({ data: { id: receiptId, kind, index } });
      if (!alive.current) return;
      const binary = atob(result.data);
      const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
      const file = new File([bytes], name, { type: result.mime });
      setMedia({ file, url: URL.createObjectURL(file) });
    } catch {
      setError("Não foi possível abrir o anexo. Atualize a caixa e tente novamente.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mt-3">
      {!media ? (
        <Button
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => {
            void load();
          }}
        >
          {busy ? (
            <LoaderCircle className="size-3 animate-spin" />
          ) : (
            <FileText className="size-3" />
          )}
          {busy
            ? "Carregando anexo…"
            : kind === "audio"
              ? "Ouvir áudio recebido"
              : "Abrir laudo recebido"}
        </Button>
      ) : kind === "audio" ? (
        <audio
          controls
          preload="metadata"
          className="w-full"
          src={media.url}
          aria-label={`Áudio recebido: ${name}`}
        />
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <a
              href={media.url}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-brand-deep underline"
            >
              Abrir PDF em outra aba
            </a>
            {onAnalyze && (
              <Button variant="outline" size="sm" onClick={() => onAnalyze(media.file)}>
                Abrir na análise de laudos
              </Button>
            )}
          </div>
          <iframe
            title={`Laudo recebido: ${name}`}
            src={media.url}
            className="h-[50dvh] w-full rounded-lg border border-border"
          />
        </>
      )}
      {error && (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
export function PatientPreparationInbox({
  patientId,
  onNavigate,
}: {
  patientId: string;
  onNavigate: (destination: Destination) => void;
}) {
  const [items, setItems] = useState<PreparationReceipt[]>([]);
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { setReportsByKind, setSelectedReports } = useConsultation();
  const refresh = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const result = await listPreparations({ data: { patientId } });
      setItems(result);
      setSelected((current) =>
        result.some((item) => item.id === current) ? current : (result[0]?.id ?? ""),
      );
    } catch {
      setError("Não foi possível carregar a caixa demonstrativa. Confira o servidor e atualize.");
    } finally {
      setBusy(false);
    }
  }, [patientId]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  const receipt = items.find((item) => item.id === selected);
  function analyze(file: File, item: PreparationReceipt["documents"][number]) {
    const kind: ReportKind =
      item.kind === "Genética" || item.kind === "Genômica" ? item.kind : "Laboratorial";
    const id = `received-${selected}-${item.index}`;
    setReportsByKind((current) =>
      current[kind].some((report) => report.id === id)
        ? current
        : {
            ...current,
            [kind]: [
              ...current[kind],
              {
                id,
                title: file.name,
                date: "Recebido do paciente",
                source: "Enviado pelo paciente · confirmar identidade no laudo",
                demo: false,
                file,
                scope: "",
                findings: [],
                limitations: [],
              },
            ],
          },
    );
    setSelectedReports((current) => ({ ...current, [kind]: id }));
    onNavigate(kind === "Laboratorial" ? "Laudos laboratoriais" : kind);
  }
  async function act(action: "review" | "remove") {
    if (!receipt) return;
    setBusy(true);
    setError("");
    try {
      if (action === "review") await reviewPreparation({ data: { id: receipt.id } });
      else await removePreparation({ data: { id: receipt.id } });
      await refresh();
    } catch {
      setError("Não foi possível atualizar o envio. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-semibold">Preparação enviada pelo paciente</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Relatos, perguntas, medicamentos e laudos recebidos para revisão médica. Áudios são
            apresentados no original, sem transcrição automática.
          </p>
        </div>
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => {
            void refresh();
          }}
        >
          <RefreshCw className={busy ? "animate-spin" : ""} />
          Atualizar caixa
        </Button>
      </div>
      <p className="rounded-xl border border-border bg-white p-4 text-xs leading-relaxed text-muted-foreground">
        Caixa demonstrativa · envios temporários no servidor, por até 24 horas ou até reiniciar.
        Confirmar identidade e contexto antes de usar as informações.
      </p>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="grid items-start gap-5 xl:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="surface space-y-3 p-4">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => setSelected(item.id)}
              className={`w-full rounded-xl border p-4 text-left ${selected === item.id ? "border-brand/30 bg-brand-soft" : "border-border"}`}
            >
              <p className="text-sm font-semibold">
                {new Date(item.receivedAt).toLocaleString("pt-BR", {
                  timeZone: "America/Sao_Paulo",
                })}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {item.audios.length} áudio(s) · {item.documents.length} laudo(s)
              </p>
              <p className="mt-2 text-xs text-brand-deep">
                {item.reviewed ? "Revisado pelo médico" : "Aguardando revisão"}
              </p>
            </button>
          ))}
          {!items.length && (
            <p className="py-5 text-sm text-muted-foreground">
              {busy ? "Carregando envios…" : "Nenhuma preparação recebida deste paciente."}
            </p>
          )}
        </aside>
        {receipt ? (
          <div
            key={receipt.id}
            className="surface max-h-[80dvh] space-y-6 overflow-y-auto overscroll-contain p-6"
          >
            <h3 className="font-display text-lg font-semibold">Respostas do paciente</h3>
            {receipt.orderId && (
              <p className="text-xs text-muted-foreground">
                Envio relacionado ao pedido {receipt.orderId.slice(0, 8)} · associação escolhida
                pelo paciente.
              </p>
            )}
            {(Object.keys(preparationLabels) as (keyof typeof preparationLabels)[]).map((field) => (
              <section key={field} className="border-b border-border pb-5">
                <h4 className="text-sm font-semibold">{preparationLabels[field]}</h4>
                <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">
                  {receipt.notes[field] || "Sem resposta escrita."}
                </p>
                {receipt.audios
                  .filter((item) => item.field === field)
                  .map((item) => (
                    <ReceivedAttachment
                      key={item.index}
                      receiptId={receipt.id}
                      index={item.index}
                      kind="audio"
                      name={preparationLabels[field]}
                    />
                  ))}
              </section>
            ))}
            <section>
              <h4 className="text-sm font-semibold">Laudos anexados</h4>
              {receipt.documents.length ? (
                receipt.documents.map((item) => (
                  <article key={item.index} className="mt-4 rounded-xl border border-border p-4">
                    <p className="break-words text-sm font-medium">{item.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{item.kind}</p>
                    <ReceivedAttachment
                      receiptId={receipt.id}
                      index={item.index}
                      kind="document"
                      name={item.name}
                      onAnalyze={(file) => analyze(file, item)}
                    />
                  </article>
                ))
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">
                  Sem laudos anexados a este envio.
                </p>
              )}
            </section>
            <div className="flex flex-wrap gap-3 border-t border-border pt-5">
              <Button
                disabled={busy || receipt.reviewed}
                onClick={() => {
                  void act("review");
                }}
              >
                <Check />
                {receipt.reviewed ? "Envio revisado" : "Marcar envio como revisado"}
              </Button>
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() => {
                  void act("remove");
                }}
              >
                <Trash2 />
                Remover envio da caixa
              </Button>
            </div>
          </div>
        ) : (
          <div className="surface p-8 text-sm text-muted-foreground">
            O paciente pode enviar a preparação pelo seu portal. Clique em Atualizar caixa para
            buscar novos envios.
          </div>
        )}
      </div>
    </section>
  );
}
