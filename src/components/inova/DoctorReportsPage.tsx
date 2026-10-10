import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Users, FileText, ClipboardCheck, CalendarClock, Printer } from "lucide-react";
import { getDoctorWork } from "@/lib/care";
import { usePatientDirectory } from "./patient-directory";
import { Page } from "./Page";
import { Button } from "@/components/ui/button";
import { getRealDoctorWork } from "@/lib/real-doctor-work";

export function DoctorReportsPage({ account = false }: { account?: boolean }) {
  const { patients } = usePatientDirectory();
  const ids = JSON.stringify(patients.map((p) => p.id));
  const [data, setData] = useState<Awaited<ReturnType<typeof getDoctorWork>>>([]);
  const [period, setPeriod] = useState("all");
  const [version, setVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let current = true;
    setLoading(true);
    void (account ? getRealDoctorWork() : getDoctorWork({ data: { patientIds: JSON.parse(ids) } }))
      .then((result) => {
        if (current) {
          setData(result);
          setError("");
        }
      })
      .catch(() => {
        if (current) setError("Não foi possível carregar os relatórios. Tente atualizar.");
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [ids, version, account]);
  const cutoff = period === "all" ? 0 : Date.now() - Number(period) * 86400000;
  const within = (at: string | null | undefined) => !!at && Date.parse(at) >= cutoff;
  const submissions = data.flatMap((row) =>
    row.submissions
      .filter((item) => within(item.receivedAt))
      .map((item) => ({
        ...item,
        name: patients.find((p) => p.id === row.patientId)?.name ?? row.patientId,
      })),
  );
  const orders = data.flatMap((row) =>
    row.orders.filter((item) => within(item.releasedAt) && item.status === "released"),
  );
  const guidance = data.flatMap((row) =>
    row.guidance.filter((item) => within(item.publishedAt) && !item.withdrawnAt),
  );
  const returns = data.flatMap((row) =>
    row.returns.filter((item) => within(item.publishedAt) && !item.cancelledAt),
  );
  const buckets = new Map<
    string,
    { month: string; envios: number; pedidos: number; orientacoes: number }
  >();
  for (const [kind, dates] of [
    ["envios", submissions.map((i) => i.receivedAt)],
    ["pedidos", orders.map((i) => i.releasedAt)],
    ["orientacoes", guidance.map((i) => i.publishedAt)],
  ] as const) {
    for (const at of dates) {
      if (!at) continue;
      const month = at.slice(0, 7);
      const row = buckets.get(month) ?? { month, envios: 0, pedidos: 0, orientacoes: 0 };
      row[kind]++;
      buckets.set(month, row);
    }
  }
  const chart = [...buckets.values()].sort((a, b) => a.month.localeCompare(b.month));
  const available = !loading && !error;
  const stats = [
    ["Pacientes na minha carteira", patients.length, Users],
    ["Envios no período", submissions.length, FileText],
    ["Envios aguardando revisão", submissions.filter((i) => !i.reviewed).length, ClipboardCheck],
    ["Retornos publicados no período", returns.length, CalendarClock],
  ] as const;
  return (
    <div className="doctor-reports">
      <Page
        title="Meus relatórios"
        description={
          account
            ? "Atividade e pendências da sua carteira de pacientes, com dados da sua conta."
            : "Atividade e pendências da sua carteira de pacientes. Dados do Dr. Rafael Mendes na demonstração."
        }
      >
        <div className="surface flex flex-wrap items-end justify-between gap-4 p-4 print:hidden">
          <label className="text-xs font-medium" htmlFor="report-period">
            Período de atividade
            <select
              id="report-period"
              className="mt-2 block h-10 rounded-lg border border-input bg-background px-3 text-sm"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            >
              <option value="all">Todo o histórico disponível</option>
              <option value="30">Últimos 30 dias</option>
              <option value="90">Últimos 90 dias</option>
              <option value="180">Últimos 180 dias</option>
            </select>
          </label>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={loading} onClick={() => setVersion((v) => v + 1)}>
              Atualizar relatórios
            </Button>
            <Button variant="outline" disabled={!available} onClick={() => window.print()}>
              <Printer />
              Imprimir / salvar PDF
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          A carteira mostra o total cadastrado; as atividades e pendências abaixo respeitam o
          período selecionado. Envios locais expiram após 24 horas ou reinício do servidor.
        </p>
        {error && (
          <p role="alert" className="surface p-4 text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map(([label, value, Icon], index) => (
            <article className="surface p-5" key={label}>
              <Icon className="size-5 text-brand" />
              <p className="mt-5 font-display text-3xl font-semibold">
                {index === 0 || available ? value : loading ? "…" : "—"}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">{label}</p>
            </article>
          ))}
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          <section className="surface p-5">
            <h2 className="text-lg font-semibold">Minha atividade por mês</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Envios recebidos, pedidos liberados e orientações publicadas.
            </p>
            {available && chart.length ? (
              <div className="mt-5 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chart}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="envios" name="Envios" fill="#08a6bf" />
                    <Bar dataKey="pedidos" name="Pedidos" fill="#155566" />
                    <Bar dataKey="orientacoes" name="Orientações" fill="#7fcbd6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="py-12 text-sm text-muted-foreground">
                {loading
                  ? "Carregando atividades…"
                  : error
                    ? "Dados indisponíveis."
                    : "Nenhuma atividade registrada neste período."}
              </p>
            )}
          </section>
          <section className="surface p-5">
            <h2 className="text-lg font-semibold">Publicações e documentos</h2>
            <div className="mt-5 space-y-4">
              {[
                ["Pedidos liberados", orders.length],
                ["Orientações publicadas", guidance.length],
                ["PDFs recebidos", submissions.reduce((n, i) => n + i.documents.length, 0)],
                ["Áudios recebidos", submissions.reduce((n, i) => n + i.audios.length, 0)],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex justify-between border-b border-border pb-3 text-sm"
                >
                  <span>{label}</span>
                  <strong>{available ? value : "—"}</strong>
                </div>
              ))}
            </div>
            <p className="mt-5 text-xs text-muted-foreground">
              Esses totais correspondem aos registros disponíveis no sistema, sem métricas gerais da
              operação INOVA.
            </p>
          </section>
        </div>
        <section className="surface p-5">
          <h2 className="text-lg font-semibold">Envios para acompanhar</h2>
          <div className="mt-4 space-y-3">
            {available &&
              submissions.map((item) => (
                <Link
                  key={item.id}
                  to="/patients/$patientId"
                  params={{ patientId: item.patientId }}
                  search={account ? { workspace: "account" } : {}}
                  hash="Envios do paciente"
                  className="flex flex-wrap justify-between gap-3 rounded-xl border border-border p-4 hover:bg-brand-soft"
                >
                  <div>
                    <p className="text-sm font-semibold">{item.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(item.receivedAt).toLocaleString("pt-BR")} · {item.documents.length}{" "}
                      PDF(s)
                    </p>
                  </div>
                  <span className="text-sm text-brand-deep">
                    {item.reviewed ? "Revisado" : "Aguardando revisão"} →
                  </span>
                </Link>
              ))}
            {available && !submissions.length && (
              <p className="text-sm text-muted-foreground">Nenhum envio neste período.</p>
            )}
          </div>
        </section>
      </Page>
      <style>{`@media print { body:has(.doctor-reports) aside, body:has(.doctor-reports) header {display:none!important} body:has(.doctor-reports) .lg\\:pl-\\[248px\\],body:has(.doctor-reports) .lg\\:pl-\\[76px\\]{padding-left:0!important} .doctor-reports .surface{break-inside:avoid} }`}</style>
    </div>
  );
}
