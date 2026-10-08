import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/inova/Logo";
import { CalendarDays, Check } from "lucide-react";
import { demoWhatsAppUrl } from "@/data/demo-contact";
export const Route = createFileRoute("/agendar-demonstracao")({ component: ScheduleDemo });
function ScheduleDemo() {
  return (
    <main className="min-h-dvh bg-background px-6 py-8">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-5">
        <Logo />
        <Link to="/" className="text-sm text-brand-deep">
          Voltar ao INOVA
        </Link>
      </header>
      <section className="mx-auto mt-12 grid max-w-6xl items-center gap-10 lg:grid-cols-2">
        <div>
          <p className="eyebrow">DEMONSTRAÇÃO MÉDICA · COM A NOSSA EQUIPE</p>
          <h1 className="mt-5 font-display text-4xl font-semibold leading-tight">
            Conheça o INOVA em uma demonstração acompanhada.
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
            Vamos apresentar o fluxo médico e conversar sobre como ele pode fazer parte da sua
            rotina. O acesso demonstrativo médico é realizado com a equipe, mediante agendamento.
          </p>
          <ul className="mt-8 space-y-4 text-sm">
            {[
              "Revisão de laudos e resultados com contexto",
              "Preparação da consulta e participação do paciente",
              "Pedidos, orientações e retorno planejado",
            ].map((text) => (
              <li key={text} className="flex gap-3">
                <Check className="size-4 text-brand" />
                {text}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border bg-white p-8">
          <CalendarDays className="size-8 text-brand" />
          <h2 className="mt-5 text-2xl font-semibold">Agendar uma conversa</h2>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Fale com a equipe pelo WhatsApp para combinar uma data e um horário para sua
            demonstração.
          </p>
          <a
            href={demoWhatsAppUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex rounded-xl bg-brand px-5 py-3 font-semibold text-white"
          >
            Agendar pelo WhatsApp
          </a>
          <p className="mt-3 text-xs text-muted-foreground">
            A conversa abre com uma mensagem pronta. O agendamento será confirmado pela equipe.
          </p>
          <p className="mt-4 rounded-xl bg-brand-soft p-4 text-sm">
            Você também pode explorar o perfil fictício do médico, sem login. Agendar uma conversa
            não ativa uma assinatura.
          </p>
          <Link to="/dashboard" className="mt-4 inline-block font-semibold text-brand-deep">
            Ver demonstração médica →
          </Link>
          <Link to="/acesso" className="mt-6 inline-block font-medium text-brand-deep">
            Já tenho uma conta · entrar
          </Link>
        </div>
      </section>
    </main>
  );
}
