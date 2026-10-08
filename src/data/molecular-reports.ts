import type { DocumentSummary } from "@/lib/ai-contract";
export type ReportKind = "Genética" | "Genômica" | "Laboratorial";
export type Evidence = { page: number | null; title: string; text: string; quote?: string };
export type Report = {
  id: string;
  title: string;
  date: string;
  pages?: number;
  source: string;
  demo: boolean;
  scope: string;
  findings: Evidence[];
  limitations: Evidence[];
  file?: File;
  analysis?: DocumentSummary;
  model?: string;
  generatedAt?: string;
};
export const demoReports: Record<ReportKind, Report[]> = {
  Laboratorial: [],
  Genética: [
    {
      id: "genetica-demo",
      title: "Painel genético · investigação familiar",
      date: "18/09/2026",
      pages: 24,
      source: "Laudo ilustrativo INOVA",
      demo: true,
      scope:
        "Organizar os achados descritos no painel e os pontos que exigem correlação com o histórico familiar.",
      findings: [
        {
          page: 4,
          title: "Escopo do exame",
          text: "O documento ilustrativo descreve um painel direcionado à investigação familiar. A análise se restringe às regiões incluídas no painel.",
        },
        {
          page: 9,
          title: "Achado com classificação inconclusiva",
          text: "O laudo ilustrativo registra um achado classificado pelo laboratório como de significado incerto. O exemplo não informa gene, variante ou nomenclatura molecular.",
        },
        {
          page: 17,
          title: "Contexto familiar",
          text: "O documento orienta correlacionar os achados com o histórico familiar registrado. Não há resultado de teste de familiares incluído neste exemplo.",
        },
      ],
      limitations: [
        {
          page: 21,
          title: "Limites e informações ausentes",
          text: "O exemplo não disponibiliza identificação molecular completa, cobertura ou evidências de classificação. Esses campos precisam ser conferidos no laudo original antes de qualquer interpretação.",
        },
        {
          page: 23,
          title: "Conclusão do documento",
          text: "A conclusão ilustrativa não estabelece diagnóstico. A avaliação profissional deve considerar o escopo do teste e os dados clínicos disponíveis.",
        },
      ],
    },
  ],
  Genômica: [
    {
      id: "genomica-demo",
      title: "Sequenciamento · análise genômica",
      date: "18/09/2026",
      pages: 48,
      source: "Laudo ilustrativo INOVA",
      demo: true,
      scope:
        "Consolidar o escopo, os achados relatados e as limitações de um documento extenso de sequenciamento.",
      findings: [
        {
          page: 5,
          title: "Método e abrangência",
          text: "O documento ilustrativo descreve sequenciamento e análise das regiões reportáveis definidas pelo laboratório. A descrição não equivale a cobertura integral de todo o genoma.",
        },
        {
          page: 18,
          title: "Achados reportados",
          text: "O exemplo organiza achados em uma seção principal e outra complementar. Não fornece genes, variantes, classificação individual ou associação clínica verificável.",
        },
        {
          page: 32,
          title: "Achados adicionais",
          text: "O documento reserva uma seção para achados adicionais. Neste exemplo não há informação suficiente para concluir presença ou ausência desses achados.",
        },
      ],
      limitations: [
        {
          page: 42,
          title: "Cobertura e qualidade",
          text: "Os dados técnicos de cobertura e qualidade não foram preenchidos no exemplo. A síntese deve sinalizar essa ausência, sem tratá-la como resultado negativo.",
        },
        {
          page: 46,
          title: "Pontos de revisão",
          text: "O documento ilustrativo pede conferência da indicação do exame, do contexto clínico e das limitações técnicas antes de usar seus achados na avaliação.",
        },
      ],
    },
  ],
};
