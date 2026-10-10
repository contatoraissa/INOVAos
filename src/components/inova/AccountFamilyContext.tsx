import { Dna, HeartPulse, Sparkles, UsersRound } from "lucide-react";
import type { ConsultationEntry } from "@/lib/real-consultation-contract";
import { Button } from "@/components/ui/button";
import { RealConsultation } from "./RealConsultation";
import { GeneticRawPanel } from "./GeneticRawPanel";
export function AccountFamilyContext({
  patientId,
  entries,
  onHistory,
}: {
  patientId: string;
  entries: ConsultationEntry[];
  onHistory: () => void;
}) {
  const family = entries.filter((e) => e.kind === "family");
  return (
    <section className="space-y-5">
      <div>
        <p className="eyebrow">Contexto clínico</p>
        <h2 className="mt-2 font-display text-3xl font-semibold">Histórico familiar</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Relatos familiares organizados junto ao histórico do paciente. Consulte os laudos nas abas
          Genética e Genômica.
        </p>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <article className="surface p-5">
          <h3 className="flex items-center gap-2 font-display text-xl font-semibold">
            <UsersRound className="size-5 text-brand" />
            Histórico familiar
          </h3>
          {family.length ? (
            family.map((e) => (
              <div key={e.id} className="mt-4 rounded-xl border p-4">
                <p className="text-sm font-semibold">{e.payload.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{e.payload.text}</p>
              </div>
            ))
          ) : (
            <p className="mt-4 rounded-xl bg-muted/50 p-4 text-sm text-muted-foreground">
              Nenhum relato familiar cadastrado. A ausência de registros não significa ausência de
              histórico familiar.
            </p>
          )}
        </article>
        <article className="surface p-5">
          <h3 className="flex items-center gap-2 font-display text-xl font-semibold">
            <Dna className="size-5 text-brand" />
            Dados genéticos
          </h3>
          <div className="mt-4">
            <GeneticRawPanel account patientId={patientId} audience="doctor" compact />
          </div>
        </article>
      </div>
      <article className="rounded-xl border border-brand/20 bg-brand-soft/50 p-5">
        <h3 className="flex items-center gap-2 font-display text-xl font-semibold">
          <Sparkles className="size-5 text-brand-deep" />
          Análise contextual
        </h3>
        <p className="mt-4 text-sm text-muted-foreground">
          {family.length
            ? `${family.length} relato(s) familiar(es) registrado(s) para conferir junto aos exames deste paciente.`
            : "Não há informações familiares suficientes para uma análise contextual."}{" "}
          Relatos não são diagnósticos confirmados nem um cálculo automático de risco.
        </p>
        <Button variant="outline" size="sm" className="mt-4" onClick={onHistory}>
          <HeartPulse />
          Ver histórico relacionado
        </Button>
      </article>
      <details className="surface p-5">
        <summary className="cursor-pointer text-sm font-semibold text-brand-deep">
          Registrar histórico familiar
        </summary>
        <div className="mt-4">
          <RealConsultation patientId={patientId} kind="family" />
        </div>
      </details>
    </section>
  );
}
