// INOVA demonstration catalog. These are not S2 procedure identifiers.
export const orderExams = [
  { id: "hemograma", name: "Hemograma completo", group: "Hematologia" },
  { id: "glicemia-jejum", name: "Glicemia em jejum", group: "Bioquímica" },
  { id: "hemoglobina-glicada", name: "Hemoglobina glicada (HbA1c)", group: "Bioquímica" },
  { id: "perfil-lipidico", name: "Perfil lipídico", group: "Bioquímica" },
  { id: "creatinina", name: "Creatinina", group: "Bioquímica" },
  { id: "tsh", name: "TSH", group: "Hormônios" },
  { id: "vitamina-d", name: "25-hidroxivitamina D", group: "Vitaminas" },
  { id: "vitamina-b12", name: "Vitamina B12", group: "Vitaminas" },
  { id: "ferritina", name: "Ferritina", group: "Bioquímica" },
  { id: "urina", name: "Urina tipo I", group: "Urinálise" },
] as const;
