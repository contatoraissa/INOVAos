import { useState } from "react";
import { FileText, ArrowRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type ReportKind } from "@/data/molecular-reports";
import { useConsultation } from "./consultation-state";
import { EmptyState } from "./Page";
import { GeneticRawPanel } from "./GeneticRawPanel";
export function DocumentLibrary({
  patientId,
  onNavigate,
}: {
  patientId: string;
  onNavigate: (tab: "Genética" | "Genômica" | "Laudos laboratoriais") => void;
}) {
  const { reportsByKind, reviewed, setSelectedReports } = useConsultation();
  const [query, setQuery] = useState("");
  const reports = (["Genética", "Genômica", "Laboratorial"] as ReportKind[])
    .flatMap((kind) => reportsByKind[kind].map((report) => ({ ...report, kind })))
    .filter((report) =>
      `${report.title} ${report.kind}`.toLowerCase().includes(query.toLowerCase()),
    );
  return (
    <section className="space-y-5">
      <GeneticRawPanel
        patientId={patientId}
        audience="doctor"
        compact
        onOpen={() => onNavigate("Genética")}
      />
      <div>
        <h2 className="font-display text-xl font-semibold">Documentos do paciente</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Todos os laudos da sessão, com origem e estado de revisão.
        </p>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="pl-9"
          placeholder="Pesquisar laudo ou categoria"
          aria-label="Pesquisar documentos"
        />
      </div>
      {reports.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {reports.map((report) => (
            <article key={report.id} className="surface p-5">
              <div className="flex items-center justify-between gap-3">
                <FileText className="size-5 text-brand-deep" />
                <span className="text-xs text-muted-foreground">{report.kind}</span>
              </div>
              <h3 className="mt-4 break-words text-sm font-semibold">{report.title}</h3>
              <p className="mt-2 text-xs text-muted-foreground">
                {report.demo
                  ? "Documento ilustrativo"
                  : report.analysis
                    ? "PDF analisado pelo Gemini"
                    : "PDF local, ainda não analisado"}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {reviewed[report.id] ? "Revisado nesta sessão" : "Pendente de revisão"}
              </p>
              <Button
                className="mt-4"
                size="sm"
                variant="outline"
                onClick={() => {
                  setSelectedReports((items) => ({ ...items, [report.kind]: report.id }));
                  onNavigate(report.kind === "Laboratorial" ? "Laudos laboratoriais" : report.kind);
                }}
              >
                Abrir documento
                <ArrowRight />
              </Button>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          title="Nenhum documento encontrado"
          text="Selecione um PDF nas abas de laudos ou altere a pesquisa."
        />
      )}
    </section>
  );
}
