import { Link } from "@tanstack/react-router";
import {
  FileText,
  Activity,
  Dna,
  ClipboardList,
  MessagesSquare,
  CalendarDays,
  ArrowRight,
} from "lucide-react";

export function DoctorProductDetails() {
  return (
    <>
      <section id="para-medicos" className="border-y bg-white px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="eyebrow">NA ROTINA DO MÉDICO</p>
            <h2 className="mt-4 font-display text-3xl font-semibold sm:text-4xl">
              Da preparação ao retorno, cada etapa tem seu lugar.
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
              O INOVA reúne a experiência de revisão de exames e a participação do paciente. Conheça
              os fluxos que você já pode explorar na demonstração.
            </p>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {[
              {
                icon: FileText,
                title: "Laudos com revisão assistida",
                text: "Abra o PDF original ao lado da síntese da IA. Confira achados, conclusão, limitações e referências antes de marcar a revisão.",
                detail: "Laboratoriais · genética · genômica",
              },
              {
                icon: Activity,
                title: "Resultados ao longo do tempo",
                text: "Compare coletas, valores e unidades. Consulte gráficos de evolução e referências quando houver contexto suficiente para apresentá-las.",
                detail: "Histórico · comparação · evolução",
              },
              {
                icon: MessagesSquare,
                title: "O paciente chega preparado",
                text: "Revise sintomas relatados, medicamentos e perguntas enviados pelo paciente, com áudio e documentos quando anexados.",
                detail: "Revisão antes do envio · acompanhamento de status",
              },
              {
                icon: ClipboardList,
                title: "Pedidos e orientações claros",
                text: "Monte um pedido, revise o rascunho e libere para o paciente. Organize orientações separadas do conteúdo gerado pela IA.",
                detail: "Rascunho · publicação · cancelamento",
              },
              {
                icon: Dna,
                title: "Genética organizada",
                text: "Consulte laudos e importe arquivos brutos compatíveis com 23andMe. Quatro domínios organizam a consulta; os scores aguardam metodologia validada.",
                detail: "Neurologia · metabólico · imunidade · nutrição",
              },
              {
                icon: CalendarDays,
                title: "Continuidade depois da consulta",
                text: "Feche o resumo e proponha uma data ou prazo de retorno. O paciente acompanha o próximo passo sem confundir o planejamento com agendamento.",
                detail: "Resumo da consulta · retorno planejado",
              },
            ].map(({ icon: Icon, title, text, detail }) => (
              <article key={title} className="rounded-2xl border bg-background p-6">
                <span className="inline-flex rounded-xl bg-brand-soft p-3 text-brand-deep">
                  <Icon className="size-5" />
                </span>
                <h3 className="mt-5 text-lg font-semibold">{title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{text}</p>
                <p className="mt-5 border-t pt-4 text-xs font-medium text-brand-deep">{detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-2">
        <div>
          <p className="eyebrow">UM FLUXO PARA EXPLORAR</p>
          <h2 className="mt-4 font-display text-3xl font-semibold">Veja a consulta por inteiro.</h2>
          <ol className="mt-8 space-y-5">
            {[
              ["Antes", "O paciente prepara dúvidas, relatos e documentos."],
              ["Durante", "O médico revisa fontes, resultados e evolução."],
              ["Ao encerrar", "O médico organiza pedidos, orientações e próximos passos."],
              ["No retorno", "O histórico e o planejamento ajudam a retomar o acompanhamento."],
            ].map(([label, text], i) => (
              <li key={label} className="flex gap-4">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-semibold text-brand-deep">
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-semibold">{label}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <aside className="rounded-2xl border border-brand/20 bg-brand-soft p-7">
          <h2 className="font-display text-2xl font-semibold">O que você encontra hoje</h2>
          <div className="mt-6 space-y-5 text-sm leading-relaxed">
            <div>
              <h3 className="font-semibold">Demonstração disponível</h3>
              <p className="mt-1 text-muted-foreground">
                Navegação dos espaços médico e paciente com perfis fictícios. Os recursos de IA
                dependem de configuração e disponibilidade do provedor.
              </p>
            </div>
            <div>
              <h3 className="font-semibold">Conta real conectada</h3>
              <p className="mt-1 text-muted-foreground">
                Cadastro, confirmação de e-mail e login Supabase. Retornos planejados possuem uma
                camada de persistência no banco.
              </p>
            </div>
            <div>
              <h3 className="font-semibold">Em implantação</h3>
              <p className="mt-1 text-muted-foreground">
                Módulos clínicos da conta real, autorização por vínculo, migração completa dos dados
                e contratação da assinatura. A consulta de preços em laboratórios ainda não tem
                integração comercial.
              </p>
            </div>
            <div>
              <h3 className="font-semibold">Decisão profissional</h3>
              <p className="mt-1 text-muted-foreground">
                A IA auxilia a leitura. Não libera diagnóstico, dose ou conduta automaticamente. Os
                achados precisam ser conferidos no documento e no contexto clínico.
              </p>
            </div>
          </div>
          <Link
            to="/acesso"
            className="mt-7 inline-flex items-center gap-3 font-semibold text-brand-deep"
          >
            Conhecer o espaço médico <ArrowRight className="size-4" />
          </Link>
        </aside>
      </section>
    </>
  );
}
