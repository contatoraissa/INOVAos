import { usePatientDirectory } from "./patient-directory";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  CalendarDays,
  ChartNoAxesCombined,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  GitCompareArrows,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Settings,
  Stethoscope,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "./Logo";
import { DoctorNotificationBell } from "./DoctorNotificationBell";
import { signOutAccount } from "@/lib/account-session";

import { cn } from "@/lib/utils";

const groups = [
  {
    label: "Atendimento",
    links: [
      { to: "/dashboard", text: "Visão geral", icon: LayoutDashboard },
      { to: "/agenda", text: "Agenda", icon: CalendarDays },
      { to: "/patients", text: "Pacientes", icon: Users },
      { to: "/patients/new", text: "Novo paciente", icon: UserPlus },
    ],
  },
  {
    label: "Consultar exames",
    links: [
      { to: "/results", text: "Novos resultados", icon: ClipboardList },
      { to: "/history", text: "Histórico de exames", icon: History },
      { to: "/comparison", text: "Comparação", icon: GitCompareArrows },
    ],
  },
  {
    label: "Equipe e acompanhamento",
    links: [
      { to: "/doctors", text: "Meu perfil", icon: Stethoscope },
      { to: "/follow-up", text: "Acompanhamento", icon: Activity },
    ],
  },
  {
    label: "Relatórios",
    links: [{ to: "/indicators", text: "Meus relatórios", icon: ChartNoAxesCombined }],
  },
  { label: "Sistema", links: [{ to: "/settings", text: "Configurações", icon: Settings }] },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  return <DemoAppShell>{children}</DemoAppShell>;
}
export function DemoAppShell({ children }: { children: ReactNode }) {
  const { patients } = usePatientDirectory();
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="min-h-screen bg-background">
      {mobileOpen && (
        <button
          aria-label="Fechar menu"
          className="fixed inset-0 z-40 bg-overlay lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col bg-sidebar text-sidebar-foreground transition-[width,transform] duration-200",
          collapsed ? "w-[76px]" : "w-[248px]",
          mobileOpen ? "translate-x-0" : "max-lg:-translate-x-full",
        )}
      >
        <div className="flex h-20 items-center justify-between border-b border-sidebar-border px-5">
          <Link
            to="/dashboard"
            aria-label="INOVA · voltar ao início do médico"
            onClick={() => setMobileOpen(false)}
            className="rounded-md focus-visible:outline-2 focus-visible:outline-brand"
          >
            {collapsed ? <Logo compact light /> : <Logo />}
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileOpen(false)}
          >
            <X />
          </Button>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-5">
          {groups.map((group) => (
            <div key={group.label} className="mb-5">
              <p
                className={cn(
                  "mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-sidebar-muted",
                  collapsed && "sr-only",
                )}
              >
                {group.label}
              </p>
              <div className="space-y-1">
                {group.links.map((item) => {
                  const active =
                    path === item.to ||
                    (item.to === "/patients" &&
                      path.startsWith("/patients/") &&
                      path !== "/patients/new");
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      title={collapsed ? item.text : undefined}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex h-10 items-center gap-3 rounded-md px-3 text-sm text-sidebar-muted transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground",
                        active && "bg-sidebar-accent text-brand-deep font-semibold",
                        collapsed && "justify-center px-0",
                      )}
                    >
                      <Icon className="size-[18px] shrink-0" />
                      {!collapsed && <span>{item.text}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="border-t border-sidebar-border p-3">
          <Button
            variant="ghost"
            className="mb-2 w-full justify-start gap-3 text-sidebar-muted hover:bg-sidebar-accent"
            aria-label="Sair da área médica"
            title="Sair"
            onClick={async () => {
              await signOutAccount();
              window.location.replace("/acesso");
            }}
          >
            <LogOut className="size-4 shrink-0" />
            {!collapsed && <span>Sair</span>}
          </Button>
          {!collapsed && (
            <div className="mb-3 rounded-md bg-sidebar-accent/60 p-3">
              <p className="text-sm font-medium">Dr. Rafael Mendes</p>
              <p className="mt-1 text-[11px] text-sidebar-muted">
                Perfil demonstrativo · dados fictícios
              </p>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="hidden w-full text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground lg:flex"
            onClick={() => setCollapsed((v) => !v)}
          >
            {collapsed ? <ChevronRight /> : <ChevronLeft />}
          </Button>
        </div>
      </aside>
      <div
        className={cn(
          "transition-[padding] duration-200",
          collapsed ? "lg:pl-[76px]" : "lg:pl-[248px]",
        )}
      >
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-white/95 px-5 backdrop-blur md:px-8">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileOpen(true)}
          >
            <Menu />
          </Button>
          <div className="relative hidden max-w-md flex-1 md:block">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-10 bg-muted/60 pl-9 shadow-none"
              placeholder="Encontrar paciente..."
              aria-label="Encontrar paciente"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query.trim() && (
              <div className="absolute left-0 right-0 top-12 max-h-80 overflow-auto rounded-xl border border-border bg-white p-2 shadow-lg">
                {patients
                  .filter((p) =>
                    `${p.name} ${p.cpf} ${p.rg}`.toLowerCase().includes(query.toLowerCase()),
                  )
                  .map((p) => (
                    <Link
                      key={p.id}
                      to="/patients/$patientId"
                      params={{ patientId: p.id }}
                      onClick={() => setQuery("")}
                      className="block rounded-lg px-3 py-3 hover:bg-brand-soft"
                    >
                      <p className="text-sm font-medium">{p.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{p.exam}</p>
                    </Link>
                  ))}
                {!patients.some((p) =>
                  `${p.name} ${p.cpf} ${p.rg}`.toLowerCase().includes(query.toLowerCase()),
                ) && (
                  <p className="p-4 text-sm text-muted-foreground">Nenhum paciente encontrado.</p>
                )}
              </div>
            )}
          </div>
          <div className="ml-auto flex items-center gap-3">
            <DoctorNotificationBell />
            <div className="hidden border-l border-border pl-4 sm:block">
              <p className="text-xs font-semibold">Dr. Rafael Mendes</p>
              <p className="text-[11px] text-muted-foreground">Médico</p>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-[1440px] p-5 md:p-8 lg:px-10">
          <div className="mb-5 flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="size-1.5 rounded-full bg-brand" />
            Ambiente demonstrativo · dados fictícios
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
