export type MarkerKey = "hemoglobina" | "glicemia" | "ldl" | "vitaminaD";
export type MarkerReference = {
  value: string;
  population: string;
  note: string;
  sourceName?: string;
  sourceUrl?: string;
};
// Published consultation parameters, not intervals supplied by the performing laboratory.
export function markerReference(key: MarkerKey, age: number | null, sex?: string): MarkerReference {
  if (age === null || !Number.isInteger(age) || age < 0 || age > 130)
    return {
      value: "Referência não selecionada",
      population: "Idade não disponível",
      note: "Confira a data de nascimento e a data da coleta para selecionar uma referência.",
    };
  if (age < 18)
    return {
      value: "Consultar referência pediátrica do laudo",
      population: `${age} anos`,
      note: "As faixas adultas não se aplicam automaticamente a crianças e adolescentes.",
    };
  if (key === "hemoglobina") {
    const normalized = sex?.toLowerCase();
    const female = normalized === "feminino";
    const male = normalized === "masculino";
    if (!female && !male)
      return {
        value: "Consultar intervalo no laudo",
        population: "Pessoa adulta · sexo de referência não informado",
        note: "Este parâmetro depende também do sexo de referência utilizado pelo laboratório.",
      };
    return {
      value: female ? "11,6 a 15,0 g/dL" : "13,2 a 16,6 g/dL",
      population: female ? "Adultos · referência feminina" : "Adultos · referência masculina",
      note: "Faixa publicada para adultos. Gestação e o método do laboratório podem exigir outro intervalo; confirme no laudo.",
      sourceName: "Mayo Clinic Laboratories",
      sourceUrl: "https://www.mayocliniclabs.com/test-catalog/Overview/801417",
    };
  }
  if (key === "glicemia")
    return {
      value: "Menor que 100 mg/dL, em jejum",
      population: "Critério para glicemia em jejum",
      note: "Exige pelo menos 8 horas de jejum. O jejum não está informado neste histórico, então este limite não classifica seu resultado.",
      sourceName: "American Diabetes Association",
      sourceUrl: "https://diabetes.org/about-diabetes/diagnosis",
    };
  if (key === "vitaminaD")
    return {
      value:
        age > 65 ? "Acima de 30 ng/mL · parâmetro para idosos" : "20 a 60 ng/mL · população geral",
      population: age > 65 ? "Idade acima de 65 anos" : "Adultos até 65 anos · população geral",
      note: "Parâmetro SBEM/SBPC, não intervalo do seu laboratório. Gestação, doenças e outros grupos de risco podem mudar a referência; esse contexto ainda não está informado.",
      sourceName: "SBEM/SBPC · posicionamento de 2020",
      sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/32813765/",
    };
  return {
    value: "Meta individual definida pelo médico",
    population: "Colesterol LDL · depende do risco cardiovascular",
    note: "A idade isolada não define a meta de LDL. O médico considera histórico, doenças e risco cardiovascular antes de escolher o valor desejável.",
    sourceName: "ACC/AHA · diretriz de 2026",
    sourceUrl:
      "https://www.acc.org/About-ACC/Press-Releases/2026/03/13/18/01/ACCAHA-Issue-UpDated-Guideline-for-Managing-Lipids-Cholesterol",
  };
}
