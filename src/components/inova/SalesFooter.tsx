import { demoWhatsAppUrl } from "@/data/demo-contact";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Logo } from "./Logo";
import { medicalPricing } from "@/data/pricing";

export function SalesFooter() {
  return (
    <>
      <section className="mx-auto max-w-7xl px-6 pb-16">
        <div className="rounded-[2rem] border border-brand/20 bg-brand-soft px-6 py-12 text-center sm:px-12 sm:py-16">
          <p className="eyebrow">INOVA · MAIS CONTEXTO PARA CUIDAR</p>
          <h2 className="mx-auto mt-5 max-w-3xl font-display text-3xl font-semibold leading-tight sm:text-4xl">
            A próxima consulta começa com uma visão mais completa.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground">
            Conheça o espaço médico, explore a revisão de laudos e veja como organizar o
            acompanhamento do paciente em cada etapa.
          </p>
          <div className="mx-auto mt-8 max-w-2xl rounded-2xl border border-brand/15 bg-white/70 p-5">
            <p className="text-sm font-semibold text-brand-deep">Plano médico mensal</p>
            <p className="mt-2 text-3xl font-semibold">
              {medicalPricing.introductoryMonthly}
              <span className="text-base font-normal text-muted-foreground"> /mês</span>
            </p>
            <p className="mt-2 text-sm">
              Nos {medicalPricing.introductoryMonths} primeiros meses. A partir do 4º mês,{" "}
              {medicalPricing.regularMonthly}/mês.
            </p>
            <p className="mt-3 text-xs text-muted-foreground">
              Condição anunciada para o lançamento. Contratação em breve; nenhuma cobrança é
              realizada nesta página. Pacientes têm acesso gratuito.
            </p>
          </div>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link
              to="/acesso"
              className="inline-flex items-center gap-3 rounded-xl bg-brand px-6 py-3 font-semibold text-white"
            >
              Criar minha conta médica <ArrowRight className="size-4" />
            </Link>
            <a
              href={demoWhatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl border border-brand/20 bg-white px-6 py-3 font-medium text-brand-deep"
            >
              Agendar demonstração
            </a>
            <Link
              to="/acesso-paciente"
              className="rounded-xl px-6 py-3 font-medium text-brand-deep"
            >
              Acesso do paciente
            </Link>
          </div>
        </div>
      </section>
      <footer className="bg-[#123343] px-6 py-12 text-white">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1.2fr]">
            <div>
              <Logo className="text-white" />
              <p className="mt-5 max-w-xs text-sm leading-relaxed text-[#bfd5df]">
                Resultados, documentos e acompanhamento em perspectiva. Informação organizada para
                apoiar o cuidado e a revisão profissional.
              </p>
            </div>
            <nav aria-label="Navegação do rodapé">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-[#62d1df]">
                Conheça o INOVA
              </h2>
              <ul className="mt-5 space-y-3 text-sm">
                <li>
                  <a href="#produto" className="hover:underline">
                    Recursos da plataforma
                  </a>
                </li>
                <li>
                  <a href="#para-medicos" className="hover:underline">
                    Para médicos
                  </a>
                </li>
                <li>
                  <a href="#como-funciona" className="hover:underline">
                    Como funciona
                  </a>
                </li>
                <li>
                  <a href="#planos" className="hover:underline">
                    Planos e valores
                  </a>
                </li>
              </ul>
            </nav>
            <nav aria-label="Acessos do rodapé">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-[#62d1df]">
                Seu espaço
              </h2>
              <ul className="mt-5 space-y-3 text-sm">
                <li>
                  <Link to="/acesso" className="hover:underline">
                    Entrar como médico
                  </Link>
                </li>
                <li>
                  <Link to="/acesso-paciente" className="hover:underline">
                    Entrar como paciente
                  </Link>
                </li>
                <li>
                  <Link to="/acesso" className="hover:underline">
                    Criar minha conta
                  </Link>
                </li>
                <li>
                  <a
                    href={demoWhatsAppUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    Agendar demonstração
                  </a>
                </li>
              </ul>
            </nav>
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-[#62d1df]">
                Uso responsável
              </h2>
              <p className="mt-5 text-sm leading-relaxed text-[#bfd5df]">
                A IA auxilia a organização e a leitura dos dados. Achados precisam ser conferidos no
                documento original e no contexto clínico.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-[#bfd5df]">
                A demonstração utiliza dados fictícios. A contratação e os módulos clínicos da conta
                real estão em implantação.
              </p>
            </div>
          </div>
          <div className="mt-10 flex flex-wrap justify-between gap-4 border-t border-white/15 pt-6 text-xs text-[#bfd5df]">
            <p>© 2026 INOVA · Cuidado em perspectiva.</p>
            <p>A decisão clínica é do profissional responsável.</p>
          </div>
        </div>
      </footer>
    </>
  );
}
