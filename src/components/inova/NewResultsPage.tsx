import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Search, ArrowRight, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePatientDirectory } from "./patient-directory";
import { Page, StatusBadge, EmptyState } from "./Page";
const dateValue = (text: string) => {
  const parts = text.split("/").map(Number);
  return parts.length === 3 ? Date.UTC(parts[2] ?? 0, (parts[1] ?? 1) - 1, parts[0] ?? 1) : NaN;
};
export function NewResultsPage() {
  const { patients } = usePatientDirectory();
  const [range, setRange] = useState(0);
  const [query, setQuery] = useState("");
  const fresh = patients.filter((patient) => patient.status.includes("Novo"));
  const anchor = Math.max(
    ...fresh.map((patient) => dateValue(patient.updated)).filter(Number.isFinite),
  );
  const rows = fresh
    .filter((patient) => {
      const elapsed = (anchor - dateValue(patient.updated)) / 86400000;
      return elapsed >= 0 && elapsed <= range;
    })
    .filter((patient) =>
      `${patient.name} ${patient.exam}`.toLowerCase().includes(query.toLowerCase()),
    );
  const reference = fresh.find((patient) => dateValue(patient.updated) === anchor)?.updated;
  return (
    <Page
      title="Novos resultados"
      description={`${fresh.length} pacientes com resultados novos na demonstração. Abra o paciente para preparar a revisão.`}
    >
      <div className="toolbar">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
          <Input
            className="pl-9"
            aria-label="Buscar novos resultados"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Pesquisar paciente ou exame"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {[
            { label: "Última coleta", days: 0 },
            { label: "7 dias", days: 7 },
            { label: "30 dias", days: 30 },
          ].map((item) => (
            <Button
              key={item.days}
              size="sm"
              variant={range === item.days ? "default" : "ghost"}
              onClick={() => setRange(item.days)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        {rows.length} resultados na seleção · referência do período:{" "}
        {reference ?? "sem datas disponíveis"} (dados fictícios).
      </p>
      {rows.length ? (
        <section className="surface overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Paciente</th>
                <th>Exame</th>
                <th>Atualização</th>
                <th>Status</th>
                <th>Revisão</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((patient) => (
                <tr key={patient.id}>
                  <td className="font-medium">{patient.name}</td>
                  <td>{patient.exam}</td>
                  <td>{patient.updated}</td>
                  <td>
                    <StatusBadge fresh>Novo resultado</StatusBadge>
                  </td>
                  <td>
                    <Button asChild variant="outline" size="sm">
                      <Link to="/patients/$patientId" params={{ patientId: patient.id }}>
                        Preparar consulta
                        <ArrowRight />
                      </Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : (
        <EmptyState
          title="Nenhum novo resultado neste filtro"
          text="Altere o período ou a pesquisa para consultar outros resultados."
        />
      )}
      <div className="rounded-xl bg-brand-soft p-4 text-sm text-muted-foreground">
        <FileText className="mb-2 size-4 text-brand-deep" />
        Laudos PDF podem ser consultados e analisados nas abas do paciente. A lista acima representa
        a base demonstrativa.
      </div>
    </Page>
  );
}
