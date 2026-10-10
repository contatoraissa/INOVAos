import { ArrowRight, HeartPulse, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GeneticRawPanel } from "./GeneticRawPanel";
import type { MedicalResult } from "@/lib/medical-reports";
import type { Section } from "./patient-navigation";
export function AccountPatientHomeResources({
  patientId,
  results,
  documents,
  saved,
  onOpen,
}: {
  patientId: string;
  results: MedicalResult[];
  documents: number;
  saved: boolean;
  onOpen: (section: Section) => void;
}) {
  const dates = [...new Set(results.map((r) => r.collection_date))].sort().reverse();
  return (
    <>
      <GeneticRawPanel
        account
        patientId={patientId}
        audience="patient"
        compact
        onOpen={() => onOpen("genetics")}
      />
      <section className="relative overflow-hidden rounded-3xl bg-[#123e4a] p-7 text-white sm:p-9">
        <div className="absolute -right-16 -top-16 size-64 rounded-full border-[30px] border-white/5" />
        <p className="text-xs font-medium uppercase tracking-widest text-cyan-200">
          PREPARAR MINHA CONSULTA
        </p>
        <h2 className="relative mt-4 max-w-lg font-display text-2xl font-semibold">
          Mais tranquilidade para sua próxima consulta.
        </h2>
        <p className="relative mt-3 max-w-lg text-sm leading-relaxed text-white/70">
          Registre o que você está sentindo, os medicamentos que usa e as perguntas que deseja
          fazer.
        </p>
        <Button
          onClick={() => onOpen("consultation")}
          className="relative mt-6 bg-white text-[#123e4a] hover:bg-white/90"
        >
          Preparar minha consulta <ArrowRight />
        </Button>
      </section>
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          {
            title: "Coletas no histórico",
            value: String(dates.length),
            detail: "Resultados do seu prontuário",
            next: "history",
          },
          {
            title: "Documentos adicionados",
            value: String(documents),
            detail: "Salvos neste navegador",
            next: "documents",
          },
          {
            title: "Preparação da consulta",
            value: saved ? "Salva" : "A fazer",
            detail: "Suas anotações pessoais",
            next: "consultation",
          },
        ].map((item) => (
          <button
            key={item.title}
            onClick={() => onOpen(item.next as Section)}
            className="surface p-5 text-left hover:border-brand/30"
          >
            <p className="text-xs text-muted-foreground">{item.title}</p>
            <p className="mt-3 font-display text-3xl font-semibold">{item.value}</p>
            <p className="mt-2 text-xs text-muted-foreground">{item.detail}</p>
          </button>
        ))}
      </div>
      <section className="surface p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold">Sua última coleta</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {dates[0]?.split("-").reverse().join("/") ?? "Nenhuma coleta liberada"}
            </p>
          </div>
          <Button variant="outline" onClick={() => onOpen("results")}>
            Ver meus resultados <ArrowRight />
          </Button>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {results
            .filter((r) => r.collection_date === dates[0])
            .slice(0, 4)
            .map((r) => (
              <div key={r.id} className="rounded-xl bg-[#f5f9fa] p-4">
                <p className="text-xs text-muted-foreground">{r.name}</p>
                <p className="mt-3 text-2xl font-semibold">
                  {r.value}{" "}
                  <span className="text-xs font-normal text-muted-foreground">{r.unit}</span>
                </p>
              </div>
            ))}
        </div>
        <p className="mt-5 text-xs text-muted-foreground">
          Os valores precisam ser avaliados junto ao seu histórico pelo profissional que acompanha
          você.
        </p>
      </section>
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          {
            next: "documents",
            title: "Tem um novo laudo?",
            detail: "Adicione e organize seu PDF.",
            Icon: Upload,
          },
          {
            next: "history",
            title: "Acompanhe sua evolução",
            detail: "Compare os valores ao longo do tempo.",
            Icon: HeartPulse,
          },
        ].map(({ next, title, detail, Icon }) => (
          <button
            key={next}
            className="surface flex items-center gap-4 p-6 text-left"
            onClick={() => onOpen(next as Section)}
          >
            <span className="rounded-xl bg-brand-soft p-3 text-brand-deep">
              <Icon />
            </span>
            <div>
              <h2 className="text-sm font-semibold">{title}</h2>
              <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
            </div>
            <ArrowRight className="ml-auto size-4 shrink-0" />
          </button>
        ))}
      </div>
    </>
  );
}
