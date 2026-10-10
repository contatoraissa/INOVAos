import { usePatientDirectory } from "./patient-directory";
import { Link } from "@tanstack/react-router";
import { ArrowRight, FileCheck2, Search, Users, Clock3, Plus, Activity } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { Page, StatusBadge } from "./Page";

import { DoctorWorkQueue } from "./DoctorWorkQueue";

export function DashboardPage({
  account,
}: {
  account?: { name: string; detailedHistories?: number };
}) {
  const { patients } = usePatientDirectory();
  const [query, setQuery] = useState("");
  const rows = patients
    .filter((p) => `${p.name} ${p.cpf} ${p.rg}`.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 5);
  const fresh = patients.filter((p) => p.status.includes("Novo"));
  return (
    <Page
      title="Seu dia, com mais clareza."
      description="Uma visão organizada dos pacientes e resultados que você acompanha."
      actions={
        <Button asChild>
          <Link to="/patients/new" search={account ? { workspace: "account" } : {}}>
            <Plus />
            Novo paciente
          </Link>
        </Button>
      }
    >
      <DoctorWorkQueue patients={patients} account={Boolean(account)} />
      <section className="overview-banner">
        <div>
          <span className="eyebrow">SEU ESPAÇO CLÍNICO</span>
          <h2>Olá, {account?.name ?? "Dr. Rafael Mendes"}</h2>
          <p>
            Cada resultado faz parte de uma história.
            <br className="hidden sm:block" /> Continue de onde parou e acompanhe o que mudou.
          </p>
          <Button asChild className="mt-6" variant="outline">
            <Link to="/patients" search={account ? { workspace: "account" } : {}}>
              Explorar pacientes <ArrowRight />
            </Link>
          </Button>
        </div>
        <div className="overview-illustration" aria-hidden="true">
          <div className="illustration-orbit" />
          <div className="illustration-card">
            <span className="flex items-center gap-2 text-xs font-medium text-brand-deep">
              <Activity className="size-4" /> Histórico em perspectiva
            </span>
            <svg viewBox="0 0 260 95" className="mt-5 w-full">
              <path d="M0 75 H260 M0 40 H260 M0 5 H260" stroke="#e4edf0" strokeDasharray="4 5" />
              <path
                d="M5 60 C35 60 35 20 65 28 S100 80 130 55 S175 65 195 35 S230 48 255 12"
                fill="none"
                stroke="#078caa"
                strokeWidth="3"
              />
              <circle cx="255" cy="12" r="5" fill="#078caa" />
            </svg>
            <div className="mt-4 flex justify-between text-[10px] text-muted-foreground">
              <span>Histórico</span>
              <span>Evolução</span>
              <span>Contexto</span>
            </div>
          </div>
        </div>
      </section>
      <section className="grid gap-4 sm:grid-cols-3">
        {[
          {
            label: "Meus pacientes",
            value: patients.length,
            note: "Históricos organizados",
            icon: Users,
          },
          {
            label: "Com novos resultados",
            value: fresh.length,
            note: "Disponíveis para consulta",
            icon: FileCheck2,
          },
          {
            label: "Históricos detalhados",
            value: account?.detailedHistories ?? 0,
            note: "Com evolução dos marcadores",
            icon: Clock3,
          },
        ].map(({ label, value, note, icon: Icon }) => (
          <article className="metric-card" key={label}>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{label}</span>
              <div className="metric-icon">
                <Icon className="size-4" />
              </div>
            </div>
            <p className="mt-3 font-display text-3xl font-semibold">
              {String(value).padStart(2, "0")}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">{note}</p>
          </article>
        ))}
      </section>
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <section className="surface overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4 p-5">
            <div>
              <h2 className="section-title">Pacientes recentes</h2>
              <p className="section-subtitle">Encontre um paciente e abra seu histórico.</p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/patients" search={account ? { workspace: "account" } : {}}>
                Ver todos <ArrowRight />
              </Link>
            </Button>
          </div>
          <div className="px-5 pb-5">
            <div className="relative">
              <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por nome, CPF ou RG"
                className="h-10 pl-9"
                aria-label="Buscar pacientes"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Paciente</th>
                  <th>Último exame</th>
                  <th>Status</th>
                  <th>
                    <span className="sr-only">Abrir paciente</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <span className="patient-avatar">
                          {p.name
                            .split(" ")
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join("")}
                        </span>
                        <div>
                          <p className="font-medium">{p.name}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{p.updated}</p>
                        </div>
                      </div>
                    </td>
                    <td>{p.exam}</td>
                    <td>
                      <StatusBadge fresh={p.status.includes("Novo")}>{p.status}</StatusBadge>
                    </td>
                    <td>
                      <Button asChild variant="ghost" size="icon">
                        <Link
                          to="/patients/$patientId"
                          params={{ patientId: p.id }}
                          search={account ? { workspace: "account" } : {}}
                          aria-label={`Abrir ${p.name}`}
                        >
                          <ArrowRight className="size-4" />
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!rows.length && (
              <p className="p-8 text-center text-sm text-muted-foreground">
                Nenhum paciente encontrado.
              </p>
            )}
          </div>
        </section>
        <aside className="space-y-5">
          <section className="surface p-5">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-brand" />
              <h2 className="section-title">Novos resultados</h2>
            </div>
            <p className="section-subtitle">Atualizações dos pacientes</p>
            <div className="mt-5 space-y-4">
              {fresh.slice(0, 3).map((p) => (
                <Link
                  key={p.id}
                  to="/patients/$patientId"
                  params={{ patientId: p.id }}
                  search={account ? { workspace: "account" } : {}}
                  className="group flex items-start justify-between gap-3"
                >
                  <div>
                    <p className="text-sm font-medium group-hover:text-brand-deep">{p.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {p.exam} · {p.updated}
                    </p>
                  </div>
                  <ArrowRight className="mt-1 size-4 shrink-0 text-muted-foreground" />
                </Link>
              ))}
            </div>
            <Button asChild variant="outline" className="mt-6 w-full">
              <Link to="/results" search={account ? { workspace: "account" } : {}}>
                Ver resultados
              </Link>
            </Button>
          </section>
          <section className="rounded-xl bg-brand-soft/70 p-5">
            <span className="eyebrow">A VISÃO INOVA</span>
            <h3 className="mt-3 font-display text-lg font-semibold text-brand-deep">
              Mais contexto.
              <br />
              Melhores perguntas.
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Histórico e evolução juntos para apoiar sua análise de cada paciente.
            </p>
          </section>
        </aside>
      </div>
    </Page>
  );
}
