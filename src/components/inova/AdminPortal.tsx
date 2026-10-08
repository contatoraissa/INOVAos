import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import {
  ShieldCheck,
  Users,
  UserCheck,
  UserX,
  Clock,
  LayoutDashboard,
  MessageSquare,
  Menu,
} from "lucide-react";
import { toast } from "sonner";
import {
  adminDefaults,
  adminSchema,
  adminMetrics,
  isInactive,
  type AdminDemo,
} from "@/lib/admin-demo";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

const storageKey = "inova-demo-admin-v1";
const tabs = ["Visão geral", "Usuários", "Contatos e reativação", "Feedbacks"] as const;
export function AdminPortal() {
  const [data, setData] = useState<AdminDemo>(adminDefaults);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<(typeof tabs)[number]>("Visão geral");
  const [mobile, setMobile] = useState(false);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("Todos");
  const [status, setStatus] = useState("Todos");
  const [target, setTarget] = useState<string | null>(null);
  const [userId, setUserId] = useState(adminDefaults.users[0]?.id ?? "");
  const [kind, setKind] = useState<AdminDemo["contacts"][number]["kind"]>("Retorno de contato");
  const [note, setNote] = useState("");
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setData(adminSchema.parse(JSON.parse(raw)));
    } catch {
      setError("Não foi possível recuperar os dados administrativos deste navegador.");
    }
    setReady(true);
  }, []);
  function commit(next: AdminDemo) {
    try {
      const parsed = adminSchema.parse(next);
      localStorage.setItem(storageKey, JSON.stringify(parsed));
      setData(parsed);
      setError("");
      toast.success("Registro demonstrativo salvo neste navegador.");
      return true;
    } catch {
      setError("Não foi possível salvar. Nenhuma alteração foi aplicada.");
      return false;
    }
  }
  const counts = adminMetrics(data.users);
  const filtered = data.users.filter(
    (u) =>
      (role === "Todos" || u.role === role) &&
      (status === "Todos" ||
        (status === "Sem uso recente" ? isInactive(u) : u.status === status)) &&
      `${u.name} ${u.email}`.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR")),
  );
  const metrics = [
    ["Usuários cadastrados", counts.total, Users],
    ["Contas ativas", counts.active, UserCheck],
    ["Contas desativadas", counts.disabled, UserX],
    ["Sem uso há mais de 30 dias", counts.inactive, Clock],
  ] as const;
  const months = new Map<string, number>();
  for (const u of data.users) {
    const month = u.createdAt.slice(0, 7);
    months.set(month, (months.get(month) ?? 0) + 1);
  }
  const chart = [...months]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, total]) => ({ month, total }));
  const statusChart = [
    { name: "Ativas", total: counts.active },
    { name: "Desativadas", total: counts.disabled },
  ];
  const selected = data.users.find((u) => u.id === target);
  function startContact(id: string, feedback = false) {
    setUserId(id);
    setKind(feedback ? "Pedido de feedback" : "Retorno de contato");
    setTab(feedback ? "Feedbacks" : "Contatos e reativação");
    setNote("");
  }
  function register(e: React.FormEvent) {
    e.preventDefault();
    if (!note.trim() || !data.users.some((u) => u.id === userId)) return;
    const entry = {
      id:
        globalThis.crypto?.randomUUID?.() ??
        `demo-contact-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      userId,
      kind,
      note: note.trim(),
      at: new Date().toISOString(),
    };
    if (commit({ ...data, contacts: [entry, ...data.contacts] })) setNote("");
  }
  const log = data.contacts.filter((c) =>
    tab === "Feedbacks" ? c.kind !== "Retorno de contato" : c.kind === "Retorno de contato",
  );
  function navigateTab(next: (typeof tabs)[number]) {
    setTab(next);
    if (next === "Feedbacks" && kind === "Retorno de contato") setKind("Pedido de feedback");
    if (next === "Contatos e reativação") setKind("Retorno de contato");
  }
  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col border-r border-border bg-white lg:flex">
        <div className="flex h-20 items-center border-b border-border px-6">
          <Logo />
        </div>
        <p className="px-6 pt-6 text-[10px] tracking-widest text-muted-foreground">
          ADMINISTRAÇÃO INOVA
        </p>
        <nav className="space-y-2 p-3">
          {tabs.map((name, index) => {
            const Icon = [LayoutDashboard, Users, Clock, MessageSquare][index] ?? Users;
            return (
              <button
                key={name}
                onClick={() => navigateTab(name)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm ${tab === name ? "bg-brand-soft font-semibold text-brand-deep" : "text-muted-foreground hover:bg-muted"}`}
              >
                <Icon className="size-4" />
                {name}
              </button>
            );
          })}
        </nav>
        <div className="mt-auto border-t border-border p-5">
          <p className="text-sm font-medium">Administrador demonstrativo</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Dados fictícios · sem acesso a contas reais
          </p>
          <Link to="/" className="mt-4 block text-sm text-brand-deep">
            Voltar ao acesso →
          </Link>
        </div>
      </aside>
      <div className="lg:pl-[248px]">
        <header className="flex h-16 items-center justify-between gap-3 border-b border-border bg-white px-5 md:px-8">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              aria-label="Abrir menu administrativo"
              onClick={() => setMobile(!mobile)}
            >
              <Menu />
            </Button>
            <ShieldCheck className="size-5 text-brand" />
            <span className="text-sm font-medium">Gestão do INOVA</span>
          </div>
          <span className="rounded-full bg-brand-soft px-3 py-1 text-xs text-brand-deep">
            Demonstração
          </span>
        </header>
        {mobile && (
          <nav className="border-b border-border bg-white p-3 lg:hidden">
            {tabs.map((name) => (
              <button
                key={name}
                className="block w-full rounded-lg p-3 text-left text-sm"
                onClick={() => {
                  navigateTab(name);
                  setMobile(false);
                }}
              >
                {name}
              </button>
            ))}
          </nav>
        )}
        <main className="mx-auto max-w-[1400px] space-y-6 p-5 md:p-8">
          <div>
            <p className="eyebrow">INOVA · ADMINISTRAÇÃO</p>
            <h1 className="mt-3 font-display text-3xl font-semibold">{tab}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Gestão de usuários e relacionamento da plataforma.
            </p>
          </div>
          <div className="surface p-4 text-xs leading-relaxed text-muted-foreground">
            Portal administrativo de demonstração. Usuários, acessos e cadastros são fictícios; as
            ações ficam neste navegador e não alteram contas médicas ou de pacientes. Não há envio
            de e-mail, WhatsApp ou chamadas. Referência dos acessos simulados: 08/10/2026.
          </div>
          {error && (
            <p role="alert" className="surface p-4 text-sm text-destructive">
              {error}
            </p>
          )}
          {tab === "Visão geral" && (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {metrics.map(([label, value, Icon]) => (
                  <article key={label} className="surface p-5">
                    <Icon className="size-5 text-brand" />
                    <p className="mt-5 font-display text-3xl font-semibold">{value}</p>
                    <p className="mt-2 text-sm text-muted-foreground">{label}</p>
                  </article>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                “Sem uso recente” é um subconjunto das contas ativas; desativação é um status
                separado.
              </p>
              <div className="grid gap-5 lg:grid-cols-2">
                {[
                  ["Cadastros por mês", chart, "month"],
                  ["Situação das contas", statusChart, "name"],
                ].map(([title, points, x]) => (
                  <section key={String(title)} className="surface p-5">
                    <h2 className="text-lg font-semibold">{String(title)}</h2>
                    <div className="mt-5 h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={points as typeof chart}>
                          <CartesianGrid vertical={false} strokeDasharray="3 3" />
                          <XAxis dataKey={String(x)} />
                          <YAxis allowDecimals={false} />
                          <Tooltip />
                          <Bar dataKey="total" name="Usuários" fill="#08a6bf" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </section>
                ))}
              </div>
              <section className="surface p-5">
                <h2 className="text-lg font-semibold">Relacionamento</h2>
                <p className="mt-3 text-sm text-muted-foreground">
                  {data.contacts.filter((c) => c.kind === "Retorno de contato").length} contatos
                  registrados ·{" "}
                  {data.contacts.filter((c) => c.kind === "Pedido de feedback").length} pedidos de
                  feedback registrados ·{" "}
                  {data.contacts.filter((c) => c.kind === "Feedback recebido").length} feedbacks
                  recebidos
                </p>
                <Button
                  className="mt-4"
                  variant="outline"
                  onClick={() => {
                    setTab("Usuários");
                    setStatus("Sem uso recente");
                  }}
                >
                  Ver usuários sem uso recente
                </Button>
              </section>
            </>
          )}
          {tab === "Usuários" && (
            <>
              <div className="surface grid gap-3 p-4 md:grid-cols-[1fr_180px_200px]">
                <Input
                  aria-label="Pesquisar usuários administrativos"
                  placeholder="Buscar nome ou e-mail…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <select
                  aria-label="Filtrar tipo de usuário"
                  className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  {["Todos", "Médico", "Paciente"].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
                <select
                  aria-label="Filtrar status administrativo"
                  className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  {["Todos", "Ativo", "Desativado", "Sem uso recente"].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-muted-foreground">
                {filtered.length} usuário(s) na seleção
              </p>
              <div className="space-y-3">
                {filtered.map((u) => (
                  <article
                    className="surface flex flex-wrap items-center justify-between gap-4 p-5"
                    key={u.id}
                  >
                    <div>
                      <h2 className="font-semibold">{u.name}</h2>
                      <p className="mt-1 break-all text-xs text-muted-foreground">
                        {u.role} · {u.email}
                      </p>
                      <p className="mt-2 text-xs">
                        {u.status}
                        {isInactive(u) ? " · Sem uso recente" : ""} · Último acesso:{" "}
                        {new Date(u.lastAccess).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!ready}
                        onClick={() => startContact(u.id)}
                      >
                        Registrar contato
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!ready}
                        onClick={() => startContact(u.id, true)}
                      >
                        Pedir feedback
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!ready}
                        onClick={() => setTarget(u.id)}
                      >
                        {u.status === "Ativo" ? "Desativar" : "Reativar"}
                      </Button>
                    </div>
                  </article>
                ))}
                {!filtered.length && (
                  <p className="surface p-6 text-sm text-muted-foreground">
                    Nenhum usuário corresponde aos filtros.
                  </p>
                )}
              </div>
            </>
          )}
          {(tab === "Contatos e reativação" || tab === "Feedbacks") && (
            <>
              <form onSubmit={register} className="surface space-y-4 p-5">
                <h2 className="text-lg font-semibold">
                  {tab === "Feedbacks"
                    ? "Registrar solicitação ou retorno de feedback"
                    : "Registrar retorno de contato"}
                </h2>
                <fieldset disabled={!ready} className="space-y-4">
                  <label className="block text-xs font-medium" htmlFor="admin-contact-user">
                    Usuário
                    <select
                      id="admin-contact-user"
                      value={userId}
                      onChange={(e) => setUserId(e.target.value)}
                      className="mt-2 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                    >
                      {data.users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} · {u.role}
                        </option>
                      ))}
                    </select>
                  </label>
                  {tab === "Feedbacks" && (
                    <label className="block text-xs font-medium" htmlFor="admin-contact-kind">
                      Tipo de registro
                      <select
                        id="admin-contact-kind"
                        value={kind}
                        onChange={(e) => setKind(e.target.value as typeof kind)}
                        className="mt-2 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                      >
                        <option>Pedido de feedback</option>
                        <option>Feedback recebido</option>
                      </select>
                    </label>
                  )}
                  <label className="block text-xs font-medium" htmlFor="admin-contact-note">
                    Anotação
                    <Textarea
                      id="admin-contact-note"
                      className="mt-2"
                      required
                      maxLength={2000}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Registre o motivo, a tentativa de contato ou o feedback fictício…"
                    />
                  </label>
                  <Button type="submit" disabled={!note.trim()}>
                    Salvar registro
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Este registro não envia mensagens e não reativa a conta automaticamente.
                  </p>
                </fieldset>
              </form>
              <section className="surface space-y-4 p-5">
                <h2 className="text-lg font-semibold">Histórico de registros</h2>
                {log.map((c) => (
                  <article className="rounded-xl border border-border p-4" key={c.id}>
                    <p className="text-sm font-semibold">
                      {data.users.find((u) => u.id === c.userId)?.name} · {c.kind}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap break-words text-sm">{c.note}</p>
                    <p className="mt-3 text-xs text-muted-foreground">
                      {new Date(c.at).toLocaleString("pt-BR")}
                    </p>
                  </article>
                ))}
                {!log.length && (
                  <p className="text-sm text-muted-foreground">Nenhum registro ainda.</p>
                )}
              </section>
            </>
          )}
        </main>
      </div>
      <Dialog
        open={!!target}
        onOpenChange={(open) => {
          if (!open) setTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selected?.status === "Ativo" ? "Desativar" : "Reativar"} usuário demonstrativo?
            </DialogTitle>
            <DialogDescription>
              {selected?.name}. A mudança afeta apenas a lista administrativa fictícia deste
              navegador.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTarget(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (
                  selected &&
                  commit({
                    ...data,
                    users: data.users.map((u) =>
                      u.id === selected.id
                        ? { ...u, status: u.status === "Ativo" ? "Desativado" : "Ativo" }
                        : u,
                    ),
                  })
                )
                  setTarget(null);
              }}
            >
              Confirmar alteração
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
