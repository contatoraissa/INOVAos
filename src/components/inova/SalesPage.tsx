import { demoWhatsAppUrl } from "@/data/demo-contact";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Check,
  FileText,
  Activity,
  Sparkles,
  CalendarDays,
  ShieldCheck,
} from "lucide-react";
import { Logo } from "./Logo";
import { DoctorProductDetails } from "./DoctorProductDetails";
import { SalesFooter } from "./SalesFooter";
import { medicalPricing } from "@/data/pricing";

const views = [
  {
    title: "Resultados",
    subtitle: "As coletas contam uma história.",
    detail: "Consulte valores, referências e evolução em uma visão organizada para revisão.",
    rows: [
      ["Glicemia", "92 mg/dL", "Última coleta"],
      ["Colesterol LDL", "108 mg/dL", "Histórico disponível"],
      ["Hemoglobina", "13,8 g/dL", "Comparar coletas"],
    ],
  },
  {
    title: "Laudos e IA",
    subtitle: "Do documento à revisão médica.",
    detail: "Leia uma síntese ao lado do laudo original e confira as fontes antes de validar.",
    rows: [
      ["Síntese do documento", "Pronta para revisão", "IA assistiva"],
      ["Documento original", "PDF disponível", "Conferir fonte"],
      ["Revisão profissional", "Pendente", "Decisão médica"],
    ],
  },
  {
    title: "Continuidade",
    subtitle: "O cuidado segue depois da consulta.",
    detail: "Organize pedidos, orientações e retornos planejados com próximos passos explícitos.",
    rows: [
      ["Pedido de exames", "Liberado", "Paciente informado"],
      ["Orientações", "Publicadas", "Revisadas pelo médico"],
      ["Retorno planejado", "Em 30 dias", "Sem horário agendado"],
    ],
  },
];
export function SalesPage() {
  const [view, setView] = useState(0);
  const selected = views[view]!;
  return (
    <main className="bg-background">
      <header className="border-b bg-white">
        <nav
          aria-label="Navegação principal"
          className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-5 px-6 py-5"
        >
          <Logo />
          <div className="flex flex-wrap items-center gap-5 text-sm">
            <a href="#produto">Conheça o INOVA</a>
            <a href="#para-medicos">Para médicos</a>
            <a href="#como-funciona">Como funciona</a>
            <a href="#planos">Acesso e planos</a>
            <Link to="/acesso" className="font-semibold text-brand-deep">
              Entrar na conta
            </Link>
          </div>
        </nav>
      </header>
      <section className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-16 lg:grid-cols-[1.05fr_1fr] lg:py-24">
        <div>
          <p className="eyebrow">INOVA · CUIDADO EM PERSPECTIVA</p>
          <h1 className="mt-6 font-display text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            Uma história de saúde.
            <br />
            <span className="text-brand-deep">Uma visão mais clara.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
            Conecte resultados, laudos e acompanhamento para chegar à consulta com as informações
            que importam.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-3 rounded-xl bg-brand px-6 py-3 font-semibold text-white"
            >
              Ver demonstração médica <ArrowRight className="size-4" />
            </Link>
            <a
              href={demoWhatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 rounded-xl bg-brand px-6 py-3 font-semibold text-white"
            >
              Agendar demonstração <ArrowRight className="size-4" />
            </a>
            <Link
              to="/acesso-paciente"
              className="rounded-xl border bg-white px-6 py-3 font-medium"
            >
              Sou paciente
            </Link>
          </div>
          <p className="mt-5 text-xs text-muted-foreground">
            Demonstração médica agendada com a equipe · conta médica por assinatura · paciente
            gratuito
          </p>
        </div>
        <div className="relative rounded-[2rem] border border-brand/20 bg-[#eaf5f7] p-5 sm:p-8">
          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <Logo compact />
              <span className="rounded-full bg-brand-soft px-3 py-1 text-xs text-brand-deep">
                Prévia demonstrativa
              </span>
            </div>
            <p className="mt-7 text-xs uppercase tracking-widest text-muted-foreground">
              Resumo do paciente
            </p>
            <h2 className="mt-2 font-display text-2xl font-semibold">Mariana Oliveira</h2>
            <div className="mt-6 grid grid-cols-2 gap-3">
              {[
                ["Resultados", "6 coletas"],
                ["Laudos", "Revisão assistida"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-background p-4">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="mt-2 font-semibold">{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 flex items-start gap-3 rounded-xl border border-brand/20 p-4">
              <Sparkles className="mt-1 size-5 shrink-0 text-brand" />
              <div>
                <h3 className="text-sm font-semibold">Informações organizadas para revisar</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  O laudo permanece disponível para conferir cada achado da síntese.
                </p>
              </div>
            </div>
            <div className="mt-5 flex items-center gap-2 text-xs text-brand-deep">
              <ShieldCheck className="size-4" />A decisão continua com o profissional.
            </div>
          </div>
        </div>
      </section>
      <section id="como-funciona" className="border-y bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-12 md:grid-cols-3">
          {[
            {
              icon: FileText,
              title: "Reúna as informações",
              text: "Exames, laudos e relatos preparados pelo paciente.",
            },
            {
              icon: Sparkles,
              title: "Revise com contexto",
              text: "Sínteses assistidas por IA, documento original e evolução lado a lado.",
            },
            {
              icon: CalendarDays,
              title: "Defina os próximos passos",
              text: "Pedidos, orientações e retorno planejado em um fluxo organizado.",
            },
          ].map(({ icon: Icon, title, text }, i) => (
            <article key={title}>
              <div className="flex items-center gap-3 text-brand">
                <Icon className="size-5" />
                <span className="text-xs">0{i + 1}</span>
              </div>
              <h2 className="mt-4 text-lg font-semibold">{title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
            </article>
          ))}
        </div>
      </section>
      <section
        id="produto"
        className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-20 lg:grid-cols-2"
      >
        <div>
          <p className="eyebrow">DENTRO DO INOVA</p>
          <h2 className="mt-4 font-display text-3xl font-semibold sm:text-4xl">
            {selected.subtitle}
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground">{selected.detail}</p>
          <ul className="mt-7 space-y-3 text-sm">
            {[
              "Documento original disponível para conferência",
              "Histórico e próximos passos no mesmo contexto",
              "Espaços próprios para médico e paciente",
            ].map((text) => (
              <li key={text} className="flex gap-3">
                <Check className="size-4 shrink-0 text-brand" />
                {text}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div
            role="tablist"
            aria-label="Conheça os recursos"
            className="mb-4 flex flex-wrap gap-2"
          >
            {views.map((item, i) => (
              <button
                key={item.title}
                role="tab"
                id={`product-tab-${i}`}
                aria-controls="product-preview"
                aria-selected={view === i}
                onClick={() => setView(i)}
                className={`rounded-full border px-4 py-2 text-sm ${view === i ? "border-brand bg-brand text-white" : "bg-white"}`}
              >
                {item.title}
              </button>
            ))}
          </div>
          <div
            id="product-preview"
            role="tabpanel"
            aria-labelledby={`product-tab-${view}`}
            className="overflow-hidden rounded-2xl border bg-white shadow-sm"
          >
            <div className="flex items-center gap-3 border-b bg-brand-soft p-5">
              <Activity className="size-5 text-brand" />
              <h3 className="font-semibold">{selected.title}</h3>
              <span className="ml-auto text-xs text-muted-foreground">Exemplo fictício</span>
            </div>
            <div className="divide-y px-5">
              {selected.rows.map(([name, value, status]) => (
                <div key={name} className="flex flex-wrap items-center justify-between gap-3 py-6">
                  <div>
                    <p className="text-sm font-semibold">{name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{status}</p>
                  </div>
                  <span className="rounded-lg bg-background px-3 py-2 text-sm">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      <DoctorProductDetails />
      <section id="planos" className="bg-[#163e50] px-6 py-16 text-white">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs uppercase tracking-widest text-[#62d1df]">
            UM ESPAÇO PARA CADA PESSOA
          </p>
          <h2 className="mt-4 font-display text-3xl font-semibold">Escolha como quer começar.</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {[
              {
                title: "Conhecer",
                price: "Demonstração agendada",
                text: "Conheça o fluxo médico em uma apresentação com nossa equipe, usando dados fictícios.",
                to: "/agendar-demonstracao" as const,
                cta: "Agendar demonstração",
              },
              {
                title: "Profissional",
                price: `${medicalPricing.introductoryMonthly}/mês`,
                text: `Nos ${medicalPricing.introductoryMonths} primeiros meses. Depois, ${medicalPricing.regularMonthly}/mês. Condição para o lançamento; contratação em breve. Cadastro com CRM e confirmação de e-mail.`,
                to: "/acesso" as const,
                cta: "Criar conta médica",
              },
              {
                title: "Paciente",
                price: "Acesso gratuito",
                text: "Crie sua conta para acompanhar seu cuidado. Os módulos da conta real estão em implantação.",
                to: "/acesso-paciente" as const,
                cta: "Criar conta de paciente",
              },
            ].map((plan) => (
              <article
                key={plan.title}
                className="flex flex-col rounded-2xl border border-white/20 bg-white/5 p-6"
              >
                <h3 className="text-lg font-semibold">{plan.title}</h3>
                <p className="mt-3 text-2xl font-semibold">{plan.price}</p>
                <p className="mt-4 flex-1 text-sm leading-relaxed text-[#bfd5df]">{plan.text}</p>
                <a
                  href={plan.to === "/agendar-demonstracao" ? demoWhatsAppUrl : plan.to}
                  target={plan.to === "/agendar-demonstracao" ? "_blank" : undefined}
                  rel={plan.to === "/agendar-demonstracao" ? "noopener noreferrer" : undefined}
                  className="mt-7 inline-flex items-center justify-between gap-3 rounded-lg bg-white px-4 py-3 text-sm font-semibold text-[#163e50]"
                >
                  {plan.cta}
                  <ArrowRight className="size-4" />
                </a>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-4xl px-6 py-16">
        <h2 className="font-display text-3xl font-semibold">Antes de começar</h2>
        <div className="mt-7 divide-y">
          {[
            [
              "A IA substitui a avaliação médica?",
              "Não. As sínteses organizam informações para revisão. Diagnóstico, interpretação clínica e conduta dependem do profissional.",
            ],
            [
              "A demonstração usa meus dados?",
              "A navegação demonstrativa utiliza perfis fictícios. Use documentos fictícios ou anonimizados nos recursos demonstrativos de análise.",
            ],
            [
              "O cadastro médico já faz uma cobrança?",
              "Não. A assinatura permanece pendente até a disponibilização da contratação.",
            ],
            [
              "Já posso usar minha conta com pacientes reais?",
              "O cadastro e a confirmação de e-mail estão conectados. A implantação do acesso clínico, das permissões e dos demais módulos ainda está em andamento.",
            ],
          ].map(([question, answer]) => (
            <details key={question} className="py-5">
              <summary className="cursor-pointer font-semibold">{question}</summary>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{answer}</p>
            </details>
          ))}
        </div>
      </section>
      <SalesFooter />
    </main>
  );
}
