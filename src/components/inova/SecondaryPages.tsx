import { Link, useNavigate } from "@tanstack/react-router";
import {
  Activity,
  ArrowRight,
  Building2,
  Check,
  FileText,
  Search,
  Stethoscope,
  Users,
} from "lucide-react";
import { useState } from "react";
import { createSessionId } from "@/lib/session-id";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PatientRegistrationFields } from "./PatientRegistrationFields";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePatientDirectory } from "./patient-directory";
import { ComparisonContent, ResultsContent } from "./PatientDetailPage";
import { OperationsChart } from "./Charts";
import { Page, StatusBadge } from "./Page";

export function NewPatientPage() {
  const { patients, addPatient } = usePatientDirectory();
  const navigate = useNavigate();
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const fields = new FormData(e.currentTarget as HTMLFormElement);
    const value = (name: string) => String(fields.get(name) ?? "").trim();
    const cpf = value("cpf");
    if (patients.some((patient) => patient.cpf.replace(/\D/g, "") === cpf.replace(/\D/g, ""))) {
      toast.error("Já existe um paciente com este CPF.");
      return;
    }
    if (cpf.replace(/\D/g, "").length !== 11) {
      toast.error("Informe um CPF com 11 dígitos.");
      return;
    }
    const birth = value("birth").split("-").reverse().join("/");
    addPatient({
      id: createSessionId(),
      name: value("name"),
      cpf,
      rg: value("rg"),
      birth,
      exam: "Nenhum exame integrado",
      updated: "Cadastro nesta sessão",
      status: "Sem exames",
      sex: value("sex"),
      phone: value("phone"),
      email: value("email"),
      address: value("address"),
      notes: value("notes"),
    });
    toast.success("Paciente incluído na demonstração. O cadastro é temporário.");
    setTimeout(() => navigate({ to: "/patients" }), 700);
  };
  return (
    <Page
      title="Cadastrar paciente"
      description="Cadastre um paciente fictício para explorar a plataforma. Dados mantidos apenas nesta sessão."
    >
      <form onSubmit={submit} className="max-w-4xl border border-border bg-card">
        <PatientRegistrationFields />
        <div className="flex justify-end gap-3 border-t border-border bg-muted/40 px-6 py-4">
          <Button variant="outline" asChild>
            <Link to="/patients">Cancelar</Link>
          </Button>
          <Button type="submit">
            <Check />
            Cadastrar paciente
          </Button>
        </div>
      </form>
    </Page>
  );
}
function Field({ label, ...props }: { label: string } & React.ComponentProps<typeof Input>) {
  return (
    <div>
      <label className="label">{label}</label>
      <Input
        name={
          (
            {
              "Nome completo": "name",
              CPF: "cpf",
              RG: "rg",
              "Data de nascimento": "birth",
              Telefone: "phone",
              "E-mail": "email",
              Endereço: "address",
            } as Record<string, string>
          )[label] ?? label
        }
        {...props}
      />
    </div>
  );
}

export { NewResultsPage } from "./NewResultsPage";
export function ResultsPage() {
  return (
    <Page
      title="Resultados laboratoriais"
      description="Resultados organizados por categoria para consulta objetiva."
    >
      <div className="toolbar">
        <div className="relative max-w-lg flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Pesquisar marcador ou categoria" />
        </div>
        <StatusBadge>Coleta: 18/09/2026</StatusBadge>
      </div>
      <ResultsContent />
    </Page>
  );
}
export function ComparisonPage() {
  return (
    <Page
      title="Comparar resultados"
      description="Entenda o que mudou nos exames do paciente e explore o contexto por trás dos números."
    >
      <ComparisonContent />
    </Page>
  );
}
export function HistoryPage({ account = false }: { account?: boolean }) {
  const [query, setQuery] = useState("");
  const { patients } = usePatientDirectory();
  const navigate = useNavigate();
  return (
    <Page
      title="Histórico de exames"
      description="Selecione um paciente para acessar sua linha do tempo laboratorial."
    >
      <div className="border border-border bg-card p-5">
        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-11 pl-9"
            placeholder="Pesquisar paciente"
            aria-label="Pesquisar paciente"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="mt-5 divide-y divide-border">
          {patients
            .filter((p) => (p.name + " " + p.cpf).toLowerCase().includes(query.toLowerCase()))
            .map((p) => (
              <div key={p.id} className="flex items-center justify-between py-4">
                <div>
                  <p className="text-sm font-semibold">{p.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.exam} · {p.updated}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    navigate({
                      to: "/patients/$patientId",
                      params: { patientId: p.id },
                      search: account ? { workspace: "account" } : {},
                    })
                  }
                >
                  Abrir histórico
                </Button>
              </div>
            ))}
        </div>
      </div>
    </Page>
  );
}

export { DoctorsPage } from "./DoctorsPage";
export function FollowUpPage({ account = false }: { account?: boolean }) {
  const { patients } = usePatientDirectory();
  return (
    <Page
      title="Acompanhamento"
      description="Pacientes com movimentações recentes no histórico laboratorial."
    >
      <div className="grid gap-4 lg:grid-cols-3">
        {patients.map((p, i) => (
          <article key={p.id} className="border border-border bg-card p-5">
            <div className="flex items-start justify-between">
              <Activity className="size-5 text-brand" />
              <StatusBadge fresh={p.status.includes("Novo")}>{p.status}</StatusBadge>
            </div>
            <h2 className="mt-5 font-display text-lg font-semibold">{p.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{p.exam}</p>
            <p className="mt-4 text-xs text-muted-foreground">Última atualização · {p.updated}</p>
            <Button asChild variant="outline" size="sm" className="mt-4">
              <Link
                to="/patients/$patientId"
                params={{ patientId: p.id }}
                search={account ? { workspace: "account" } : {}}
              >
                Ver evolução
              </Link>
            </Button>
          </article>
        ))}
      </div>
    </Page>
  );
}
const operationData = [
  { month: "Abr", exames: 1480, pacientes: 604 },
  { month: "Mai", exames: 1620, pacientes: 655 },
  { month: "Jun", exames: 1750, pacientes: 712 },
  { month: "Jul", exames: 1840, pacientes: 760 },
  { month: "Ago", exames: 2010, pacientes: 818 },
  { month: "Set", exames: 2240, pacientes: 902 },
];
export function IndicatorsPage() {
  const stats = [
    ["Exames realizados", "12.482", FileText],
    ["Pacientes atendidos", "4.821", Users],
    ["Médicos parceiros", "86", Stethoscope],
    ["Clínicas parceiras", "24", Building2],
  ] as const;
  return (
    <Page
      title="Indicadores INOVA"
      description="Visão demonstrativa da operação e utilização da plataforma."
    >
      <div className="grid gap-px border border-border bg-border sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(([l, v, I]) => (
          <div key={l} className="bg-card p-5">
            <I className="size-5 text-brand" />
            <p className="mt-6 font-display text-3xl font-semibold">{v}</p>
            <p className="mt-1 text-sm text-muted-foreground">{l}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <ChartBox title="Exames por mês">
          <OperationsChart data={operationData} dataKey="exames" />
        </ChartBox>
        <ChartBox title="Pacientes por mês">
          <OperationsChart data={operationData} dataKey="pacientes" />
        </ChartBox>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <article className="border border-border bg-card p-5">
          <h2 className="section-title">Novos médicos parceiros</h2>
          <p className="mt-5 font-display text-4xl font-semibold">+14</p>
          <p className="mt-2 text-sm text-muted-foreground">nos últimos 90 dias</p>
        </article>
        <article className="border border-border bg-card p-5">
          <h2 className="section-title">Evolução da utilização</h2>
          <p className="mt-5 font-display text-4xl font-semibold text-brand-deep">+28,4%</p>
          <p className="mt-2 text-sm text-muted-foreground">comparado ao trimestre anterior</p>
        </article>
      </div>
    </Page>
  );
}
function ChartBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border border-border bg-card p-5">
      <h2 className="section-title">{title}</h2>
      <p className="section-subtitle">Últimos seis meses</p>
      <div className="mt-3">{children}</div>
    </section>
  );
}
export function SettingsPage() {
  const [saved, setSaved] = useState(false);
  return (
    <Page title="Configurações" description="Preferências demonstrativas do ambiente médico.">
      <div className="max-w-3xl border border-border bg-card">
        <div className="p-6">
          <h2 className="section-title">Preferências de acompanhamento</h2>
          <div className="mt-5 space-y-5">
            <Field label="Nome de exibição" defaultValue="Dr. Rafael Mendes" />
            <Field label="CRM" defaultValue="123456/SP" />
            <div>
              <label className="label">Notificações de resultados</label>
              <Select defaultValue="imediatas">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="imediatas">Imediatas</SelectItem>
                  <SelectItem value="diarias">Resumo diário</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-border bg-muted/40 p-4">
          {saved && <span className="text-xs text-brand-deep">Configurações salvas</span>}
          <Button
            onClick={() => {
              setSaved(true);
              toast.success("Configurações salvas com sucesso.");
            }}
          >
            Salvar alterações
          </Button>
        </div>
      </div>
    </Page>
  );
}
