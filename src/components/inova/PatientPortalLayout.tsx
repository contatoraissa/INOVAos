import { useState, type ReactNode } from "react";
import { LogOut, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "./Logo";
import { navigation, patientGroups, type Section } from "./patient-navigation";

// Same sidebar, spacing, colors and responsive structure as the approved patient portal.
export function PatientPortalLayout({
  name,
  section,
  onOpen,
  onExit,
  notifications,
  children,
}: {
  name: string;
  section: Section;
  onOpen: (section: Section) => void;
  onExit: () => void;
  notifications: ReactNode;
  children: ReactNode;
}) {
  const [menu, setMenu] = useState(false);
  const open = (next: Section) => {
    onOpen(next);
    setMenu(false);
  };
  return (
    <div className="patient-portal min-h-screen bg-[#f4f8fa]">
      {menu && (
        <button
          aria-label="Fechar menu"
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={() => setMenu(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-border bg-white transition-transform lg:translate-x-0 ${menu ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex items-center justify-between px-7 py-8">
          <button
            type="button"
            onClick={() => open("home")}
            aria-label="INOVA · voltar ao início do paciente"
            className="rounded-md focus-visible:outline-2 focus-visible:outline-brand"
          >
            <Logo />
          </button>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMenu(false)}
            aria-label="Fechar navegação"
          >
            <X />
          </Button>
        </div>
        <p className="px-7 pb-5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          ESPAÇO DO PACIENTE
        </p>
        <nav
          className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3"
          aria-label="Navegação do paciente"
        >
          {patientGroups.map((group) => (
            <div key={group.label} className="mb-5">
              <p className="mb-2 px-4 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {group.label}
              </p>
              {navigation
                .filter((item) => group.ids.includes(item.id))
                .map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => open(id)}
                    aria-current={section === id ? "page" : undefined}
                    className={`flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-left text-sm transition-colors ${section === id ? "bg-brand-soft font-semibold text-brand-deep" : "text-muted-foreground hover:bg-muted"}`}
                  >
                    <Icon className="size-4 shrink-0" />
                    {label}
                  </button>
                ))}
            </div>
          ))}
        </nav>
        <div className="mt-auto p-4">
          <div className="rounded-2xl bg-[#f3f8f9] p-4">
            <p className="text-sm font-semibold">{name}</p>
            <p className="mt-1 text-xs text-muted-foreground">Sua conta de paciente</p>
          </div>
          <button
            onClick={onExit}
            className="mt-4 flex items-center gap-2 px-3 text-sm text-muted-foreground"
          >
            <LogOut className="size-4" />
            Sair do meu espaço
          </button>
        </div>
      </aside>
      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 flex h-20 items-center justify-between gap-3 border-b border-border bg-white/95 px-5 backdrop-blur sm:px-8">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              aria-label="Abrir menu"
              onClick={() => setMenu(true)}
            >
              <Menu />
            </Button>
            <p className="hidden text-sm font-medium sm:block">Cuidado em perspectiva</p>
          </div>
          {notifications}
          <span className="rounded-full bg-brand-soft px-3 py-1.5 text-[11px] font-medium text-brand-deep">
            Sua conta
          </span>
        </header>
        <main className="mx-auto max-w-6xl space-y-6 px-5 py-8 sm:px-8">{children}</main>
      </div>
    </div>
  );
}
