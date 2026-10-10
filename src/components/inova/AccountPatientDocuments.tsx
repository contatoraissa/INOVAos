import { useEffect, useState } from "react";
import { FileText, Plus, Trash2 } from "lucide-react";
import { patientDraft } from "@/lib/patient-draft";
import { MAX_PDF_BYTES } from "@/lib/ai-contract";
import {
  consultationPayload,
  type ConsultationPayload,
  type ConsultationEntry,
} from "@/lib/real-consultation-contract";
import { AccountDocuments } from "./AccountClinicalPanels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSessionId } from "@/lib/session-id";
type LocalDocument = { id: string; name: string; kind: string; data: string; createdAt?: string };
export function AccountPatientDocuments({
  patientId,
  userId,
  reports,
  entries,
  onPrepare,
}: {
  patientId: string;
  userId: string;
  reports: Parameters<typeof AccountDocuments>[0]["reports"];
  entries: ConsultationEntry[];
  onPrepare: () => void;
}) {
  const key = `real:${userId}:${patientId}:documents`;
  const [local, setLocal] = useState<LocalDocument[]>([]),
    [ready, setReady] = useState(false),
    [selected, setSelected] = useState(""),
    [url, setUrl] = useState(""),
    [query, setQuery] = useState(""),
    [kind, setKind] = useState("Análises clínicas"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [chosen, setChosen] = useState<string[]>([]);
  useEffect(() => {
    let alive = true;
    void patientDraft<LocalDocument[]>(key, "read")
      .then((r) => {
        if (alive) {
          if (r?.value && !Array.isArray(r.value)) throw new Error("Cópia local inválida.");
          setLocal(r?.value ?? []);
          setReady(true);
        }
      })
      .catch(() => {
        if (alive) {
          setReady(true);
          setError("Não foi possível recuperar seus documentos locais.");
        }
      });
    return () => {
      alive = false;
    };
  }, [key]);
  const sent = entries
    .filter((e) => e.kind === "preparation")
    .flatMap((e) =>
      [...(e.payload.documents ?? []), ...(e.payload.document ? [e.payload.document] : [])].map(
        (d, i) => ({ id: `${e.id}:${i}`, name: d.name, data: d.data, kind: "Enviado ao médico" }),
      ),
    );
  const documents = [...local, ...sent];
  const document = documents.find((d) => d.id === selected);
  useEffect(() => {
    if (!document) {
      setUrl("");
      return;
    }
    let bytes: Uint8Array<ArrayBuffer>;
    try {
      bytes = Uint8Array.from(atob(document.data), (c) => c.charCodeAt(0));
    } catch {
      setUrl("");
      setError(
        "Não foi possível abrir esta cópia do PDF. Remova-a e adicione o original novamente.",
      );
      return;
    }
    const value = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
    setUrl(value);
    return () => URL.revokeObjectURL(value);
  }, [document?.data]); // eslint-disable-line react-hooks/exhaustive-deps
  async function save(items: LocalDocument[]) {
    await patientDraft(key, "save", items);
    setLocal(items);
  }
  async function attach(file: File) {
    setBusy(true);
    setError("");
    try {
      if (
        local.reduce((size, d) => size + (d.data.length * 3) / 4, 0) + file.size >
        50 * 1024 * 1024
      )
        throw new Error(
          "Os documentos locais excedem 50 MB. Remova uma cópia antes de adicionar outra.",
        );
      if (
        file.size > MAX_PDF_BYTES ||
        !/\.pdf$/i.test(file.name) ||
        new TextDecoder().decode(await file.slice(0, 5).arrayBuffer()) !== "%PDF-"
      )
        throw new Error("Escolha um PDF válido de até 8 MB.");
      const data = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result).split(",")[1]!);
        r.onerror = reject;
        r.readAsDataURL(file);
      });
      const item = {
        id: createSessionId(),
        name: file.name,
        kind,
        data,
        createdAt: new Date().toISOString(),
      };
      await save([...local, item]);
      setSelected(item.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível abrir o PDF.");
    } finally {
      setBusy(false);
    }
  }
  async function prepare() {
    setBusy(true);
    setError("");
    try {
      const prepKey = `real:${userId}:${patientId}:preparation`;
      const saved = await patientDraft<ConsultationPayload>(prepKey, "read");
      const base = saved?.value ?? {
        title: "Preparação para consulta",
        text: "",
        date: "",
        symptoms: "",
        medicines: "",
        questions: "",
        exams: [],
        audios: [],
        documents: [],
        audio: null,
        document: null,
      };
      const validChosen = chosen.filter((id) => local.some((d) => d.id === id));
      const selected = validChosen.length
        ? local.filter((d) => validChosen.includes(d.id))
        : local.slice(0, 3);
      const all = [
        ...(base.documents ?? []),
        ...selected.map(({ name, data, kind }) => ({
          name,
          data,
          kind: kind as NonNullable<ConsultationPayload["documents"][number]["kind"]>,
        })),
      ];
      const documents = all.filter(
        (d, i) => all.findIndex((a) => a.name === d.name && a.data === d.data) === i,
      );
      if (documents.length + Number(Boolean(base.document)) > 3)
        throw new Error("Selecione até três PDFs na preparação.");
      await patientDraft(
        prepKey,
        "save",
        consultationPayload.parse({ ...base, title: "Preparação para consulta", documents }),
      );
      onPrepare();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível preparar o envio.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-5">
      <section className="surface p-5">
        <h2 className="text-lg font-semibold">Seus laudos, organizados</h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Adicione seus PDFs e confira o original. Para compartilhar com o médico, selecione os
          documentos em Preparar consulta e confirme o envio.
        </p>
        <div className="mt-5 flex flex-wrap items-end gap-3">
          <label className="text-xs font-medium">
            Tipo de documento
            <select
              className="mt-2 block rounded-lg border bg-white p-3 text-sm"
              value={kind}
              onChange={(e) => setKind(e.target.value)}
            >
              {["Análises clínicas", "Genética", "Genômica", "Outros laudos"].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <label className="cursor-pointer rounded-lg bg-brand px-4 py-3 text-sm font-semibold text-white">
            <Plus className="mr-2 inline size-4" />
            Adicionar PDF
            <input
              aria-label="Adicionar PDF aos meus documentos"
              className="sr-only"
              type="file"
              accept=".pdf,application/pdf"
              disabled={!ready || busy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void attach(file);
                e.target.value = "";
              }}
            />
          </label>
          <Button variant="outline" onClick={() => void prepare()} disabled={!ready || busy}>
            Enviar junto da preparação →
          </Button>
        </div>
        {error && (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {error}
          </p>
        )}
      </section>
      <Input
        aria-label="Pesquisar documento"
        placeholder="Pesquisar pelo nome do documento…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="grid items-start gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
        <section className="surface max-h-[560px] space-y-3 overflow-auto p-4">
          {documents
            .filter((d) => d.name.toLowerCase().includes(query.toLowerCase()))
            .map((d) => (
              <article key={d.id} className="rounded-lg border p-3">
                <button className="w-full text-left" onClick={() => setSelected(d.id)}>
                  <FileText className="size-5 text-brand" />
                  <p className="mt-2 break-words text-sm font-semibold">{d.name}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {d.kind} ·{" "}
                    {local.some((l) => l.id === d.id)
                      ? "Neste dispositivo; ainda não enviado"
                      : "Envio recebido pelo médico"}
                  </p>
                </button>
                {local.some((l) => l.id === d.id) && (
                  <label className="mt-3 flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={chosen.includes(d.id)}
                      disabled={busy || (!chosen.includes(d.id) && chosen.length >= 3)}
                      onChange={(e) =>
                        setChosen((current) =>
                          e.target.checked
                            ? [...current, d.id]
                            : current.filter((id) => id !== d.id),
                        )
                      }
                    />
                    Selecionar para preparação
                  </label>
                )}
                {local.some((l) => l.id === d.id) && (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={() =>
                      void save(local.filter((l) => l.id !== d.id)).catch(() =>
                        setError("Não foi possível remover o documento local."),
                      )
                    }
                  >
                    <Trash2 className="size-4" />
                    Remover cópia local
                  </Button>
                )}
              </article>
            ))}
          {!documents.length && (
            <p className="p-5 text-center text-sm text-muted-foreground">
              Seus documentos aparecerão aqui.
            </p>
          )}
        </section>
        <section className="surface p-5">
          {url ? (
            <iframe
              title="Original do documento selecionado"
              src={url}
              className="h-[560px] w-full rounded-lg border"
            />
          ) : (
            <p className="py-5 text-sm text-muted-foreground">
              Selecione um documento para visualizar o original.
            </p>
          )}
        </section>
      </div>
      <h2 className="text-lg font-semibold">Laudos liberados pelo médico</h2>
      <AccountDocuments
        patientId={patientId}
        reports={reports.filter((r) => r.filename.toLowerCase().includes(query.toLowerCase()))}
      />
    </div>
  );
}
