export type Patient = {
  id: string;
  name: string;
  birth: string;
  cpf: string;
  rg: string;
  exam: string;
  updated: string;
  status: string;
  sex?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
};

export const patients: Patient[] = [
  {
    id: "mariana-oliveira",
    name: "Mariana Oliveira",
    birth: "14/03/1994",
    cpf: "123.456.789-00",
    rg: "42.918.730-5",
    exam: "Hemograma + Bioquímica",
    updated: "18/09/2026",
    status: "Novo resultado",
  },
  {
    id: "carlos-henrique",
    name: "Carlos Henrique Souza",
    birth: "22/08/1981",
    cpf: "284.731.650-12",
    rg: "31.205.874-2",
    exam: "Perfil Lipídico",
    updated: "18/09/2026",
    status: "Novo resultado",
  },
  {
    id: "fernanda-almeida",
    name: "Fernanda Almeida",
    birth: "09/11/1988",
    cpf: "395.604.281-33",
    rg: "28.447.190-8",
    exam: "Hormônios",
    updated: "17/09/2026",
    status: "Disponível",
  },
  {
    id: "joao-martins",
    name: "João Pedro Martins",
    birth: "03/02/1976",
    cpf: "416.928.370-44",
    rg: "19.623.854-1",
    exam: "Check-up",
    updated: "16/09/2026",
    status: "Disponível",
  },
  {
    id: "ana-costa",
    name: "Ana Beatriz Costa",
    birth: "27/06/1999",
    cpf: "527.193.460-55",
    rg: "48.901.267-9",
    exam: "Hemograma",
    updated: "15/09/2026",
    status: "Disponível",
  },
  {
    id: "lucas-ferreira",
    name: "Lucas Ferreira",
    birth: "18/01/1990",
    cpf: "638.204.571-66",
    rg: "35.782.109-4",
    exam: "Bioquímica",
    updated: "14/09/2026",
    status: "Novo resultado",
  },
  {
    id: "juliana-martins",
    name: "Juliana Martins",
    birth: "11/04/1985",
    cpf: "749.315.682-77",
    rg: "26.530.918-7",
    exam: "Perfil Lipídico",
    updated: "12/09/2026",
    status: "Disponível",
  },
  {
    id: "gabriel-santos",
    name: "Gabriel Santos",
    birth: "30/09/1972",
    cpf: "850.426.793-88",
    rg: "17.348.625-3",
    exam: "Check-up",
    updated: "10/09/2026",
    status: "Disponível",
  },
  {
    id: "beatriz-rodrigues",
    name: "Beatriz Rodrigues",
    birth: "07/12/1996",
    cpf: "961.537.804-99",
    rg: "44.219.780-6",
    exam: "Hormônios",
    updated: "08/09/2026",
    status: "Novo resultado",
  },
  {
    id: "rafael-oliveira",
    name: "Rafael Oliveira",
    birth: "25/05/1983",
    cpf: "072.648.915-10",
    rg: "23.674.591-0",
    exam: "Hemograma",
    updated: "05/09/2026",
    status: "Disponível",
  },
];

export const markers = [
  {
    name: "Hemoglobina",
    value: "13,8",
    unit: "g/dL",
    reference: "12,0 – 16,0",
    change: "+0,2",
    tone: "up",
  },
  {
    name: "Glicemia",
    value: "92",
    unit: "mg/dL",
    reference: "70 – 99",
    change: "−6",
    tone: "down",
  },
  {
    name: "Colesterol total",
    value: "184",
    unit: "mg/dL",
    reference: "< 190",
    change: "−17",
    tone: "down",
  },
  { name: "HDL", value: "56", unit: "mg/dL", reference: "> 40", change: "+4", tone: "up" },
  {
    name: "LDL",
    value: "108",
    unit: "mg/dL",
    reference: "Meta individual",
    change: "−16",
    tone: "down",
  },
  {
    name: "Triglicerídeos",
    value: "102",
    unit: "mg/dL",
    reference: "< 150",
    change: "−16",
    tone: "down",
  },
  {
    name: "Ferritina",
    value: "72",
    unit: "ng/mL",
    reference: "13 – 150",
    change: "+3",
    tone: "up",
  },
  {
    name: "TSH",
    value: "2,14",
    unit: "µUI/mL",
    reference: "0,27 – 4,20",
    change: "−0,08",
    tone: "down",
  },
];

export const historyData = [
  { period: "Mar/25", glicemia: 104, ldl: 132, hemoglobina: 13.2, ferritina: 61 },
  { period: "Jun/25", glicemia: 101, ldl: 128, hemoglobina: 13.4, ferritina: 65 },
  { period: "Nov/25", glicemia: 99, ldl: 126, hemoglobina: 13.5, ferritina: 67 },
  { period: "Mar/26", glicemia: 97, ldl: 121, hemoglobina: 13.6, ferritina: 68 },
  { period: "Jun/26", glicemia: 98, ldl: 124, hemoglobina: 13.6, ferritina: 69 },
  { period: "Set/26", glicemia: 92, ldl: 108, hemoglobina: 13.8, ferritina: 72 },
];

export type PatientHistoryRecord = {
  id: string;
  label: string;
  age: number;
  gender: string;
  updatedAt: string;
  summary: {
    hemoglobina: string;
    glicemia: string;
    colesterolLdl: string;
    vitaminaD: string;
  };
  history: Array<{
    period: string;
    glicemia: number;
    ldl: number;
    hemoglobina: number;
    vitaminaD: number;
  }>;
};

export const patientHistoryById: Record<string, PatientHistoryRecord> = {
  "mariana-oliveira": {
    id: "mariana-oliveira",
    label: "Mariana Oliveira",
    age: 32,
    gender: "Feminino",
    updatedAt: "18/09/2026",
    summary: {
      hemoglobina: "13,8 g/dL",
      glicemia: "92 mg/dL",
      colesterolLdl: "108 mg/dL",
      vitaminaD: "34,6 ng/mL",
    },
    history: [
      { period: "Mar/25", glicemia: 104, ldl: 132, hemoglobina: 13.2, vitaminaD: 29.4 },
      { period: "Jun/25", glicemia: 101, ldl: 128, hemoglobina: 13.4, vitaminaD: 30.1 },
      { period: "Nov/25", glicemia: 99, ldl: 126, hemoglobina: 13.5, vitaminaD: 31.5 },
      { period: "Mar/26", glicemia: 97, ldl: 121, hemoglobina: 13.6, vitaminaD: 32.8 },
      { period: "Jun/26", glicemia: 98, ldl: 124, hemoglobina: 13.6, vitaminaD: 33.7 },
      { period: "Set/26", glicemia: 92, ldl: 108, hemoglobina: 13.8, vitaminaD: 34.6 },
    ],
  },
  "carlos-henrique": {
    id: "carlos-henrique",
    label: "Carlos Henrique Souza",
    age: 45,
    gender: "Masculino",
    updatedAt: "18/09/2026",
    summary: {
      hemoglobina: "15,1 g/dL",
      glicemia: "101 mg/dL",
      colesterolLdl: "112 mg/dL",
      vitaminaD: "32,1 ng/mL",
    },
    history: [
      { period: "Mar/25", glicemia: 112, ldl: 146, hemoglobina: 14.6, vitaminaD: 27.4 },
      { period: "Jun/25", glicemia: 108, ldl: 141, hemoglobina: 14.8, vitaminaD: 28.5 },
      { period: "Nov/25", glicemia: 105, ldl: 136, hemoglobina: 14.9, vitaminaD: 29.8 },
      { period: "Mar/26", glicemia: 103, ldl: 124, hemoglobina: 15.0, vitaminaD: 30.7 },
      { period: "Jun/26", glicemia: 102, ldl: 121, hemoglobina: 15.1, vitaminaD: 31.5 },
      { period: "Set/26", glicemia: 101, ldl: 112, hemoglobina: 15.1, vitaminaD: 32.1 },
    ],
  },
};

export type FamilyHistoryEntry = {
  relationship: string;
  condition: string;
  details: string;
};

export const familyHistoryById: Record<string, FamilyHistoryEntry[]> = {
  "mariana-oliveira": [
    {
      relationship: "Mãe",
      condition: "Diabetes tipo 2",
      details: "Relato familiar; idade de início não informada.",
    },
    {
      relationship: "Avô materno",
      condition: "Doença cardiovascular",
      details: "Relato familiar; idade de início não informada.",
    },
  ],
};

export const examGroups = [
  {
    title: "Hematologia",
    items: [
      ["Hemoglobina", "13,8 g/dL", "12,0 – 16,0"],
      ["Hematócrito", "41%", "36 – 46"],
      ["Leucócitos", "7.200/mm³", "4.000 – 11.000"],
      ["Plaquetas", "248.000/mm³", "150.000 – 450.000"],
    ],
  },
  {
    title: "Bioquímica",
    items: [
      ["Glicemia", "92 mg/dL", "70 – 99"],
      ["Creatinina", "0,84 mg/dL", "0,50 – 1,10"],
      ["Ureia", "31 mg/dL", "15 – 45"],
      ["AST / TGO", "22 U/L", "< 32"],
      ["ALT / TGP", "19 U/L", "< 33"],
    ],
  },
  {
    title: "Perfil lipídico",
    items: [
      ["Colesterol total", "184 mg/dL", "< 190"],
      ["HDL", "56 mg/dL", "> 40"],
      ["LDL", "108 mg/dL", "Meta individual"],
      ["Triglicerídeos", "102 mg/dL", "< 150"],
    ],
  },
];
