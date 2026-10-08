import { useCallback, useEffect, useRef, useState } from "react";
import {
  Activity,
  Apple,
  Brain,
  Check,
  Dna,
  Download,
  RefreshCw,
  Shield,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  MAX_GENETIC_BYTES,
  geneticDomains,
  type RawGeneticRecord,
} from "@/lib/genetic-raw-contract";
import {
  importRawGenetics,
  listRawGenetics,
  getRawGeneticOriginal,
  reviewRawGenetics,
  removeRawGenetics,
} from "@/lib/genetic-raw";
const date = (value: string) =>
  new Date(value).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
const icons = [Brain, Activity, Shield, Apple];
function DomainCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Domínios genéticos">
      {geneticDomains.map((domain, index) => {
        const Icon = icons[index] ?? Dna;
        return (
          <article key={domain.name} className="surface p-5">
            <div className="flex items-center gap-3">
              <span className="rounded-xl bg-brand-soft p-2 text-brand-deep">
                <Icon className="size-5" />
              </span>
              <h3 className="font-semibold">{domain.name}</h3>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">Score de predisposição</p>
            <p
              className="mt-2 font-display text-3xl font-semibold"
              aria-label="Score não calculado"
            >
              —
            </p>
            <p className="mt-2 text-xs font-medium text-brand-deep">Modelo ainda não configurado</p>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              {domain.description} Predisposição não estimada.
            </p>
          </article>
        );
      })}
    </div>
  );
}
export function GeneticRawPanel({
  patientId,
  audience,
  compact = false,
  onOpen,
  onChanged,
}: {
  patientId: string;
  audience: "doctor" | "patient";
  compact?: boolean;
  onOpen?: () => void;
  onChanged?: () => void;
}) {
  const [records, setRecords] = useState<RawGeneticRecord[]>([]);
  const [selected, setSelected] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [reviewConfirmed, setReviewConfirmed] = useState(false);
  const [removeId, setRemoveId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loaded, setLoaded] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const refresh = useCallback(async () => {
    setError("");
    try {
      const items = await listRawGenetics({ data: { patientId } });
      setRecords(items);
      setSelected((current) =>
        items.some((item) => item.id === current) ? current : (items[0]?.id ?? ""),
      );
    } catch {
      setError(
        "Não foi possível carregar os arquivos genéticos. Confira o servidor e tente atualizar.",
      );
    } finally {
      setLoaded(true);
    }
  }, [patientId]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  const record = records.find((item) => item.id === selected);
  async function act(task: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await task();
      onChanged?.();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível concluir esta ação.");
    } finally {
      setBusy(false);
    }
  }
  async function upload() {
    if (!file || !confirmed || !loaded) return;
    await act(async () => {
      if (!/\.txt$/i.test(file.name) || file.size > MAX_GENETIC_BYTES)
        throw new Error("Selecione o TXT extraído, de até 25 MB. ZIP e PDF não são aceitos aqui.");
      const result = await importRawGenetics({
        data: {
          patientId,
          name: file.name,
          text: await file.text(),
          audience,
          fictionalConfirmed: true,
          associationConfirmed: true,
        },
      });
      await refresh();
      setSelected(result.record.id);
      setFile(null);
      if (fileInput.current) fileInput.current.value = "";
      setConfirmed(false);
      setReviewConfirmed(false);
      setMessage(
        result.duplicate
          ? "Este arquivo já está vinculado a este paciente. Nenhuma cópia duplicada foi criada."
          : "Arquivo recebido e vinculado ao perfil demonstrativo. Disponível para revisão na área médica.",
      );
    });
  }
  async function download() {
    if (!record) return;
    await act(async () => {
      const original = await getRawGeneticOriginal({ data: { id: record.id, patientId } });
      const url = URL.createObjectURL(
        new Blob([original.text], { type: "text/plain;charset=utf-8" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = original.name;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage("Cópia UTF-8 conferida pelo hash e disponibilizada para download.");
    });
  }
  if (compact && loaded && !records.length && !error) return null;
  if (compact)
    return (
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="eyebrow">ARQUIVO BRUTO · PERFIL GENÉTICO</p>
            <h2 className="mt-2 font-display text-xl font-semibold">Genética no acompanhamento</h2>
          </div>
          <Button variant="outline" onClick={onOpen}>
            Abrir genética <Dna />
          </Button>
        </div>
        {error && (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        )}
        {records[0] && (
          <>
            <p className="break-words text-xs text-muted-foreground">
              {records[0].name} · {records.length} versão(ões) ·{" "}
              {records[0].reviewedAt
                ? "Associação revisada pelo médico"
                : "Aguardando revisão médica"}
            </p>
            <DomainCards />
          </>
        )}
      </section>
    );
  return (
    <div className="space-y-5" data-genetic-raw-panel>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">INOVA · GENÉTICA BRUTA</p>
          <h2 className="mt-2 font-display text-xl font-semibold">
            Um arquivo, quatro domínios de acompanhamento
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Importe o TXT no formato bruto 23andMe. Neurologia, metabolismo, imunidade e nutrição
            ficam organizados no perfil para as próximas consultas.
          </p>
        </div>
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => {
            void act(refresh);
          }}
        >
          <RefreshCw />
          Atualizar genética
        </Button>
      </div>
      <p className="rounded-xl border border-brand/20 bg-brand-soft/40 p-4 text-xs leading-relaxed text-muted-foreground">
        Armazenamento local demonstrativo: este módulo mantém cópias fictícias no servidor,
        inclusive após reiniciar. Ainda não há autenticação real; use somente arquivos fictícios. O
        TXT não é enviado ao Gemini. Recebimento automático por WhatsApp/e-mail ainda não está
        conectado.
      </p>
      <section className="surface p-5">
        <h3 className="font-semibold">
          {audience === "patient"
            ? "Enviar meu arquivo genético"
            : "Vincular arquivo recebido ao paciente"}
        </h3>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Se o arquivo veio por WhatsApp ou e-mail, salve-o antes e selecione aqui. Extraia o ZIP e
          envie o .txt, até 25 MB. O formato contém rsid, cromossomo, posição e genótipo.
        </p>
        <label className="mt-4 block text-sm font-medium" htmlFor={`genetic-raw-file-${audience}`}>
          Arquivo bruto (.txt)
        </label>
        <input
          ref={fileInput}
          id={`genetic-raw-file-${audience}`}
          aria-label="Selecionar arquivo genético TXT"
          type="file"
          accept=".txt,text/plain"
          disabled={busy}
          className="mt-2 block w-full min-w-0 text-sm"
          onChange={(event) => {
            setFile(event.target.files?.[0] ?? null);
            setConfirmed(false);
            setMessage("");
            setError("");
          }}
        />
        {file && (
          <p className="mt-2 break-words text-xs text-muted-foreground">
            {file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB
          </p>
        )}
        <label className="mt-4 flex items-start gap-2 text-xs leading-relaxed">
          <input
            type="checkbox"
            className="mt-1"
            checked={confirmed}
            disabled={busy}
            onChange={(event) => setConfirmed(event.target.checked)}
          />
          Confirmo que este TXT é fictício e que o perfil demonstrativo selecionado é o destinatário
          correto.
        </label>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <Button
            disabled={!file || !confirmed || busy || !loaded}
            onClick={() => {
              void upload();
            }}
          >
            <Upload />
            {busy
              ? "Processando arquivo…"
              : audience === "patient"
                ? "Enviar arquivo genético"
                : "Importar arquivo genético"}
          </Button>
          <a
            href="/examples/23andme-exemplo-ficticio.txt"
            download
            className="text-xs text-brand-deep underline"
          >
            Baixar TXT fictício para testar
          </a>
        </div>
      </section>
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-destructive">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="rounded-xl bg-brand-soft p-4 text-sm text-brand-deep">
          {message}
        </p>
      )}
      {!loaded && (
        <p role="status" className="text-sm text-muted-foreground">
          Carregando genética…
        </p>
      )}
      {records.length > 0 && (
        <section className="surface p-5">
          <label htmlFor={`genetic-version-${audience}`} className="label">
            Versão do arquivo vinculada ao paciente
          </label>
          <select
            id={`genetic-version-${audience}`}
            aria-label="Versão do arquivo genético"
            className="mt-2 h-10 w-full min-w-0 rounded-md border border-border bg-white px-3 text-sm"
            value={selected}
            onChange={(event) => {
              setSelected(event.target.value);
              setReviewConfirmed(false);
              setRemoveId("");
              setMessage("");
            }}
          >
            {records.map((item) => (
              <option key={item.id} value={item.id}>
                {date(item.importedAt)} · {item.name}
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs text-muted-foreground">
            Até três versões por paciente; arquivos idênticos não são duplicados.
          </p>
        </section>
      )}
      <DomainCards />
      <p className="rounded-xl border border-border bg-white p-4 text-sm leading-relaxed text-muted-foreground">
        Os quatro domínios são categorias de organização. Score e predisposição estão pendentes de
        metodologia validada, com variantes, pesos, população de referência e calibração. Quantidade
        de marcadores e taxa de chamadas não são scores de predisposição.
      </p>
      {record ? (
        <section className="surface space-y-5 p-5" data-raw-record-id={record.id}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="break-words font-semibold">{record.name}</h3>
              <p className="mt-2 text-xs text-muted-foreground">
                Recebido em {date(record.importedAt)} ·{" "}
                {record.importedBy === "patient"
                  ? "enviado pelo paciente"
                  : "importado pelo médico"}
              </p>
            </div>
            <span className="rounded-full bg-brand-soft px-3 py-1 text-xs text-brand-deep">
              {record.reviewedAt ? "Associação revisada" : "Aguardando revisão médica"}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              ["Marcadores únicos", record.stats.markers.toLocaleString("pt-BR")],
              ["Sem chamada (--)", record.stats.uncalled.toLocaleString("pt-BR")],
              ["Versão do genoma", record.stats.build],
              ["Orientação", record.stats.strand],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-2 text-sm font-semibold">{value}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Chamadas presentes: {record.stats.callRate.toFixed(2)}% · informação técnica do arquivo,
            sem estimativa clínica.
          </p>
          <div className="rounded-xl bg-amber-50 p-4">
            <h4 className="text-sm font-semibold">Pontos para conferência</h4>
            <ul className="mt-2 list-disc space-y-2 pl-4 text-xs leading-relaxed">
              {record.stats.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </div>
          <details>
            <summary className="cursor-pointer text-sm font-medium text-brand-deep">
              Ver amostra técnica de marcadores
            </summary>
            <p className="mt-2 text-xs text-muted-foreground">
              Primeiros {record.stats.preview.length} registros únicos; sem interpretação de genes
              ou doenças.
            </p>
            <div className="mt-3 max-h-64 overflow-auto rounded-lg border border-border">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted">
                  <tr>
                    {["rsID / ID", "Cromossomo", "Posição", "Genótipo"].map((label) => (
                      <th key={label} className="p-3">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {record.stats.preview.map((item) => (
                    <tr key={item.marker} className="border-t border-border">
                      <td className="p-3">{item.marker}</td>
                      <td className="p-3">{item.chromosome}</td>
                      <td className="p-3">{item.position}</td>
                      <td className="p-3">{item.genotype}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
          <p className="break-all text-[10px] text-muted-foreground">
            Integridade da cópia UTF-8 (SHA-256): {record.sha256}
          </p>
          {record.reviewedAt && (
            <p className="text-xs text-brand-deep">
              Conferido por {record.reviewer} · {date(record.reviewedAt)}. Esta revisão não valida
              clinicamente o teste nem gera score.
            </p>
          )}
          {audience === "doctor" && !record.reviewedAt && (
            <label className="flex items-start gap-2 text-xs leading-relaxed">
              <input
                type="checkbox"
                className="mt-1"
                checked={reviewConfirmed}
                disabled={busy}
                onChange={(event) => setReviewConfirmed(event.target.checked)}
              />
              Conferi a associação ao paciente e o arquivo bruto. Esta confirmação não é um
              diagnóstico.
            </label>
          )}
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => {
                void download();
              }}
            >
              <Download />
              Baixar cópia do TXT
            </Button>
            {audience === "doctor" && !record.reviewedAt && (
              <Button
                disabled={busy || !reviewConfirmed}
                onClick={() => {
                  void act(async () => {
                    await reviewRawGenetics({
                      data: { id: record.id, patientId, associationConfirmed: true },
                    });
                    await refresh();
                    setMessage("Associação revisada. O cálculo dos scores permanece pendente.");
                  });
                }}
              >
                <Check />
                Marcar arquivo genético revisado
              </Button>
            )}
            <Button variant="ghost" disabled={busy} onClick={() => setRemoveId(record.id)}>
              <Trash2 />
              Excluir arquivo genético
            </Button>
          </div>
          {removeId === record.id && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm">
                Excluir esta versão, sua cópia TXT e seus metadados do servidor demonstrativo?
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                <Button
                  variant="destructive"
                  disabled={busy}
                  onClick={() => {
                    void act(async () => {
                      await removeRawGenetics({
                        data: { id: record.id, patientId, confirmed: true },
                      });
                      setRemoveId("");
                      await refresh();
                      setMessage("Arquivo e metadados excluídos do armazenamento demonstrativo.");
                    });
                  }}
                >
                  Confirmar exclusão do arquivo
                </Button>
                <Button variant="outline" disabled={busy} onClick={() => setRemoveId("")}>
                  Manter arquivo
                </Button>
              </div>
            </div>
          )}
        </section>
      ) : (
        loaded && (
          <section className="surface p-6">
            <h3 className="font-semibold">Nenhum arquivo bruto vinculado</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Importe um TXT fictício para organizar os documentos genéticos neste perfil. Os laudos
              PDF continuam nas abas próprias.
            </p>
          </section>
        )
      )}
      <p className="text-xs leading-relaxed text-muted-foreground">
        Não há dose, conduta pronta, par gene–fármaco ou diagnóstico automático.{" "}
        <a
          className="text-brand-deep underline"
          href="https://www.pgscatalog.org/about/"
          target="_blank"
          rel="noreferrer"
        >
          Sobre modelos de scores poligênicos
        </a>
        .
      </p>
    </div>
  );
}
