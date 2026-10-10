import { useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "./Page";
import { Input } from "@/components/ui/input";
import { FileText } from "lucide-react";
import { openMedicalReport } from "@/lib/medical-reports";
import { openPatientReviewedReport } from "@/lib/real-consultation";
export { AccountResults } from "./AccountResultPanels";

export function AccountDocuments({
  patientId,
  reports,
  doctor = false,
  onNavigate,
}: {
  patientId: string;
  reports: {
    id: string;
    filename: string;
    kind: string;
    created_at: string;
    reviewed_at: string | null;
  }[];
  doctor?: boolean;
  onNavigate?: (kind: "Laudos laboratoriais" | "Genética" | "Genômica", id: string) => void;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [search, setSearch] = useState("");
  const filtered = reports.filter((r) =>
    `${r.filename} ${r.kind}`
      .toLocaleLowerCase("pt-BR")
      .includes(search.toLocaleLowerCase("pt-BR")),
  );
  async function open(id: string) {
    setError("");
    setBusy(id);
    // Open immediately so the user's click keeps browser popup permission.
    const tab = window.open("about:blank", "_blank");
    if (tab) tab.opener = null;
    try {
      const result = await (doctor
        ? openMedicalReport({ data: { patientId, id } })
        : openPatientReviewedReport({ data: { patientId, id } }));
      if (tab) tab.location.assign(result.url);
      else window.location.assign(result.url);
    } catch (cause) {
      tab?.close();
      setError(cause instanceof Error ? cause.message : "Não foi possível abrir o PDF.");
    } finally {
      setBusy("");
    }
  }
  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-semibold">
          {doctor ? "Documentos do paciente" : "Laudos liberados pelo médico"}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Laudos do prontuário, com origem e estado de revisão.
        </p>
      </div>
      <Input
        aria-label="Pesquisar documentos"
        placeholder="Pesquisar laudo ou categoria"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {error && (
        <p role="alert" className="surface p-4 text-sm text-destructive">
          {error}
        </p>
      )}
      {!filtered.length ? (
        <EmptyState
          title="Nenhum documento disponível"
          text="Os laudos liberados no prontuário aparecerão aqui."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((report) => (
            <article key={report.id} className="surface space-y-4 p-5">
              <div>
                <FileText className="mb-3 size-5 text-brand-deep" />
                <h3 className="font-semibold">{report.filename}</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {report.kind} · {new Date(report.created_at).toLocaleDateString("pt-BR")} ·{" "}
                  {report.reviewed_at ? "Revisado" : "Aguardando revisão"}
                </p>
              </div>
              {onNavigate && (
                <Button
                  variant="outline"
                  onClick={() =>
                    onNavigate(
                      report.kind === "Laboratorial"
                        ? "Laudos laboratoriais"
                        : report.kind === "Genética"
                          ? "Genética"
                          : "Genômica",
                      report.id,
                    )
                  }
                >
                  Abrir documento →
                </Button>
              )}
              <Button
                variant="outline"
                disabled={Boolean(busy)}
                onClick={() => void open(report.id)}
              >
                Abrir PDF original
              </Button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
