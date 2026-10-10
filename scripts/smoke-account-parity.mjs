import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { toCrossJSON } from "seroval";
import { browserSession } from "./browser-session.mjs";

// Synthetic account responses: UI integration only. No real login, DB write or AI request.
const base = process.env.INOVA_TEST_URL ?? "http://localhost:8081";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname))
  throw new Error("Local server required.");
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
      reports,
      results,
    },
    listConsultationEntries: entries,
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
const injection = `(()=>{const responses=${JSON.stringify(responses)}; const original=window.fetch;window.__parityCalls=[];window.__parityUnexpected=[];
window.fetch=async(input,options={})=>{const url=typeof input==='string'?input:input.url;if(!url.includes('/_serverFn/'))return original(input,options);
const token=new URL(url,location.origin).pathname.split('/_serverFn/')[1];const name=JSON.parse(atob(decodeURIComponent(token).replace(/-/g,'+').replace(/_/g,'/'))).export.split('_createServerFn')[0];
window.__parityCalls.push({name,body:options.body||url});const role=sessionStorage.getItem('__parityRole')||'doctor';let value=responses[name];
if(name==='getAccountSession')value=responses[role];
if(name==='getWorkspacePreference')value=responses[sessionStorage.getItem('__parityPref_'+(role==='patient'?'patient':location.pathname==='/doctors'?'profile':'settings'))]||responses.getWorkspacePreference;
if(name==='saveWorkspacePreference'){const kind=role==='patient'?'patient':location.pathname==='/doctors'?'profile':'settings';sessionStorage.setItem('__parityPref_'+kind,kind==='patient'?'savedPatient':kind==='profile'?'savedProfile':'savedSettings');}
if(name==='saveConsultationEntry')sessionStorage.setItem('__parityPrep','1');
if(name==='listConsultationEntries'&&sessionStorage.getItem('__parityPrep'))value=responses.withPrep;
if(name==='listAccountNotifications'&&role==='doctor'&&sessionStorage.getItem('__parityPrep'))value=responses.notices;
if(name==='createRealAgendaEvent')sessionStorage.setItem('__parityAgenda','proposed');
if(name==='transitionRealAgendaEvent')sessionStorage.setItem('__parityAgenda',role==='doctor'?'confirmed':'cancelled');
if(name==='listRealAgenda')value=responses[sessionStorage.getItem('__parityAgenda')]||responses.listRealAgenda;
if(!value){window.__parityUnexpected.push(name);throw new Error('Unexpected RPC: '+name);}
return new Response(value,{status:200,headers:{'Content-Type':'application/json','x-tss-serialized':'true'}});};})();`;
const b = await browserSession();
const { command, evaluate, wait, click } = b;
const pause = () => new Promise((r) => setTimeout(r, 200));
async function navigate(path) {
  await command("Page.navigate", { url: base + path });
  await wait(
    "document.querySelector('h1') && !document.body.innerText.includes('Abrindo sua conta')",
  );
  await wait("Object.keys(document.querySelector('h1')||{}).some(k=>k.startsWith('__reactProps'))");
}
async function fill(selector, value) {
  await wait(`document.querySelector(${JSON.stringify(selector)})`);
  await evaluate(
    `(()=>{const input=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(input.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(input,${JSON.stringify(value)});input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));})()`,
  );
  await pause();
}
async function noDemo() {
  assert.equal(
    await evaluate(
      "/Mariana Oliveira|Rafael Mendes|Carlos Henrique Souza/.test(document.body.innerText)",
    ),
    false,
  );
  assert.deepEqual(await evaluate("window.__parityUnexpected"), []);
}
async function screenshot(name) {
  mkdirSync("artifacts/account-parity", { recursive: true });
  const s = await command("Page.captureScreenshot", { format: "png" });
  writeFileSync("artifacts/account-parity/" + name + ".png", Buffer.from(s.data, "base64"));
}
let script;
try {
  ({ identifier: script } = await command("Page.addScriptToEvaluateOnNewDocument", {
    source: injection,
  }));
  await command("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  });
  const paths = [
    "dashboard",
    "agenda",
    "patients",
    "patients/new",
    "results",
    "history",
    "comparison",
    "doctors",
    "follow-up",
    "indicators",
    "settings",
  ];
  for (const path of paths) {
    await navigate("/" + path + "?workspace=account");
    await pause();
    await noDemo();
    assert.equal(await evaluate("document.querySelectorAll('aside nav a').length"), 11);
    assert.equal(
      await evaluate(
        "[...document.querySelectorAll('aside nav a')].every(a=>new URL(a.href).searchParams.get('workspace')==='account')",
      ),
      true,
    );
    console.log("PASS real doctor route: " + path);
  }
  await navigate("/patients/" + chart + "?workspace=account");
  await wait("document.body.innerText.includes('Dados cadastrados')");
  const tabs = [
    "Resumo da consulta",
    "Envios do paciente",
    "Solicitar exames",
    "Orientações ao paciente",
    "Visão geral",
    "Resultados",
    "Histórico",
    "Comparação",
    "Histórico familiar",
    "Laudos laboratoriais",
    "Genética",
    "Genômica",
    "Documentos",
  ];
  for (const tab of tabs) {
    await click(tab);
    await pause();
    await noDemo();
  }
  console.log("PASS all 13 real medical patient tabs");
  await click("Resumo da consulta");
  await wait("document.querySelector('#account-closing-plan')");
  await fill("#account-closing-plan", "Conferir resultado no retorno.");
  await evaluate(
    "[...document.querySelectorAll('[aria-label=\"Fechamento da consulta\"] label')].find(l=>l.textContent.includes('Conferi este resumo')).querySelector('input[type=checkbox]').click()",
  );
  await click("Registrar fechamento nesta sessão");
  await wait("document.querySelector('[aria-label=\"Fechamento da consulta\"] pre')");
  await screenshot("doctor-chart");
  await navigate("/settings?workspace=account");
  await wait("!document.querySelector('fieldset').disabled");
  await evaluate("document.querySelector('#settings-results').click()");
  await click("Salvar alterações");
  await wait("document.body.innerText.includes('Alterações salvas na sua conta.')");
  await navigate("/settings?workspace=account");
  await wait("document.querySelector('#settings-results').getAttribute('aria-checked')==='false'");
  console.log("PASS real settings persist through account API, not demo localStorage");
  await evaluate("sessionStorage.setItem('__parityRole','patient')");
  await navigate("/portal-paciente?workspace=account");
  await wait("document.querySelector('h1').textContent==='Minha saúde'");
  const labels = [
    "Minha saúde",
    "Minha agenda",
    "Próximos passos",
    "Avisos",
    "Meus resultados",
    "Exames solicitados",
    "Minha evolução",
    "Meus documentos",
    "Minha genética",
    "Preparar consulta",
    "Orientações do médico",
    "Preparo dos exames",
    "Laboratórios favoritos",
    "Linha do tempo",
    "Meu perfil",
  ];
  for (const label of labels) {
    await click(label);
    await wait(`document.querySelector('h1').textContent===${JSON.stringify(label)}`);
    await pause();
    await noDemo();
    assert.equal(
      await evaluate("document.body.innerText.includes('Nota privada de paridade')"),
      false,
    );
  }
  console.log("PASS all 15 real patient sections without demo records or private physician notes");
  await click("Minha agenda");
  await wait(
    "[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Adicionar evento'&&!b.disabled)",
  );
  await click("Adicionar evento");
  await fill("#agenda-title", agenda.title);
  await fill("#agenda-date", agenda.date);
  await click("Salvar evento");
  await wait(
    `document.querySelector('[data-agenda-event="${agenda.id}"]')?.textContent.includes('Proposto')`,
  );
  await evaluate("sessionStorage.setItem('__parityRole','doctor')");
  await navigate("/agenda?workspace=account");
  await wait(`document.querySelector('[data-agenda-event="${agenda.id}"]')`);
  await evaluate(`document.querySelector('[data-agenda-event="${agenda.id}"] button').click()`);
  await wait(
    `document.querySelector('[data-agenda-event="${agenda.id}"]')?.textContent.includes('Confirmado')`,
  );
  await screenshot("doctor-agenda");
  await evaluate("sessionStorage.setItem('__parityRole','patient')");
  await navigate("/portal-paciente?workspace=account");
  await click("Minha agenda");
  await wait(
    `document.querySelector('[data-agenda-event="${agenda.id}"]')?.textContent.includes('Confirmado')`,
  );
  await evaluate(`document.querySelector('[data-agenda-event="${agenda.id}"] button').click()`);
  await wait("document.querySelector('#agenda-cancel-reason')");
  await click("Confirmar cancelamento");
  await wait(
    `document.querySelector('[data-agenda-event="${agenda.id}"]')?.textContent.includes('Cancelado')`,
  );
  console.log(
    "PASS shared real calendar: patient proposal, physician confirmation, patient cancellation retains reason",
  );
  await click("Laboratórios favoritos");
  await fill("[name=name]", "Laboratório de Teste");
  await fill("[name=address]", "Rua Teste, 10");
  await fill("[name=phone]", "1533334444");
  await click("Adicionar favorito");
  await wait(
    "document.body.innerText.includes('Laboratório de Teste') && document.body.innerText.includes('Remover favorito')",
  );
  await click("Preparar consulta");
  await wait(
    "document.querySelector('textarea') && !document.querySelector('main fieldset').disabled",
  );
  await fill("textarea", prep.payload.symptoms);
  await wait("document.body.innerText.includes('Rascunho salvo neste dispositivo')");
  await click("Meus documentos");
  await wait(
    "document.querySelector('input[type=file]') && !document.querySelector('input[type=file]').disabled",
  );
  await evaluate(
    `(()=>{const input=[...document.querySelectorAll('input[type=file]')].find(i=>i.accept.includes('pdf'));const transfer=new DataTransfer();transfer.items.add(new File(['%PDF-1.4\\n%%EOF'],'Laudo de teste.pdf',{type:'application/pdf'}));input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));})()`,
  );
  await wait(
    "document.querySelector('iframe') && document.body.innerText.includes('Laudo de teste.pdf')",
  );
  await click("Enviar junto da preparação →");
  await wait(
    "document.querySelector('h1').textContent==='Preparar consulta' && document.body.innerText.includes('Abrir PDF: Laudo de teste.pdf')",
  );
  assert.equal(await evaluate("document.querySelector('textarea').value"), prep.payload.symptoms);
  assert.equal(
    await evaluate("window.__parityCalls.some(c=>c.name==='saveConsultationEntry')"),
    false,
  );
  await evaluate(
    "[...document.querySelectorAll('main label')].find(l=>l.textContent.includes('Revisei o texto')).querySelector('input[type=checkbox]').click()",
  );
  await click("Revisar antes de enviar");
  await wait("document.querySelector('[role=dialog]')");
  await click("Enviar preparação ao médico");
  await wait("document.body.innerText.includes('Preparação enviada ao médico.')");
  const call = await evaluate(
    "window.__parityCalls.find(c=>c.name==='saveConsultationEntry').body",
  );
  assert.ok(call.includes(chart));
  assert.ok(call.includes("Laudo de teste.pdf"));
  assert.ok(call.includes(prep.payload.symptoms));
  await evaluate("sessionStorage.setItem('__parityRole','doctor')");
  await navigate("/dashboard?workspace=account");
  await wait("document.querySelector('button[aria-label^=\"Avisos:\"]')");
  await evaluate("document.querySelector('button[aria-label^=\"Avisos:\"]').click()");
  await wait("document.body.innerText.includes('Preparação recebida da conta vinculada')");
  await evaluate(
    "[...document.querySelectorAll('a')].find(a=>a.textContent.trim()==='Abrir prontuário').click()",
  );
  await wait(
    "location.hash.includes('Envios') && document.body.innerText.includes('Mensagem de integração para o médico')",
  );
  console.log(
    "PASS patient message + PDF sent only after confirmation, physician bell opens the own submission",
  );
  await evaluate("sessionStorage.setItem('__parityRole','patient')");
  await navigate("/portal-paciente?workspace=account");
  await wait("document.body.innerText.includes('13,2')");
  await screenshot("patient-home");
  await command("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await pause();
  assert.equal(await evaluate("document.documentElement.scrollWidth>innerWidth+2"), false);
  await screenshot("patient-mobile");
  await evaluate("sessionStorage.setItem('__parityRole','doctor')");
  await navigate("/dashboard?workspace=account");
  await pause();
  assert.equal(await evaluate("document.documentElement.scrollWidth>innerWidth+2"), false);
  assert.deepEqual(b.exceptions, []);
  console.log("PASS mobile layouts and no uncaught browser exceptions");
} finally {
  await evaluate(
    `(async()=>{const {patientDraft}=await import('/src/lib/patient-draft.ts');for(const kind of ['documents','preparation'])await patientDraft('real:${patient}:${chart}:'+kind,'remove');})()`,
  ).catch(() => {});
  if (script) await command("Page.removeScriptToEvaluateOnNewDocument", { identifier: script });
  await evaluate(
    "Object.keys(sessionStorage).filter(k=>k.startsWith('__parity')).forEach(k=>sessionStorage.removeItem(k))",
  ).catch(() => {});
  await command("Emulation.clearDeviceMetricsOverride");
  await command("Page.navigate", { url: base + "/dashboard" });
  b.close();
}
