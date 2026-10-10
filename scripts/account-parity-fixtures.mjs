import { toCrossJSON } from "seroval";
const chart = "91000000-0000-4000-8000-000000000001";
const doctor = "91000000-0000-4000-8000-000000000002";
const patient = "91000000-0000-4000-8000-000000000003";
const reportId = "91000000-0000-4000-8000-000000000004";
const orderId = "91000000-0000-4000-8000-000000000005";
const registration = {
  id: chart,
  name: "Paciente Paridade INOVA",
  birth: "1994-03-14",
  cpf: "52998224725",
  email: "patient@example.test",
  phone: "15912345678",
  rg: "RG-Teste",
  sex: "f",
  address: "Rua de Teste, 123",
  notes: "Nota privada de paridade",
  linked: true,
  doctorName: "Dra. Paridade INOVA",
};
const profile = {
  name: registration.doctorName,
  crm: "123456/SP",
  specialty: "Clínica médica",
  email: "doctor@example.test",
  phone: "15911223344",
  clinic: "Consultório de Teste",
  address: "Rua Teste, 45",
};
const settings = {
  results: true,
  preparations: true,
  returns: true,
  frequency: "immediate",
  textSize: "normal",
  contrast: false,
  period: "all",
  pendingOnly: false,
};
const patientPreference = {
  phone: "15977778888",
  email: registration.email,
  favorites: [{ name: "Laboratório de Teste", address: "Rua Teste, 10", phone: "1533334444" }],
};
const payload = {
  title: "Pedido de teste",
  text: "Conferir os resultados na consulta.",
  date: "",
  symptoms: "",
  medicines: "",
  questions: "",
  exams: [],
  audios: [],
  documents: [],
  audio: null,
  document: null,
  category: "Próximos passos",
  sourceName: "",
  sourceUrl: "",
  sourceDate: "",
  orderId: null,
};
const entry = (id, kind, values = {}) => ({
  id,
  patient_id: chart,
  kind,
  status: "published",
  created_at: "2026-10-10T12:00:00Z",
  updated_at: "2026-10-10T12:00:00Z",
  payload: { ...payload, ...values },
});
const entries = [
  entry(orderId, "order", { title: "Pedido de acompanhamento", exams: ["Hemograma", "Glicemia"] }),
  entry("91000000-0000-4000-8000-000000000006", "guidance", {
    title: "Preparo informado pelo laboratório",
    category: "Preparo dos exames",
    sourceName: "Laboratório de Teste",
    sourceUrl: "https://example.test/preparo",
    sourceDate: "2026-10-01",
    orderId,
  }),
];
const prep = entry("91000000-0000-4000-8000-000000000007", "preparation", {
  title: "Preparação para consulta",
  symptoms: "Mensagem de integração para o médico",
  documents: [
    { name: "Laudo de teste.pdf", data: Buffer.from("%PDF-1.4\n%%EOF").toString("base64") },
  ],
});
const reports = [
  {
    id: reportId,
    patient_id: chart,
    filename: "Laudo próprio.pdf",
    kind: "Laboratorial",
    created_at: "2026-10-10T12:00:00Z",
    reviewed_at: "2026-10-10T13:00:00Z",
    summary: null,
  },
];
const results = [
  {
    id: 1,
    patient_id: chart,
    name: "Hemoglobina",
    value: "12,5",
    unit: "g/dL",
    reference: "Referência do original",
    collection_date: "2026-09-01",
    flag: "sem_classificacao",
    source_page: 1,
    report_id: reportId,
  },
  {
    id: 2,
    patient_id: chart,
    name: "Hemoglobina",
    value: "13,2",
    unit: "g/dL",
    reference: "Referência do original",
    collection_date: "2026-10-01",
    flag: "sem_classificacao",
    source_page: 1,
    report_id: reportId,
  },
];
// Rich synthetic chart for comparing content and controls, without reading remote patient data.
for (const [offset,name,value,unit,reference] of [
  [10,"Glicemia","92","mg/dL","Referência do laboratório"],
  [20,"Colesterol LDL","108","mg/dL","Meta individual informada no original"],
  [30,"Vitamina D","34,6","ng/mL","Referência do laboratório"],
  [40,"Teste qualitativo","Não reagente","","Resultado qualitativo"],
]) {
  results.push(...["2026-09-01","2026-10-01"].map((date,index)=>({
    ...results[index],id:offset+index,name,value,unit,reference,collection_date:date,
    flag:name==="Colesterol LDL"?"reportado_alterado":"sem_classificacao",
  })));
}
reports[0].summary = {
  subjectName: registration.name, pages: 2,
  scope: "Síntese sintética para testar a conferência do documento.",
  findings: [{title:"Marcador no original",text:"Valor transcrito para revisão.",page:1,quote:"Hemoglobina 13,2 g/dL"}],
  limitations: [{title:"Limitação da leitura",text:"Conferir identificação e coleta.",page:2,quote:"Data da coleta: 01/10/2026"}],
  observations: [{name:"Hemoglobina",value:"13,2",unit:"g/dL",reference:"Referência do original",collection:"01/10/2026",flag:"sem_classificacao",page:1,quote:"Hemoglobina 13,2 g/dL"}],
};
reports.push(...["Genética","Genômica"].map((kind,index)=>({
  ...reports[0],id:"91000000-0000-4000-8000-00000000001"+index,
  filename:"Laudo "+kind+" próprio.pdf",kind,reviewed_at:null,
})));
entries.push(
  entry("91000000-0000-4000-8000-000000000012","guidance",{title:"Orientação para a consulta",text:"Traga os resultados originais para revisão."}),
  entry("91000000-0000-4000-8000-000000000013","family",{title:"Histórico familiar registrado",text:"Contexto informado para conferência médica."}),
  entry("91000000-0000-4000-8000-000000000014","return",{title:"Retorno de acompanhamento",date:"2026-11-10"}),
  prep,
);
const agenda = {
  id: "91000000-0000-4000-8000-000000000008",
  patientId: chart,
  audience: "patient",
  title: "Consulta proposta na conta real",
  kind: "Consulta",
  date: "2026-10-20",
  time: "09:30",
  status: "Proposto",
  notes: "Conferir guia",
  reason: "",
  createdAt: "2026-10-10T12:00:00Z",
  updatedAt: "2026-10-10T12:00:00Z",
};
const notice = {
  id: "91000000-0000-4000-8000-000000000009",
  patient_id: chart,
  title: "Preparação recebida da conta vinculada",
  event: "preparation_received",
  created_at: "2026-10-10T12:00:00Z",
  read_at: null,
};
const serialize = (result) =>
  JSON.stringify(toCrossJSON({ result, error: undefined, context: {} }, { refs: new Map() }));
const responses = Object.fromEntries(
  Object.entries({
    doctor: {
      userId: doctor,
      email: profile.email,
      full_name: profile.name,
      account_type: "doctor",
      professional_status: "verified",
      subscription: "active",
      canPreview: true,
    },
    patient: {
      userId: patient,
      email: registration.email,
      full_name: registration.name,
      account_type: "patient",
      canPreview: false,
    },
    listPatientRegistrations: [registration],
    synchronizePatientRegistration: [{ ...registration, notes: undefined }],
    getMedicalPatient: registration,
    listMedicalReports: { reports, results },
    listMedicalExamOverview: { reports, results },
    getRealPatientOverview: {
      profile: { name: registration.name, birth: registration.birth },
      reports: reports.filter(r=>r.reviewed_at),
      results,
    },
    listConsultationEntries: entries,
    patientEntries: entries.filter(e=>e.kind!=="family"),
    withPrep: [...entries, prep],
    getRealDoctorWork: [],
    getWorkspacePreference: null,
    getDoctorProfileDefaults: profile,
    savedProfile: profile,
    savedSettings: { ...settings, results: false },
    savedPatient: patientPreference,
    listRealGenetics: [],
    getRealAiStatus: { available: false, model: null, message: "IA não conectada neste teste." },
    getRealAgendaBriefingContext: { date: "2026-10-10", mode: "day", patients: [] },
    listRealAgenda: [],
    proposed: [agenda],
    confirmed: [{ ...agenda, status: "Confirmado" }],
    cancelled: [{ ...agenda, status: "Cancelado", reason: "Guia do convênio ainda não emitida" }],
    createRealAgendaEvent: agenda,
    transitionRealAgendaEvent: agenda,
    saveWorkspacePreference: null,
    saveConsultationEntry: { id: prep.id },
    notices: [notice],
    listAccountNotifications: [],
    readAccountNotifications: null,
    openMedicalReport: { url: "about:blank" },
  }).map(([name, value]) => [name, serialize(value)]),
);
export const injection = `(()=>{const responses=${JSON.stringify(responses)}; const original=window.fetch;window.__parityCalls=[];window.__parityUnexpected=[];
window.fetch=async(input,options={})=>{const url=typeof input==='string'?input:input.url;if(!location.search.includes('workspace=account')||!url.includes('/_serverFn/'))return original(input,options);
const token=new URL(url,location.origin).pathname.split('/_serverFn/')[1];const name=JSON.parse(atob(decodeURIComponent(token).replace(/-/g,'+').replace(/_/g,'/'))).export.split('_createServerFn')[0];
window.__parityCalls.push({name,body:options.body||url});const role=sessionStorage.getItem('__parityRole')||'doctor';let value=responses[name];
if(name==='getAccountSession')value=responses[role];
if(name==='getWorkspacePreference')value=responses[sessionStorage.getItem('__parityPref_'+(role==='patient'?'patient':location.pathname==='/doctors'?'profile':'settings'))]||responses.getWorkspacePreference;
if(name==='saveWorkspacePreference'){const kind=role==='patient'?'patient':location.pathname==='/doctors'?'profile':'settings';sessionStorage.setItem('__parityPref_'+kind,kind==='patient'?'savedPatient':kind==='profile'?'savedProfile':'savedSettings');}
if(name==='saveConsultationEntry')sessionStorage.setItem('__parityPrep','1');
if(name==='listConsultationEntries'&&sessionStorage.getItem('__parityPrep'))value=responses.withPrep;
if(name==='listConsultationEntries'&&role==='patient')value=responses.patientEntries;
if(name==='listAccountNotifications'&&role==='doctor'&&sessionStorage.getItem('__parityPrep'))value=responses.notices;
if(name==='createRealAgendaEvent')sessionStorage.setItem('__parityAgenda','proposed');
if(name==='transitionRealAgendaEvent')sessionStorage.setItem('__parityAgenda',role==='doctor'?'confirmed':'cancelled');
if(name==='listRealAgenda')value=responses[sessionStorage.getItem('__parityAgenda')]||responses.listRealAgenda;
if(!value){window.__parityUnexpected.push(name);throw new Error('Unexpected RPC: '+name);}
return new Response(value,{status:200,headers:{'Content-Type':'application/json','x-tss-serialized':'true'}});};})();`;

export {chart, doctor, patient, registration, profile, reports, results, prep, entries};
