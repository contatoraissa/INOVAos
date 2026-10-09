import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  Activity,
  CreditCard,
  MessageSquare,
  Phone,
  Sparkles,
  ShieldCheck,
  Menu,
  Search,
  Download,
  ArrowRight,
  History,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  adminStorageKey,
  workspaceSchema,
  workspaceDefaults,
  migrateAdmin,
  adminId,
  adminDate,
  daysAway,
  usage,
  satisfaction,
  latestFeedback,
  safeCsvCell,
  adminDay,
  type AdminWorkspace,
} from "@/lib/admin-workspace";
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
import {
  AdminOverview,
  AdminActivity,
  AdminSubscriptions,
  AdminRelationships,
  AdminFeedback,
  AdminIntelligence,
  AdminBadge,
} from "./AdminWorkspacePanels";
const navigation = [
  { name: "Visão geral", icon: LayoutDashboard, group: "OPERAÇÃO" },
  { name: "Usuários", icon: Users, group: "OPERAÇÃO" },
  { name: "Atividade", icon: Activity, group: "OPERAÇÃO" },
  { name: "Assinaturas", icon: CreditCard, group: "NEGÓCIO" },
  { name: "Contatos e reativação", icon: Phone, group: "RELACIONAMENTO" },
  { name: "Feedbacks", icon: MessageSquare, group: "RELACIONAMENTO" },
  { name: "Resumo com IA", icon: Sparkles, group: "INTELIGÊNCIA" },
] as const;
type Tab = (typeof navigation)[number]["name"];
const help: Record<Tab, string> = {
  "Visão geral": "Um panorama da participação, do negócio e das próximas conversas.",
  Usuários: "Conheça sua base, confira vínculos e acompanhe cada conta.",
  Atividade: "Entenda a frequência de uso e as funcionalidades exploradas.",
  Assinaturas: "Planos, testes e situações de pagamento em um só lugar.",
  "Contatos e reativação": "Planeje contatos e registre o acompanhamento dos usuários.",
  Feedbacks: "Escute os usuários e encontre oportunidades para melhorar.",
  "Resumo com IA": "Transforme os indicadores disponíveis em próximos passos para investigar.",
};
export function AdminWorkspacePortal() {
  const [data, setData] = useState<AdminWorkspace>(workspaceDefaults),
    [ready, setReady] = useState(false),
    [error, setError] = useState(""),
    [tab, setTab] = useState<Tab>("Visão geral"),
    [mobile, setMobile] = useState(false);
  const [query, setQuery] = useState(""),
    [role, setRole] = useState("Todos"),
    [status, setStatus] = useState("Todos"),
    [sentiment, setSentiment] = useState("Todos"),
    [detailId, setDetailId] = useState<string | null>(null),
    [target, setTarget] = useState<string | null>(null),
    [reason, setReason] = useState(""),
    [contactUser, setContactUser] = useState(""),
    [showAudit, setShowAudit] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(adminStorageKey);
      if (raw) setData(workspaceSchema.parse(JSON.parse(raw)));
      else {
        const old = localStorage.getItem("inova-demo-admin-v1");
        if (old) setData(migrateAdmin(JSON.parse(old)));
      }
    } catch {
      setError(
        "Não foi possível recuperar o cenário salvo. Exibindo a base fictícia; salve apenas se desejar substituir o cenário inválido.",
      );
    }
    setReady(true);
  }, []);
  function commit(next: AdminWorkspace, action: string, detail: string) {
    if (!ready) return false;
    try {
      const parsed = workspaceSchema.parse({
        ...next,
        audit: [
          { id: adminId(), at: new Date().toISOString(), action, detail },
          ...next.audit,
        ].slice(0, 1000),
      });
      localStorage.setItem(adminStorageKey, JSON.stringify(parsed));
      setData(parsed);
      setError("");
      toast.success("Alteração demonstrativa salva neste navegador.");
      return true;
    } catch {
      setError(
        "Não foi possível salvar. Nenhuma alteração foi aplicada; confira o armazenamento ou os campos informados.",
      );
      return false;
    }
  }
  function navigate(name: string) {
    if (!navigation.some((n) => n.name === name)) return;
    setTab(name as Tab);
    setMobile(false);
  }
  const filtered = data.users.filter(
    (user) =>
      (role === "Todos" || user.role === role) &&
      (status === "Todos" || user.status === status || usage(user) === status) &&
      (sentiment === "Todos" || satisfaction(data, user.id) === sentiment) &&
      `${user.name} ${user.email}`
        .toLocaleLowerCase("pt-BR")
        .includes(query.toLocaleLowerCase("pt-BR")),
  );
  const detail = data.users.find((u) => u.id === detailId),
    selected = data.users.find((u) => u.id === target);
  function startContact(id: string, feedback = false) {
    setContactUser(id);
    setDetailId(null);
    navigate(feedback ? "Feedbacks" : "Contatos e reativação");
  }
  function exportUsers() {
    const rows = [
      ["Nome", "E-mail", "Perfil", "Conta", "Participação", "Dias sem acesso", "Satisfação"],
      ...filtered.map((u) => [
        u.name,
        u.email,
        u.role,
        u.status,
        usage(u),
        daysAway(u),
        satisfaction(data, u.id),
      ]),
    ];
    const blob = new Blob(
      ["\ufeff" + rows.map((row) => row.map(safeCsvCell).join(";")).join("\r\n")],
      { type: "text/csv;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = `INOVA_usuarios_demonstracao_${adminDate}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const nav = (compact = false) => (
    <nav
      className={compact ? "grid grid-cols-2 gap-1 p-3" : "space-y-1 p-3"}
      aria-label="Navegação administrativa"
    >
      {navigation.map((item, index) => {
        const Icon = item.icon;
        return (
          <div key={item.name}>
            {!compact && navigation[index - 1]?.group !== item.group && (
              <p className="px-3 pb-2 pt-5 text-[9px] tracking-[.15em] text-muted-foreground">
                {item.group}
              </p>
            )}
            <button
              aria-current={tab === item.name ? "page" : undefined}
              onClick={() => navigate(item.name)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] transition-colors ${tab === item.name ? "bg-brand-soft font-semibold text-brand-deep" : "text-muted-foreground hover:bg-muted/50"}`}
            >
              <Icon className="size-4 shrink-0" />
              {item.name}
            </button>
          </div>
        );
      })}
    </nav>
  );
  return (
    <div className="admin-workspace min-h-screen bg-background">
      <style>{`.admin-workspace .admin-select{height:38px;max-width:100%;border:1px solid hsl(var(--input));border-radius:10px;background:white;padding:0 10px;font-size:12px;color:inherit}.admin-workspace .admin-table{width:100%;min-width:780px;text-align:left;font-size:12px;border-collapse:collapse}.admin-workspace .admin-table th{background:#f7fafb;font-size:10px;letter-spacing:.04em;font-weight:500;color:#688397;padding:16px}.admin-workspace .admin-table td{padding:16px;border-top:1px solid #e2ebf0}.admin-workspace .admin-table tbody tr:hover{background:#f8fbfc}`}</style>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[232px] flex-col border-r border-border bg-white lg:flex">
        <div className="flex h-[76px] items-center border-b border-border px-6">
          <Link
            to="/"
            aria-label="INOVA — voltar à página inicial"
            className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-4"
          >
            <Logo />
          </Link>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{nav()}</div>
        <div className="m-3 rounded-2xl bg-brand-soft/50 p-4">
          <p className="flex items-center gap-2 text-xs font-semibold">
            <ShieldCheck className="size-4 text-brand" /> Administração INOVA
          </p>
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
            Cenário fictício · separado do atendimento clínico
          </p>
        </div>
        <Link to="/" className="border-t border-border px-6 py-4 text-xs text-muted-foreground">
          Voltar ao acesso <ArrowRight className="ml-2 inline size-3" />
        </Link>
      </aside>
      <div className="min-w-0 lg:pl-[232px]">
        <header className="flex min-h-[76px] items-center justify-between gap-4 border-b border-border bg-white px-4 sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              aria-label={mobile ? "Fechar menu administrativo" : "Abrir menu administrativo"}
              onClick={() => setMobile(!mobile)}
            >
              {mobile ? <X /> : <Menu />}
            </Button>
            <div className="relative hidden w-80 md:block">
              <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <Input
                className="h-9 bg-muted/20 pl-9 text-xs"
                aria-label="Busca geral administrativa"
                placeholder="Encontrar usuário…"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  navigate("Usuários");
                }}
              />
            </div>
            <span className="text-sm md:hidden">Gestão INOVA</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAudit(true)}
              aria-label="Abrir histórico de alterações"
              className="rounded-xl border border-border p-2 text-muted-foreground hover:bg-muted"
            >
              <History className="size-4" />
            </button>
            <div className="hidden border-l border-border pl-3 sm:block">
              <p className="text-xs font-semibold">Administrador INOVA</p>
              <p className="mt-1 text-[10px] text-muted-foreground">Gestão da plataforma</p>
            </div>
          </div>
        </header>
        {mobile && <div className="border-b border-border bg-white lg:hidden">{nav(true)}</div>}
        <main className="mx-auto max-w-[1500px] space-y-5 p-4 sm:p-7 xl:p-9">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="eyebrow">INOVA · CENTRO DE GESTÃO</p>
              <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight">{tab}</h1>
              <p className="mt-2 text-sm text-muted-foreground">{help[tab]}</p>
            </div>
            <AdminBadge>Dados fictícios · referência 08/10/2026</AdminBadge>
          </div>
          <div className="flex items-start gap-3 rounded-xl border border-brand/15 bg-brand-soft/30 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand" />
            <p>
              Portal de demonstração. Ações administrativas ficam neste navegador e não alteram
              contas reais, cobranças ou prontuários. Acessos fictícios usam a referência de
              08/10/2026. Não há envio automático de mensagens.
            </p>
          </div>
          {error && (
            <p role="alert" className="surface p-4 text-sm text-destructive">
              {error}
            </p>
          )}
          {!ready ? (
            <section className="surface p-6 text-sm text-muted-foreground">
              Carregando cenário administrativo…
            </section>
          ) : (
            <>
              {tab === "Visão geral" && <AdminOverview data={data} onTab={navigate} />}
              {tab === "Usuários" && (
                <>
                  <div className="surface space-y-4 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="relative w-full sm:max-w-md">
                        <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
                        <Input
                          className="pl-9"
                          aria-label="Pesquisar usuários administrativos"
                          placeholder="Buscar nome ou e-mail…"
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                        />
                      </div>
                      <Button variant="outline" size="sm" onClick={exportUsers}>
                        <Download className="size-4" /> Exportar seleção
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <select
                        aria-label="Filtrar tipo de usuário"
                        className="admin-select"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                      >
                        {["Todos", "Médico", "Paciente"].map((v) => (
                          <option key={v}>{v}</option>
                        ))}
                      </select>
                      <select
                        aria-label="Filtrar status administrativo"
                        className="admin-select"
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                      >
                        {[
                          "Todos",
                          "Ativo",
                          "Desativado",
                          "Em uso",
                          "Atenção",
                          "Sem uso recente",
                        ].map((v) => (
                          <option key={v}>{v}</option>
                        ))}
                      </select>
                      <select
                        aria-label="Filtrar satisfação"
                        className="admin-select"
                        value={sentiment}
                        onChange={(e) => setSentiment(e.target.value)}
                      >
                        {["Todos", "Positivo", "Neutro", "Negativo", "Sem feedback"].map((v) => (
                          <option key={v}>{v}</option>
                        ))}
                      </select>
                      <p className="self-center text-xs text-muted-foreground">
                        {filtered.length} usuário(s) na seleção
                      </p>
                    </div>
                  </div>
                  <section className="surface overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>Usuário</th>
                            <th>Conta</th>
                            <th>Participação</th>
                            <th>Último acesso</th>
                            <th>Satisfação</th>
                            <th>Acompanhamento</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filtered.map((user) => (
                            <tr key={user.id} data-admin-user={user.id}>
                              <td>
                                <button
                                  className="text-left font-semibold hover:text-brand-deep"
                                  onClick={() => setDetailId(user.id)}
                                >
                                  {user.name}
                                </button>
                                <p className="mt-1 text-[11px] text-muted-foreground">
                                  {user.role} · {user.email}
                                </p>
                              </td>
                              <td>
                                <AdminBadge
                                  tone={user.status === "Desativado" ? "muted" : "default"}
                                >
                                  {user.status}
                                </AdminBadge>
                              </td>
                              <td>
                                <AdminBadge
                                  tone={
                                    usage(user) === "Sem uso recente"
                                      ? "warn"
                                      : usage(user) === "Desativado"
                                        ? "muted"
                                        : "default"
                                  }
                                >
                                  {usage(user)}
                                </AdminBadge>
                              </td>
                              <td>
                                {adminDay(user.lastAccess)}
                                <p className="mt-1 text-[10px] text-muted-foreground">
                                  {daysAway(user)} dias na referência
                                </p>
                              </td>
                              <td>
                                <AdminBadge
                                  tone={
                                    satisfaction(data, user.id) === "Negativo"
                                      ? "bad"
                                      : satisfaction(data, user.id) === "Sem feedback"
                                        ? "muted"
                                        : "default"
                                  }
                                >
                                  {satisfaction(data, user.id)}
                                </AdminBadge>
                              </td>
                              <td>
                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => startContact(user.id)}
                                  >
                                    Registrar contato
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setTarget(user.id);
                                      setReason("");
                                    }}
                                  >
                                    {user.status === "Ativo" ? "Desativar" : "Reativar"}
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {!filtered.length && (
                      <p className="p-8 text-sm text-muted-foreground">
                        Nenhum usuário nesta seleção.
                      </p>
                    )}
                  </section>
                  <p className="text-xs text-muted-foreground">
                    Em uso: até 7 dias · Atenção: 8 a 30 dias · Sem uso recente: mais de 30 dias. A
                    satisfação considera a última nota recebida; sem resposta, ela é desconhecida.
                  </p>
                </>
              )}
              {tab === "Atividade" && <AdminActivity data={data} />}
              {tab === "Assinaturas" && <AdminSubscriptions data={data} commit={commit} />}
              {tab === "Contatos e reativação" && (
                <AdminRelationships
                  key={contactUser}
                  data={data}
                  commit={commit}
                  initialUser={contactUser}
                />
              )}
              {tab === "Feedbacks" && (
                <AdminFeedback
                  key={contactUser}
                  data={data}
                  commit={commit}
                  initialUser={contactUser}
                />
              )}
              {tab === "Resumo com IA" && <AdminIntelligence data={data} onUser={setDetailId} />}
            </>
          )}
          <footer className="border-t border-border py-4 text-[11px] text-muted-foreground">
            INOVA · Gestão em perspectiva. Este cenário não representa usuários, receita ou
            feedbacks reais.
          </footer>
        </main>
      </div>
      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selected?.status === "Ativo" ? "Desativar" : "Reativar"} conta demonstrativa
            </DialogTitle>
            <DialogDescription>
              Você está alterando apenas o cenário administrativo de {selected?.name}. A conta
              clínica real e o plano não serão alterados.
            </DialogDescription>
          </DialogHeader>
          <label className="label" htmlFor="admin-status-reason">
            Motivo da alteração
          </label>
          <Textarea
            id="admin-status-reason"
            value={reason}
            maxLength={1000}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Registre o motivo para manter o histórico."
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setTarget(null)}>
              Cancelar
            </Button>
            <Button
              disabled={reason.trim().length < 3}
              onClick={() => {
                if (!selected) return;
                const nextStatus = selected.status === "Ativo" ? "Desativado" : "Ativo";
                if (
                  commit(
                    {
                      ...data,
                      users: data.users.map((u) =>
                        u.id === selected.id ? { ...u, status: nextStatus } : u,
                      ),
                    },
                    "Status da conta alterado",
                    `${selected.name}: ${selected.status} → ${nextStatus}. Motivo: ${reason.trim()}`,
                  )
                )
                  setTarget(null);
              }}
            >
              Confirmar alteração
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!detail}
        onOpenChange={(open) => {
          if (!open) setDetailId(null);
        }}
      >
        <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{detail?.name}</DialogTitle>
            <DialogDescription>
              Resumo administrativo fictício. Conteúdo clínico e prontuários não são acessados.
            </DialogDescription>
          </DialogHeader>
          {detail && (
            <>
              <div className="flex flex-wrap gap-2">
                <AdminBadge>{detail.role}</AdminBadge>
                <AdminBadge>{detail.status}</AdminBadge>
                <AdminBadge tone={usage(detail) === "Sem uso recente" ? "warn" : "default"}>
                  {usage(detail)}
                </AdminBadge>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl bg-muted/30 p-3">
                  Cadastro<p className="mt-2 font-semibold">{adminDay(detail.createdAt)}</p>
                </div>
                <div className="rounded-xl bg-muted/30 p-3">
                  Último acesso<p className="mt-2 font-semibold">{adminDay(detail.lastAccess)}</p>
                </div>
              </div>
              <p className="break-all text-xs text-muted-foreground">{detail.email}</p>
              <div className="rounded-xl border border-border p-4">
                <p className="text-sm font-semibold">Vínculos demonstrativos</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {detail.role === "Médico"
                    ? detail.id === "doctor-0"
                      ? `${data.users.filter((u) => u.role === "Paciente").length} pacientes da carteira fictícia de Rafael`
                      : "Nenhum vínculo clínico informado no cenário."
                    : "Médico de referência do cenário: Dr. Rafael Mendes."}
                </p>
                <p className="mt-3 text-xs">
                  Última satisfação: {satisfaction(data, detail.id)}
                  {latestFeedback(data, detail.id)
                    ? ` · ${latestFeedback(data, detail.id)!.rating}/5`
                    : ""}
                </p>
                <p className="mt-2 text-xs">
                  {
                    data.tasks.filter((t) => t.userId === detail.id && t.state === "Planejado")
                      .length
                  }{" "}
                  contatos planejados ·{" "}
                  {data.activities.filter((a) => a.userId === detail.id).length} interações
                  registradas
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => startContact(detail.id)}>
                  Registrar contato
                </Button>
                <Button size="sm" variant="outline" onClick={() => startContact(detail.id, true)}>
                  Registrar feedback
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const at = adminDate + "T15:00:00Z";
                    commit(
                      {
                        ...data,
                        users: data.users.map((u) =>
                          u.id === detail.id ? { ...u, lastAccess: at } : u,
                        ),
                        activities: [
                          { id: adminId(), userId: detail.id, at, feature: "Acesso" },
                          ...data.activities,
                        ],
                      },
                      "Acesso simulado",
                      `Acesso fictício de ${detail.name} na referência ${adminDate}.`,
                    );
                  }}
                  disabled={detail.status === "Desativado"}
                >
                  <Activity className="size-3" /> Simular acesso
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={showAudit} onOpenChange={setShowAudit}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Histórico de alterações</DialogTitle>
            <DialogDescription>
              Registro local das ações nesta demonstração; não é auditoria de contas reais.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {data.audit.map((entry) => (
              <article key={entry.id} className="rounded-xl border border-border p-4">
                <p className="text-sm font-semibold">{entry.action}</p>
                <p className="mt-2 whitespace-pre-wrap break-words text-xs text-muted-foreground">
                  {entry.detail}
                </p>
                <p className="mt-2 text-[10px] text-muted-foreground">
                  {new Date(entry.at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                </p>
              </article>
            ))}
            {!data.audit.length && (
              <p className="text-sm text-muted-foreground">
                Nenhuma alteração registrada neste cenário.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
