import { usePatientDirectory } from "./patient-directory";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { EmptyState, Page, StatusBadge } from "./Page";
import { PatientDetailPage } from "./PatientDetailPage";
import { NewPatientPage } from "./SecondaryPages";

export function PatientsPage() {
  const { patients } = usePatientDirectory();
  const navigate = useNavigate();
  const location = useLocation();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("Todos");
  const rows = useMemo(
    () =>
      patients
        .filter((p) =>
          `${p.name} ${p.cpf} ${p.rg} ${p.birth}`.toLowerCase().includes(q.toLowerCase()),
        )
        .filter((p) => filter !== "Com novos resultados" || p.status.includes("Novo"))
        .filter((_, i) => filter !== "Recentes" || i < 5),
    [q, filter, patients],
  );

  if (location.pathname === "/patients/new") return <NewPatientPage />;
  if (location.pathname.startsWith("/patients/")) {
    return <PatientDetailPage patientId={location.pathname.slice("/patients/".length)} />;
  }

  return (
    <Page
      title="Pacientes"
      description="Consulte o histórico laboratorial consolidado dos seus pacientes."
      actions={
        <Button asChild>
          <Link to="/patients/new">
            <Plus />
            Novo paciente
          </Link>
        </Button>
      }
    >
      <div className="toolbar">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-10 pl-9"
            placeholder="Pesquisar por nome, CPF, RG ou nascimento"
          />
        </div>
        <div className="flex gap-1 rounded-md bg-muted p-1">
          {["Todos", "Recentes", "Com novos resultados"].map((f) => (
            <Button
              key={f}
              variant={filter === f ? "default" : "ghost"}
              size="sm"
              onClick={() => setFilter(f)}
            >
              {f}
            </Button>
          ))}
        </div>
      </div>

      {rows.length ? (
        <div className="surface overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Nascimento</th>
                <th>Último exame</th>
                <th>Última atualização</th>
                <th>Status</th>
                <th className="text-right">Ação</th>
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
                      <p className="font-medium">{p.name}</p>
                    </div>
                    <p className="text-[11px] text-muted-foreground">CPF {p.cpf}</p>
                  </td>
                  <td>{p.birth}</td>
                  <td>{p.exam}</td>
                  <td>{p.updated}</td>
                  <td>
                    <StatusBadge fresh={p.status.includes("Novo")}>{p.status}</StatusBadge>
                  </td>
                  <td className="text-right">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        navigate({ to: "/patients/$patientId", params: { patientId: p.id } })
                      }
                    >
                      Abrir histórico
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          title="Nenhum paciente encontrado"
          text="Tente buscar por outro nome ou documento."
        />
      )}
    </Page>
  );
}
