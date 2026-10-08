import { cn } from "@/lib/utils";
export const tabs = [
  "Resumo da consulta",
  "Envios do paciente",
  "Solicitar exames",
  "Orientações ao paciente",
  "Visão geral",
  "Resultados",
  "Laudos laboratoriais",
  "Histórico",
  "Histórico familiar",
  "Genética",
  "Genômica",
  "Comparação",
  "Documentos",
] as const;

const tabGroups = [
  { label: "Consulta e comunicação", items: tabs.slice(0, 4) },
  { label: "Resultados e evolução", items: [tabs[4], tabs[5], tabs[7], tabs[11], tabs[8]] },
  { label: "Laudos e documentos", items: [tabs[6], tabs[9], tabs[10], tabs[12]] },
];
const tabHelp: Record<(typeof tabs)[number], string> = {
  "Resumo da consulta":
    "Comece pelo resumo. Confira pendências, resultados e informações para a consulta.",
  "Envios do paciente":
    "Ouça os áudios e confira as respostas e os documentos enviados pelo paciente.",
  "Solicitar exames":
    "Selecione exames, salve o pedido e libere para o paciente quando estiver pronto.",
  "Orientações ao paciente":
    "Escreva, revise e publique as orientações que aparecerão no espaço do paciente.",
  "Visão geral": "Consulte os indicadores mais recentes deste paciente.",
  Resultados: "Confira os resultados laboratoriais e suas referências disponíveis.",
  "Laudos laboratoriais":
    "Selecione um PDF, confira o original e solicite uma síntese por IA para revisão.",
  Histórico: "Acompanhe a evolução dos resultados nos gráficos.",
  "Histórico familiar":
    "Consulte as informações familiares registradas para contextualizar a avaliação.",
  Genética:
    "Consulte arquivos genéticos TXT e laudos PDF. Os scores do arquivo bruto estão pendentes.",
  Genômica: "Abra o laudo genômico e solicite uma síntese por IA com fontes para conferir.",
  Comparação: "Selecione duas coletas para visualizar as diferenças numéricas entre os resultados.",
  Documentos: "Localize os documentos disponíveis e abra a seção correspondente para revisão.",
};
export function PatientNavigation({
  value,
  onChange,
  hasHistory = true,
}: {
  value: (typeof tabs)[number];
  onChange: (value: (typeof tabs)[number]) => void;
  hasHistory?: boolean;
}) {
  return (
    <nav aria-label="Seções do prontuário" className="mt-4 space-y-3">
      <div className="grid gap-3 xl:grid-cols-3">
        {tabGroups.map((group) => (
          <div key={group.label} className="rounded-xl border border-border bg-muted/20 p-3">
            <p className="mb-2 text-xs font-semibold text-muted-foreground">{group.label}</p>
            <div className="flex flex-wrap gap-1.5">
              {group.items
                .filter(
                  (item) =>
                    hasHistory ||
                    !([tabs[5], tabs[7], tabs[8], tabs[11]] as readonly string[]).includes(item),
                )
                .map((item) => (
                  <button
                    key={item}
                    onClick={() => onChange(item)}
                    aria-current={value === item ? "page" : undefined}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-left text-sm transition-colors focus-visible:outline-2 focus-visible:outline-brand",
                      value === item
                        ? "border-brand bg-brand-soft font-semibold text-brand-deep"
                        : "border-transparent bg-white text-muted-foreground hover:border-border hover:text-foreground",
                    )}
                  >
                    {item}
                  </button>
                ))}
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-border bg-white px-4 py-3">
        <p className="text-sm font-semibold">{value}</p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{tabHelp[value]}</p>
      </div>
    </nav>
  );
}
