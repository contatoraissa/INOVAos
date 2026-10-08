import { useState } from "react";
import { Search, Stethoscope, Building2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Page, EmptyState } from "./Page";
const doctors = [
  {
    name: "Dr. Rafael Mendes",
    clinic: "Clínica Vida",
    crm: "123456/SP",
    specialty: "Clínica médica",
    status: "Ativo",
  },
  {
    name: "Dra. Camila Ferreira",
    clinic: "Clínica São Lucas",
    crm: "234567/SP",
    specialty: "Endocrinologia",
    status: "Ativo",
  },
  {
    name: "Dr. Lucas Almeida",
    clinic: "Centro Médico Votorantim",
    crm: "345678/SP",
    specialty: "Cardiologia",
    status: "Ativo",
  },
  {
    name: "Dra. Paula Nogueira",
    clinic: "Instituto Horizonte",
    crm: "456789/SP",
    specialty: "Genética médica",
    status: "Convite pendente",
  },
];
export function DoctorsPage() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("Todos");
  const [selected, setSelected] = useState<(typeof doctors)[number] | null>(null);
  const rows = doctors
    .filter((doctor) =>
      `${doctor.name} ${doctor.clinic} ${doctor.crm} ${doctor.specialty}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    )
    .filter((doctor) => filter === "Todos" || doctor.status === filter);
  return (
    <Page
      title="Rede médica"
      description="Profissionais e clínicas do ecossistema INOVA. Diretório fictício para demonstração."
    >
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Profissionais", value: doctors.length },
          {
            label: "Perfis ativos",
            value: doctors.filter((doctor) => doctor.status === "Ativo").length,
          },
          {
            label: "Convites pendentes",
            value: doctors.filter((doctor) => doctor.status === "Convite pendente").length,
          },
        ].map((item) => (
          <div className="metric-card" key={item.label}>
            <p className="text-sm text-muted-foreground">{item.label}</p>
            <p className="mt-3 font-display text-3xl font-semibold">{item.value}</p>
          </div>
        ))}
      </div>
      <div className="toolbar">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
          <Input
            className="pl-9"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Pesquisar nome, CRM, especialidade ou clínica"
            aria-label="Pesquisar médico"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {["Todos", "Ativo", "Convite pendente"].map((item) => (
            <Button
              key={item}
              size="sm"
              variant={filter === item ? "default" : "ghost"}
              onClick={() => setFilter(item)}
            >
              {item}
            </Button>
          ))}
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {rows.map((doctor) => (
          <article className="surface p-5" key={doctor.crm}>
            <div className="flex items-center justify-between">
              <span className="metric-icon">
                <Stethoscope className="size-5" />
              </span>
              <span className="rounded-full bg-muted px-3 py-1 text-[10px] text-muted-foreground">
                {doctor.status}
              </span>
            </div>
            <h2 className="mt-5 font-display text-lg font-semibold">{doctor.name}</h2>
            <p className="mt-1 text-sm text-brand-deep">{doctor.specialty}</p>
            <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <Building2 className="size-3.5" />
              {doctor.clinic}
            </p>
            <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
              <span className="text-xs text-muted-foreground">CRM {doctor.crm}</span>
              <Button variant="ghost" size="sm" onClick={() => setSelected(doctor)}>
                Ver perfil
                <ArrowRight />
              </Button>
            </div>
          </article>
        ))}
      </div>
      {!rows.length && (
        <EmptyState title="Nenhum médico encontrado" text="Altere a pesquisa ou o status." />
      )}
      <Dialog
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selected?.name}</DialogTitle>
            <DialogDescription>Perfil profissional demonstrativo</DialogDescription>
          </DialogHeader>
          <dl className="space-y-4 text-sm">
            {[
              ["Especialidade", selected?.specialty],
              ["Clínica", selected?.clinic],
              ["CRM", selected?.crm],
              ["Status", selected?.status],
            ].map(([label, value]) => (
              <div className="flex justify-between gap-4" key={label}>
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="text-right font-medium">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="rounded-lg bg-brand-soft p-3 text-xs leading-relaxed text-muted-foreground">
            Cadastro ilustrativo. Este diretório não concede acesso a pacientes; autenticação e
            vínculos autorizados serão necessários para uso com dados reais.
          </p>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
