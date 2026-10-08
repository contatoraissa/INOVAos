import { useState } from "react";
import { FileText, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { patientHistoryById } from "@/data/demo";
import { EmptyState } from "./Page";
import { PatientResultsAI } from "./PatientResultsAI";
const analytes = [
  { key: "hemoglobina", name: "Hemoglobina", unit: "g/dL", group: "Hematologia" },
  { key: "glicemia", name: "Glicemia", unit: "mg/dL", group: "Bioquímica" },
  { key: "ldl", name: "Colesterol LDL", unit: "mg/dL", group: "Perfil lipídico" },
  { key: "vitaminaD", name: "Vitamina D", unit: "ng/mL", group: "Vitaminas" },
] as const;
export function PatientLabResults({
  patientId,
  collectionPeriod,
  compact = false,
  patientAI = false,
}: {
  patientId: string;
  collectionPeriod?: string | undefined;
  compact?: boolean;
  patientAI?: boolean;
}) {
  const history = patientHistoryById[patientId];
  const [period, setPeriod] = useState("");
  const [query, setQuery] = useState("");
  const collection =
    history?.history.find((item) => item.period === (collectionPeriod || period)) ??
    history?.history.at(-1);
  if (!history || !collection)
    return (
      <EmptyState
        title="Resultados indisponíveis"
        text="Este paciente não possui resultados detalhados neste ambiente demonstrativo."
      />
    );
  const rows = analytes.filter((item) =>
    `${item.name} ${item.group}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <div className="space-y-5">
      {!compact && (
        <div className="toolbar">
          <div>
            <p className="text-sm font-semibold">{history.label}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Resultados fictícios da coleta selecionada
            </p>
          </div>
          <Select value={collection.period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40" aria-label="Coleta dos resultados">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {history.history.map((item) => (
                <SelectItem key={item.period} value={item.period}>
                  {item.period}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative w-full">
            <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
            <Input
              aria-label="Pesquisar marcador ou categoria"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Pesquisar marcador ou categoria"
              className="pl-9"
            />
          </div>
        </div>
      )}
      {patientAI && rows.length > 0 && (
        <PatientResultsAI
          key={JSON.stringify([collection.period, rows.map((item) => item.key)])}
          mode="results"
          periods={[collection.period]}
          markers={rows.map((item) => item.key)}
        />
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {rows.map((item) => (
          <section className="surface p-5" key={item.key}>
            <div className="flex items-center gap-2">
              <FileText className="size-4 text-brand-deep" />
              <p className="eyebrow">{item.group}</p>
            </div>
            <h3 className="mt-4 text-sm font-medium">{item.name}</h3>
            <p className="mt-2 font-display text-2xl font-semibold">
              {collection[item.key].toLocaleString("pt-BR", { maximumFractionDigits: 2 })}{" "}
              <span className="text-sm font-normal text-muted-foreground">{item.unit}</span>
            </p>
            <p className="mt-4 text-xs text-muted-foreground">Período: {collection.period}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Referência e método não informados neste histórico fictício.
            </p>
          </section>
        ))}
      </div>
      {!rows.length && (
        <EmptyState title="Nenhum marcador encontrado" text="Tente outro nome ou categoria." />
      )}
    </div>
  );
}
