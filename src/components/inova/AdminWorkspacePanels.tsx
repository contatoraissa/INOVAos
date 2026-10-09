import { useEffect, useRef, useState } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Users,
  Activity,
  CreditCard,
  MessageSquare,
  ArrowRight,
  Sparkles,
  CalendarDays,
  Check,
  Plus,
  Star,
  Copy,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { getAiStatus, summarizeAdmin } from "@/lib/ai";
import {
  activitySeries,
  adminDate,
  adminId,
  adminSnapshot,
  feedbackCategories,
  latestFeedback,
  subscriptionStatuses,
  usage,
  workspaceMetrics,
  type AdminWorkspace,
  adminDay,
  adminMoney,
} from "@/lib/admin-workspace";

export type AdminMutation = (next: AdminWorkspace, action: string, detail: string) => boolean;
export function AdminBadge({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "warn" | "muted" | "bad";
}) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${tone === "warn" ? "bg-amber-50 text-amber-800" : tone === "bad" ? "bg-rose-50 text-rose-700" : tone === "muted" ? "bg-slate-100 text-slate-600" : "bg-brand-soft text-brand-deep"}`}
    >
      {children}
    </span>
  );
}
export function AdminStat({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: typeof Users;
}) {
  return (
    <article className="surface p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">{label}</p>
        <span className="flex size-9 items-center justify-center rounded-xl bg-brand-soft">
          <Icon className="size-4 text-brand-deep" />
        </span>
      </div>
      <p className="mt-4 font-display text-3xl font-semibold tracking-tight">{value}</p>
      <p className="mt-2 text-xs text-muted-foreground">{detail}</p>
    </article>
  );
}
function ChartBox({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="surface min-w-0 p-5">
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      <div className="mt-5 h-64 min-w-0" role="img" aria-label={title}>
        {children}
      </div>
    </section>
  );
}
const chartColors = ["#00a8bf", "#8f6cf6", "#eeb947", "#94a3b8"];
export function AdminOverview({
  data,
  onTab,
}: {
  data: AdminWorkspace;
  onTab: (tab: string) => void;
}) {
  const m = workspaceMetrics(data),
    activity = activitySeries(data, 30);
  const growth = Array.from({ length: 8 }, (_, index) => {
    const month = `2026-${String(index + 3).padStart(2, "0")}`;
    return {
      month: new Date(month + "-15T12:00:00Z").toLocaleDateString("pt-BR", {
        month: "short",
        timeZone: "UTC",
      }),
      doctors: data.users.filter((u) => u.createdAt.startsWith(month) && u.role === "Médico")
        .length,
      patients: data.users.filter((u) => u.createdAt.startsWith(month) && u.role === "Paciente")
        .length,
    };
  });
  const dist = [
    { name: "Em uso", value: m.engaged },
    { name: "Atenção", value: m.attention },
    { name: "Sem uso recente", value: m.inactive },
    { name: "Desativados", value: m.disabled },
  ].filter((i) => i.value);
  const sentiments = [
    { name: "Positivo", value: m.positive },
    { name: "Neutro", value: m.neutral },
    { name: "Negativo", value: m.negative },
    { name: "Sem feedback", value: m.unknown },
  ];
  return (
    <>
      <section className="relative overflow-hidden rounded-3xl bg-[#123e4a] p-6 text-white sm:p-8">
        <div className="relative z-10 max-w-2xl">
          <p className="text-[10px] font-medium tracking-[.18em] text-cyan-200">
            INOVA · SUA OPERAÇÃO EM PERSPECTIVA
          </p>
          <h2 className="mt-4 font-display text-3xl font-semibold">
            Entenda quem chega.
            <br />
            Acompanhe quem fica.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-200">
            Usuários, participação e relacionamento reunidos para você decidir o próximo passo com
            contexto.
          </p>
          <Button
            className="mt-5 bg-white text-[#123e4a] hover:bg-slate-100"
            onClick={() => onTab("Resumo com IA")}
          >
            <Sparkles className="size-4" /> Preparar resumo da operação{" "}
            <ArrowRight className="size-4" />
          </Button>
        </div>
        <svg
          className="pointer-events-none absolute -right-16 top-3 hidden h-72 w-96 opacity-10 md:block"
          viewBox="0 0 160 80"
          fill="none"
        >
          <path
            d="M80 40C62 15 48 9 32 13C2 21 2 59 32 67C48 71 62 65 80 40C98 15 112 9 128 13C158 21 158 59 128 67C112 71 98 65 80 40Z"
            stroke="white"
            strokeWidth="10"
          />
        </svg>
      </section>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStat
          label="Usuários cadastrados"
          value={m.total}
          detail={`${data.users.filter((u) => u.role === "Médico").length} médicos · ${data.users.filter((u) => u.role === "Paciente").length} pacientes`}
          icon={Users}
        />
        <AdminStat
          label="Em uso nos últimos 7 dias"
          value={m.engaged}
          detail={`${m.enabled} contas habilitadas · ${m.disabled} desativadas`}
          icon={Activity}
        />
        <AdminStat
          label="MRR simulado"
          value={adminMoney(m.mrr)}
          detail="Somente assinaturas Ativas; não é recebimento"
          icon={CreditCard}
        />
        <AdminStat
          label="Satisfação registrada"
          value={m.average === null ? "Sem notas" : `${m.average.toFixed(1).replace(".", ",")} / 5`}
          detail={`${m.total - m.unknown} usuários com nota · ${m.unknown} sem feedback`}
          icon={MessageSquare}
        />
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <ChartBox
          title="Participação ao longo do tempo"
          description="Usuários distintos e interações fictícias por dia · últimos 30 dias"
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={activity}>
              <defs>
                <linearGradient id="admin-area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00a8bf" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#00a8bf" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 5" />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} minTickGap={30} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={25} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area
                type="monotone"
                dataKey="events"
                name="Interações"
                stroke="#00a8bf"
                fill="url(#admin-area)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="users"
                name="Usuários distintos"
                stroke="#8f6cf6"
                fill="transparent"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartBox>
        <ChartBox
          title="Crescimento da base"
          description="Cadastros fictícios por mês · março a outubro de 2026"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={growth}>
              <CartesianGrid vertical={false} strokeDasharray="3 5" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} width={25} />
              <Tooltip />
              <Bar dataKey="doctors" name="Médicos" stackId="users" fill="#00a8bf" />
              <Bar
                dataKey="patients"
                name="Pacientes"
                stackId="users"
                fill="#87d8e4"
                radius={[5, 5, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartBox>
      </div>
      <div className="grid gap-5 xl:grid-cols-3">
        <ChartBox
          title="Participação da base"
          description="Conta desativada é diferente de conta sem uso"
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={dist}
                dataKey="value"
                nameKey="name"
                innerRadius={65}
                outerRadius={88}
                paddingAngle={4}
              >
                {dist.map((d, i) => (
                  <Cell key={d.name} fill={chartColors[i % 4]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartBox>
        <ChartBox
          title="O que os usuários dizem"
          description="Última nota de cada usuário, incluindo quem não respondeu"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sentiments} layout="vertical">
              <XAxis type="number" allowDecimals={false} hide />
              <YAxis
                type="category"
                dataKey="name"
                width={94}
                tick={{ fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip />
              <Bar dataKey="value" name="Usuários" fill="#00a8bf" radius={[0, 5, 5, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartBox>
        <section className="surface p-5">
          <h2 className="font-display text-lg font-semibold">O que merece atenção</h2>
          <div className="mt-5 space-y-4">
            {[
              [`${m.inactive} contas sem uso há mais de 30 dias`, "Contatos e reativação"],
              [`${m.negative} usuários com feedback negativo`, "Feedbacks"],
              [`${m.overdue} assinaturas com pagamento pendente`, "Assinaturas"],
              [`${m.pendingTasks} contatos planejados`, "Contatos e reativação"],
            ].map(([text, tab]) => (
              <button
                key={text}
                className="flex w-full items-center justify-between gap-3 rounded-xl bg-muted/40 p-3 text-left text-xs hover:bg-brand-soft"
                onClick={() => onTab(tab!)}
              >
                {text}
                <ArrowRight className="size-4 shrink-0 text-brand" />
              </button>
            ))}
          </div>
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
            Sem uso é um sinal para investigar. Não prova insatisfação ou abandono.
          </p>
        </section>
      </div>
    </>
  );
}
export function AdminActivity({ data }: { data: AdminWorkspace }) {
  const [period, setPeriod] = useState(30),
    [profile, setProfile] = useState("Todos");
  const scoped = {
      ...data,
      activities: data.activities.filter(
        (a) => profile === "Todos" || data.users.find((u) => u.id === a.userId)?.role === profile,
      ),
    },
    series = activitySeries(scoped, period),
    from = series[0]!.date;
  const events = scoped.activities
    .filter((a) => a.at.slice(0, 10) >= from && a.at.slice(0, 10) <= adminDate)
    .sort((a, b) => b.at.localeCompare(a.at));
  const features = ["Acesso", "Agenda", "Envio", "Resultados", "Pedido de exames"].map((name) => ({
    name,
    count: events.filter((a) => a.feature === name).length,
  }));
  return (
    <>
      <div className="surface flex flex-wrap items-center justify-between gap-3 p-4">
        <p className="text-sm">Atividade registrada na demonstração</p>
        <div className="flex gap-2">
          <select
            className="admin-select"
            aria-label="Perfil da atividade"
            value={profile}
            onChange={(e) => setProfile(e.target.value)}
          >
            {["Todos", "Médico", "Paciente"].map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
          <select
            className="admin-select"
            aria-label="Período da atividade"
            value={period}
            onChange={(e) => setPeriod(Number(e.target.value))}
          >
            {[7, 30, 90].map((p) => (
              <option key={p} value={p}>
                Últimos {p} dias
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <AdminStat
          label="Interações no período"
          value={events.length}
          detail="Eventos fictícios e acessos simulados manualmente"
          icon={Activity}
        />
        <AdminStat
          label="Usuários participantes"
          value={new Set(events.map((e) => e.userId)).size}
          detail="Distintos no período selecionado"
          icon={Users}
        />
        <AdminStat
          label="Média diária de interações"
          value={(events.length / period).toFixed(1).replace(".", ",")}
          detail={`${period} dias na referência da demonstração`}
          icon={CalendarDays}
        />
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <ChartBox title="Interações por dia" description="Período e perfil selecionados">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series}>
              <CartesianGrid vertical={false} strokeDasharray="3 5" />
              <XAxis dataKey="day" minTickGap={30} tick={{ fontSize: 10 }} />
              <YAxis allowDecimals={false} width={25} />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="events"
                name="Interações"
                stroke="#00a8bf"
                fill="#00a8bf22"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartBox>
        <ChartBox
          title="Uso por funcionalidade"
          description="Contagem de eventos, não avaliação de satisfação"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={features} layout="vertical">
              <XAxis type="number" allowDecimals={false} />
              <YAxis dataKey="name" type="category" width={112} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" name="Eventos" fill="#00a8bf" radius={[0, 5, 5, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartBox>
      </div>
      <section className="surface p-5">
        <h2 className="font-semibold">Últimas interações</h2>
        <div className="mt-4 max-h-96 space-y-3 overflow-y-auto overscroll-contain">
          {events.slice(0, 100).map((event) => (
            <div
              key={event.id}
              className="flex flex-wrap justify-between gap-2 rounded-xl bg-muted/30 p-3 text-sm"
            >
              <span>
                {data.users.find((u) => u.id === event.userId)?.name}{" "}
                <span className="text-muted-foreground">· {event.feature}</span>
              </span>
              <span className="text-xs text-muted-foreground">
                {new Date(event.at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
              </span>
            </div>
          ))}
          {!events.length && (
            <p className="text-sm text-muted-foreground">
              Nenhuma interação registrada nesse período.
            </p>
          )}
        </div>
      </section>
    </>
  );
}
export function AdminSubscriptions({
  data,
  commit,
}: {
  data: AdminWorkspace;
  commit: AdminMutation;
}) {
  const [target, setTarget] = useState<AdminWorkspace["subscriptions"][number] | null>(null),
    m = workspaceMetrics(data);
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <AdminStat
          label="MRR simulado"
          value={adminMoney(m.mrr)}
          detail="Soma mensal das assinaturas Ativas"
          icon={CreditCard}
        />
        <AdminStat
          label="Assinaturas em teste"
          value={data.subscriptions.filter((s) => s.status === "Teste").length}
          detail="Sem cobrança real"
          icon={Users}
        />
        <AdminStat
          label="Pagamentos pendentes"
          value={m.overdue}
          detail="Status demonstrativo; não consultado no banco"
          icon={AlertCircle}
        />
      </div>
      <div className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
        <ChartBox title="Situação das assinaturas" description="Distribuição da carteira fictícia">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={subscriptionStatuses.map((name) => ({
                name,
                count: data.subscriptions.filter((s) => s.status === name).length,
              }))}
              layout="vertical"
            >
              <XAxis type="number" allowDecimals={false} />
              <YAxis dataKey="name" type="category" width={135} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" name="Assinaturas" fill="#00a8bf" radius={[0, 5, 5, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartBox>
        <section className="surface p-5">
          <h2 className="font-semibold">Planos e condições</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Essencial e Profissional são exemplos de oferta. Alterar o plano aqui atualiza somente o
            cenário administrativo deste navegador; não cobra, libera recursos clínicos ou encerra
            uma conta.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {[
              ["Essencial", 14900],
              ["Profissional", 24900],
            ].map(([name, price]) => (
              <div key={name} className="rounded-xl border border-brand/20 p-4">
                <p className="text-sm font-semibold">{name}</p>
                <p className="mt-2 text-2xl text-brand-deep">
                  {adminMoney(Number(price))}
                  <span className="text-xs">/mês</span>
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Preço de exemplo, sem contrato ativo.
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
      <section className="surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Médico</th>
                <th>Plano</th>
                <th>Situação</th>
                <th>Mensalidade</th>
                <th>Renovação ilustrativa</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {data.subscriptions.map((sub) => (
                <tr key={sub.userId}>
                  <td>{data.users.find((u) => u.id === sub.userId)?.name}</td>
                  <td>{sub.plan}</td>
                  <td>
                    <AdminBadge
                      tone={
                        sub.status === "Pagamento pendente"
                          ? "warn"
                          : sub.status === "Cancelada"
                            ? "muted"
                            : "default"
                      }
                    >
                      {sub.status}
                    </AdminBadge>
                  </td>
                  <td>{adminMoney(sub.monthlyCents)}</td>
                  <td>{adminDay(sub.renewal)}</td>
                  <td>
                    <Button variant="outline" size="sm" onClick={() => setTarget({ ...sub })}>
                      Editar plano
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <Dialog
        open={!!target}
        onOpenChange={(open) => {
          if (!open) setTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar assinatura demonstrativa</DialogTitle>
            <DialogDescription>
              Esta alteração será registrada no histórico local. Nenhuma cobrança real será
              realizada.
            </DialogDescription>
          </DialogHeader>
          {target && (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (
                  commit(
                    {
                      ...data,
                      subscriptions: data.subscriptions.map((s) =>
                        s.userId === target.userId ? target : s,
                      ),
                    },
                    "Assinatura atualizada",
                    `${data.users.find((u) => u.id === target.userId)?.name}: ${target.plan} · ${target.status}`,
                  )
                )
                  setTarget(null);
              }}
            >
              <div>
                <label className="label" htmlFor="admin-plan">
                  Plano
                </label>
                <select
                  id="admin-plan"
                  className="admin-select w-full"
                  value={target.plan}
                  onChange={(e) =>
                    setTarget({
                      ...target,
                      plan: e.target.value as typeof target.plan,
                      monthlyCents: e.target.value === "Essencial" ? 14900 : 24900,
                    })
                  }
                >
                  {["Essencial", "Profissional"].map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="admin-plan-status">
                  Situação
                </label>
                <select
                  id="admin-plan-status"
                  className="admin-select w-full"
                  value={target.status}
                  onChange={(e) =>
                    setTarget({ ...target, status: e.target.value as typeof target.status })
                  }
                >
                  {subscriptionStatuses.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="admin-renewal">
                  Renovação ilustrativa
                </label>
                <Input
                  id="admin-renewal"
                  required
                  type="date"
                  value={target.renewal}
                  onChange={(e) => setTarget({ ...target, renewal: e.target.value })}
                />
              </div>
              <Button type="submit">Salvar assinatura</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
export function AdminRelationships({
  data,
  commit,
  initialUser,
}: {
  data: AdminWorkspace;
  commit: AdminMutation;
  initialUser: string;
}) {
  const [user, setUser] = useState(initialUser || data.users[0]?.id || ""),
    [kind, setKind] = useState<AdminWorkspace["tasks"][number]["kind"]>("Reativação"),
    [channel, setChannel] = useState<AdminWorkspace["tasks"][number]["channel"]>("E-mail"),
    [due, setDue] = useState(adminDate),
    [note, setNote] = useState(""),
    [state, setState] = useState("Planejado"),
    [copied, setCopied] = useState(false);
  const recipient = data.users.find((u) => u.id === user),
    tasks = data.tasks
      .filter((t) => state === "Todos" || t.state === state)
      .sort((a, b) => a.due.localeCompare(b.due));
  const message =
    kind === "Pedido de feedback"
      ? `Olá, ${recipient?.name ?? ""}! Como está sua experiência com o INOVA? O que está ajudando e o que podemos melhorar? Sua resposta vai orientar os próximos passos.`
      : `Olá, ${recipient?.name ?? ""}! Queremos entender como está sua experiência com o INOVA. Posso ajudar com alguma dificuldade ou agendar uma conversa breve?`;
  return (
    <>
      <div className="grid gap-5 xl:grid-cols-[.9fr_1.1fr]">
        <section className="surface p-5">
          <h2 className="font-display text-lg font-semibold">Planejar um contato</h2>
          <p className="mt-2 text-xs text-muted-foreground">
            Registro manual. Nenhum e-mail, chamada ou WhatsApp será enviado.
          </p>
          <form
            className="mt-5 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              const entry = {
                id: adminId(),
                userId: user,
                kind,
                channel,
                due,
                state: "Planejado" as const,
                note: note.trim(),
                at: new Date().toISOString(),
              };
              if (
                commit(
                  { ...data, tasks: [entry, ...data.tasks] },
                  "Contato planejado",
                  `${recipient?.name}: ${kind} · ${adminDay(due)}`,
                )
              )
                setNote("");
            }}
          >
            <div>
              <label className="label" htmlFor="admin-contact-user">
                Usuário
              </label>
              <select
                id="admin-contact-user"
                className="admin-select w-full"
                value={user}
                onChange={(e) => {
                  setUser(e.target.value);
                  setCopied(false);
                }}
              >
                {data.users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} · {u.role}
                  </option>
                ))}
              </select>
            </div>
            {recipient && (
              <div className="rounded-xl border border-border bg-brand-soft p-4">
                <p className="text-sm font-semibold">Contatos de {recipient.name}</p>
                <p className="mt-3 text-xs text-muted-foreground">E-mail</p>
                <a
                  className="mt-1 block break-all text-sm text-brand underline underline-offset-4"
                  href={`mailto:${recipient.email}`}
                >
                  {recipient.email}
                </a>
                <p className="mt-3 text-xs text-muted-foreground">
                  Telefone / WhatsApp: não cadastrado.
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Endereço fictício de demonstração. Clique no e-mail para abrir seu aplicativo.
                </p>
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="admin-contact-kind">
                  Objetivo
                </label>
                <select
                  id="admin-contact-kind"
                  className="admin-select w-full"
                  value={kind}
                  onChange={(e) => setKind(e.target.value as typeof kind)}
                >
                  {["Reativação", "Pedido de feedback", "Acompanhamento"].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="admin-contact-channel">
                  Canal
                </label>
                <select
                  id="admin-contact-channel"
                  className="admin-select w-full"
                  value={channel}
                  onChange={(e) => setChannel(e.target.value as typeof channel)}
                >
                  {["E-mail", "WhatsApp", "Telefone"].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="label" htmlFor="admin-contact-due">
                Próximo contato
              </label>
              <Input
                id="admin-contact-due"
                required
                type="date"
                value={due}
                onChange={(e) => setDue(e.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="admin-contact-note">
                Contexto / próximo passo
              </label>
              <Textarea
                id="admin-contact-note"
                required
                maxLength={2000}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="O que você pretende entender ou acompanhar?"
              />
            </div>
            <Button disabled={!note.trim() || !user} type="submit">
              <Plus className="size-4" /> Salvar registro
            </Button>
          </form>
        </section>
        <section className="surface p-5">
          <h2 className="font-display text-lg font-semibold">Uma conversa, com cuidado</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Priorize perguntas. Pouco uso pode ter vários motivos; evite presumir que o usuário está
            insatisfeito.
          </p>
          <p className="mt-5 text-xs font-semibold">Sugestão de mensagem</p>
          <Textarea
            className="mt-2 min-h-32"
            aria-label="Mensagem sugerida para contato"
            value={message}
            readOnly
          />
          <Button
            className="mt-3"
            variant="outline"
            onClick={() => {
              if (navigator.clipboard)
                void navigator.clipboard
                  .writeText(message)
                  .then(() => setCopied(true))
                  .catch(() => setCopied(false));
            }}
          >
            <Copy className="size-4" />
            {copied ? "Mensagem copiada" : "Copiar mensagem"}
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">
            Se a cópia não estiver disponível, selecione o texto acima. O envio é feito por você,
            fora deste portal.
          </p>
          <div className="mt-6 rounded-xl bg-brand-soft p-4">
            <p className="text-sm font-semibold">
              {data.users.filter((u) => usage(u) === "Sem uso recente").length} usuários sem uso
              recente
            </p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Registre tentativa, resposta e próxima ação. Concluir um contato não reativa uma conta
              automaticamente.
            </p>
          </div>
        </section>
      </div>
      <section className="surface p-5">
        <div className="flex flex-wrap justify-between gap-3">
          <h2 className="font-display text-lg font-semibold">Acompanhamento de contatos</h2>
          <select
            className="admin-select"
            aria-label="Situação dos contatos"
            value={state}
            onChange={(e) => setState(e.target.value)}
          >
            {["Planejado", "Concluído", "Todos"].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </div>
        <div className="mt-5 max-h-[480px] space-y-3 overflow-y-auto overscroll-contain">
          {tasks.map((task) => (
            <article key={task.id} className="rounded-xl border border-border p-4">
              <div className="flex flex-wrap justify-between gap-2">
                <p className="text-sm font-semibold">
                  {data.users.find((u) => u.id === task.userId)?.name}
                </p>
                <AdminBadge
                  tone={task.state === "Planejado" && task.due < adminDate ? "warn" : "default"}
                >
                  {task.state === "Planejado" && task.due < adminDate
                    ? "Contato atrasado"
                    : task.state}
                </AdminBadge>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {task.kind} · {task.channel} · {adminDay(task.due)}
              </p>
              <a
                className="mt-2 block break-all text-xs text-brand underline underline-offset-4"
                href={`mailto:${data.users.find((u) => u.id === task.userId)?.email ?? ""}`}
              >
                {data.users.find((u) => u.id === task.userId)?.email}
              </a>
              <p className="mt-3 whitespace-pre-wrap break-words text-sm">{task.note}</p>
              {task.state === "Planejado" && (
                <Button
                  className="mt-3"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    commit(
                      {
                        ...data,
                        tasks: data.tasks.map((t) =>
                          t.id === task.id ? { ...t, state: "Concluído" } : t,
                        ),
                      },
                      "Contato concluído",
                      `${data.users.find((u) => u.id === task.userId)?.name}: ${task.kind}`,
                    )
                  }
                >
                  <Check className="size-4" /> Marcar contato concluído
                </Button>
              )}
            </article>
          ))}
          {!tasks.length && (
            <p className="text-sm text-muted-foreground">Nenhum contato nesta seleção.</p>
          )}
        </div>
        {data.contacts.length > 0 && (
          <details className="mt-5 text-sm">
            <summary className="cursor-pointer text-brand-deep">
              Registros do portal anterior ({data.contacts.length})
            </summary>
            <div className="mt-3 space-y-2">
              {data.contacts.map((c) => (
                <p key={c.id} className="break-words rounded-xl bg-muted/30 p-3 text-xs">
                  {data.users.find((u) => u.id === c.userId)?.name} · {c.kind} · {c.note}
                </p>
              ))}
            </div>
          </details>
        )}
      </section>
    </>
  );
}
export function AdminFeedback({
  data,
  commit,
  initialUser,
}: {
  data: AdminWorkspace;
  commit: AdminMutation;
  initialUser: string;
}) {
  const [user, setUser] = useState(initialUser || data.users[0]?.id || ""),
    [rating, setRating] = useState(5),
    [category, setCategory] = useState<(typeof feedbackCategories)[number]>("Experiência geral"),
    [comment, setComment] = useState(""),
    [filter, setFilter] = useState("Todos");
  const m = workspaceMetrics(data),
    filtered = data.feedback
      .filter(
        (f) =>
          filter === "Todos" ||
          (filter === "Positivo"
            ? f.rating >= 4
            : filter === "Negativo"
              ? f.rating <= 2
              : f.rating === 3),
      )
      .sort((a, b) => b.at.localeCompare(a.at));
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <AdminStat
          label="Feedback positivo"
          value={m.positive}
          detail="Última nota 4 ou 5 de cada usuário"
          icon={Star}
        />
        <AdminStat
          label="Feedback negativo"
          value={m.negative}
          detail="Última nota 1 ou 2; requer investigação"
          icon={MessageSquare}
        />
        <AdminStat
          label="Ainda não responderam"
          value={m.unknown}
          detail="Satisfação desconhecida, mesmo que estejam ativos"
          icon={Users}
        />
      </div>
      <div className="grid gap-5 xl:grid-cols-[.9fr_1.1fr]">
        <section className="surface p-5">
          <h2 className="font-display text-lg font-semibold">Registrar feedback recebido</h2>
          <p className="mt-2 text-xs text-muted-foreground">
            Registre a resposta do usuário. Não atribua notas com base em frequência de acesso.
          </p>
          <form
            className="mt-5 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              const entry = {
                id: adminId(),
                userId: user,
                rating,
                category,
                comment: comment.trim(),
                at: new Date().toISOString(),
              };
              if (
                commit(
                  { ...data, feedback: [entry, ...data.feedback] },
                  "Feedback registrado",
                  `${data.users.find((u) => u.id === user)?.name}: ${rating}/5 · ${category}`,
                )
              )
                setComment("");
            }}
          >
            <div>
              <label className="label" htmlFor="admin-feedback-user">
                Usuário
              </label>
              <select
                id="admin-feedback-user"
                className="admin-select w-full"
                value={user}
                onChange={(e) => setUser(e.target.value)}
              >
                {data.users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="admin-feedback-rating">
                  Nota informada (1 a 5)
                </label>
                <select
                  id="admin-feedback-rating"
                  className="admin-select w-full"
                  value={rating}
                  onChange={(e) => setRating(Number(e.target.value))}
                >
                  {[1, 2, 3, 4, 5].map((v) => (
                    <option key={v} value={v}>
                      {v} / 5
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="admin-feedback-category">
                  Tema
                </label>
                <select
                  id="admin-feedback-category"
                  className="admin-select w-full"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as typeof category)}
                >
                  {feedbackCategories.map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="label" htmlFor="admin-feedback-comment">
                Comentário recebido
              </label>
              <Textarea
                id="admin-feedback-comment"
                required
                maxLength={2000}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Use somente informações fictícias nesta demonstração."
              />
            </div>
            <Button disabled={!comment.trim() || !user}>Salvar feedback</Button>
          </form>
        </section>
        <section className="surface p-5">
          <div className="flex flex-wrap justify-between gap-3">
            <h2 className="font-display text-lg font-semibold">Voz dos usuários</h2>
            <select
              aria-label="Filtrar feedbacks"
              className="admin-select"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              {["Todos", "Positivo", "Neutro", "Negativo"].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </div>
          <div className="mt-4 max-h-[520px] space-y-3 overflow-y-auto overscroll-contain">
            {filtered.map((f) => (
              <article key={f.id} className="rounded-xl border border-border p-4">
                <div className="flex flex-wrap justify-between gap-2">
                  <p className="text-sm font-semibold">
                    {data.users.find((u) => u.id === f.userId)?.name}
                  </p>
                  <AdminBadge tone={f.rating <= 2 ? "bad" : f.rating === 3 ? "muted" : "default"}>
                    {f.rating} / 5
                  </AdminBadge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {f.category} · {adminDay(f.at)}
                  {latestFeedback(data, f.userId)?.id === f.id
                    ? " · última resposta"
                    : " · histórico"}
                </p>
                <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed">
                  {f.comment}
                </p>
              </article>
            ))}
            {!filtered.length && (
              <p className="text-sm text-muted-foreground">Nenhuma resposta nesta seleção.</p>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
export function AdminIntelligence({
  data,
  onUser,
}: {
  data: AdminWorkspace;
  onUser: (id: string) => void;
}) {
  const [status, setStatus] = useState<Awaited<ReturnType<typeof getAiStatus>> | null>(null),
    [result, setResult] = useState<Awaited<ReturnType<typeof summarizeAdmin>> | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [consent, setConsent] = useState(false);
  const fingerprint = JSON.stringify(data),
    current = useRef(fingerprint),
    snapshot = adminSnapshot(data);
  useEffect(() => {
    current.current = fingerprint;
    setResult(null);
    setConsent(false);
    setError("");
    return () => {
      current.current = "";
    };
  }, [fingerprint]);
  useEffect(() => {
    let live = true;
    void getAiStatus()
      .then((s) => {
        if (live) setStatus(s);
      })
      .catch(() => {
        if (live) setError("Não foi possível verificar a disponibilidade da IA.");
      });
    return () => {
      live = false;
    };
  }, []);
  async function generate() {
    if (!consent || busy) return;
    setBusy(true);
    setError("");
    const key = fingerprint;
    try {
      const output = await summarizeAdmin({ data: { workspace: data, confirmed: true } });
      if (current.current === key) setResult(output);
    } catch (e) {
      if (current.current === key)
        setError(e instanceof Error ? e.message : "Não foi possível gerar o resumo.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <section className="surface border-brand/20 p-6">
        <div className="flex flex-wrap justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-brand-deep">
              <Sparkles className="size-5" /> Sua operação, explicada
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              IA para organizar evidências de participação, satisfação e relacionamento.
            </p>
          </div>
          <AdminBadge>Assistente administrativo</AdminBadge>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {[
            [
              "Participação",
              `${snapshot.metrics.engaged} em uso · ${snapshot.metrics.attention} em atenção · ${snapshot.metrics.inactive} sem uso recente`,
            ],
            [
              "Satisfação",
              `${snapshot.metrics.positive} positivos · ${snapshot.metrics.negative} negativos · ${snapshot.metrics.unknown} sem resposta`,
            ],
            [
              "Relacionamento",
              `${snapshot.metrics.pendingTasks} contatos planejados · ${snapshot.metrics.overdue} pagamentos pendentes simulados`,
            ],
          ].map(([label, text]) => (
            <div key={label} className="rounded-xl bg-brand-soft/50 p-4">
              <p className="text-xs font-semibold text-brand-deep">{label}</p>
              <p className="mt-2 text-sm">{text}</p>
            </div>
          ))}
        </div>
        <details className="mt-5 text-xs">
          <summary className="cursor-pointer text-brand-deep">Conferir dados enviados à IA</summary>
          <pre className="mt-3 max-h-64 overflow-auto rounded-xl bg-muted/40 p-4">
            {JSON.stringify(snapshot, null, 2)}
          </pre>
        </details>
        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
          Só são enviados contagens, referências U1/U2, perfil, dias sem acesso, última nota, tema
          do feedback e situações de planos/contatos. Nomes, e-mails, comentários livres e
          prontuários não são enviados ao Gemini.
        </p>
        <label className="mt-4 flex items-start gap-2 text-xs leading-relaxed">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={consent}
            disabled={busy}
            onChange={(e) => setConsent(e.target.checked)}
          />
          Autorizo enviar esse resumo de dados fictícios ao Gemini para gerar uma análise
          administrativa.
        </label>
        <Button
          className="mt-4"
          disabled={!consent || busy || !status?.available}
          onClick={() => void generate()}
        >
          <Sparkles className="size-4" />
          {busy ? "Preparando análise…" : "Gerar resumo com IA"}
        </Button>
        {status && !status.available && (
          <p className="mt-3 text-xs text-muted-foreground">
            {status.message} Os indicadores acima continuam disponíveis.
          </p>
        )}
        {error && (
          <p role="alert" className="mt-4 text-sm text-destructive">
            {error}
          </p>
        )}
      </section>
      {result && (
        <section className="surface p-6">
          <p className="text-xs text-muted-foreground">
            Gerado por IA · {result.model} ·{" "}
            {new Date(result.generatedAt).toLocaleTimeString("pt-BR", {
              timeZone: "America/Sao_Paulo",
            })}{" "}
            · confira antes de decidir
          </p>
          <h2 className="mt-4 font-display text-xl font-semibold">Resumo da operação</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">
            {result.summary.summary}
          </p>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            {[
              ["Pontos positivos", result.summary.strengths],
              ["Pontos de atenção", result.summary.concerns],
            ].map(([label, items]) => (
              <div key={String(label)} className="rounded-xl bg-muted/30 p-4">
                <h3 className="text-sm font-semibold">{String(label)}</h3>
                <ul className="mt-3 list-disc space-y-2 pl-4 text-sm">
                  {(items as string[]).map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <h3 className="mt-6 font-semibold">Próximas conversas sugeridas</h3>
          <div className="mt-4 space-y-3">
            {result.summary.recommendations.map((item, index) => {
              const user = data.users[Number(item.reference.slice(1)) - 1];
              return (
                <article key={index} className="rounded-xl border border-border p-4">
                  <button
                    className="text-sm font-semibold text-brand-deep"
                    onClick={() => user && onUser(user.id)}
                  >
                    {user?.name ?? item.reference} <ArrowRight className="inline size-3" />
                  </button>
                  <p className="mt-2 text-sm">{item.reason}</p>
                  <p className="mt-2 text-sm text-muted-foreground">Sugestão: {item.action}</p>
                </article>
              );
            })}
          </div>
          <div className="mt-5 rounded-xl bg-amber-50 p-4 text-xs leading-relaxed text-amber-900">
            {result.summary.limitations.map((item, index) => (
              <p key={index} className="mt-1">
                {item}
              </p>
            ))}
            <p className="mt-2">
              A IA não envia mensagens, bloqueia contas ou altera planos. Aprovação e execução
              permanecem com você.
            </p>
          </div>
        </section>
      )}
    </>
  );
}
