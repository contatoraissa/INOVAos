import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { toCrossJSON } from "seroval";
import { browserSession } from "./browser-session.mjs";

const base = process.env.INOVA_TEST_URL ?? "http://localhost:8081";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname))
  throw new Error("Enrollment UI checks require a local server.");
const chartId = "90000000-0000-4000-8000-000000000001";
const reportId = "90000000-0000-4000-8000-000000000002";
const doctorId = "90000000-0000-4000-8000-000000000003";
const patientId = "90000000-0000-4000-8000-000000000004";
const fixture = {
  id: chartId,
  name: "Paciente Integração INOVA",
  birth: "1994-03-14",
  cpf: "52998224725",
  email: "patient@example.test",
  phone: "15912345678",
  rg: "RG-Teste",
  sex: "f",
  address: "Rua Demonstrativa, 123",
  notes: "Nota privada do médico",
  linked: true,
  doctorName: "Dra. Teste INOVA",
};
const report = {
  id: reportId,
  filename: "Laudo anterior fictício.pdf",
  kind: "Laboratorial",
  created_at: "2026-10-01T12:00:00Z",
  reviewed_at: "2026-10-01T13:00:00Z",
};
const result = {
  id: 1,
  name: "Colesterol LDL",
  value: "108",
  unit: "mg/dL",
  reference: "Referência do laudo original",
  collection_date: "2026-09-18",
  flag: "sem_classificacao",
  source_page: null,
  report_id: reportId,
};
const guidance = {
  id: "90000000-0000-4000-8000-000000000005",
  patient_id: chartId,
  kind: "guidance",
  status: "published",
  created_at: "2026-10-01T12:00:00Z",
  updated_at: "2026-10-01T12:00:00Z",
  payload: {
    title: "Orientação registrada antes do cadastro",
    text: "Trazer os laudos na próxima consulta.",
    date: "",
    symptoms: "",
    medicines: "",
    questions: "",
    exams: [],
    audios: [],
    documents: [],
    audio: null,
    document: null,
  },
};
const serialize = (result) =>
  JSON.stringify(toCrossJSON({ result, error: undefined, context: {} }, { refs: new Map() }));
const responses = {
  doctor: serialize({
    userId: doctorId,
    email: "doctor@example.test",
    full_name: "Dra. Teste INOVA",
    account_type: "doctor",
    professional_status: "verified",
    subscription: "active",
    canPreview: true,
  }),
  patient: serialize({
    userId: patientId,
    email: fixture.email,
    full_name: fixture.name,
    account_type: "patient",
    professional_status: "not_applicable",
    subscription: null,
    canPreview: false,
  }),
  listPatientRegistrations: serialize([{ ...fixture, linked: false }]),
  synchronizePatientRegistration: serialize([{ ...fixture, notes: undefined }]),
  createMedicalPatient: serialize({ id: chartId, reused: true, linked: false }),
  getMedicalPatient: serialize(fixture),
  listMedicalReports: serialize({ reports: [report], results: [result] }),
  getRealPatientOverview: serialize({
    profile: { name: fixture.name, birth: fixture.birth },
    reports: [report],
    results: [result],
  }),
  listConsultationEntries: serialize([guidance]),
  listAccountNotifications: serialize([]),
};
// Browser responses are simulated only for UI integration; SQL/authorization have separate tests.
// No Supabase signup, real login, email or remote write occurs here.
const injection = `(()=>{const responses=${JSON.stringify(responses)};const original=window.fetch;window.__enrollmentCalls=[];window.fetch=async(input,options)=>{
  const url=typeof input==='string'?input:input.url;
  if(!url.includes('/_serverFn/'))return original(input,options);
  const token=new URL(url,location.origin).pathname.split('/_serverFn/')[1];
  const name=JSON.parse(atob(decodeURIComponent(token).replace(/-/g,'+').replace(/_/g,'/'))).export.split('_createServerFn')[0];
  window.__enrollmentCalls.push(name);
  const role=sessionStorage.getItem('__inova_enrollment_test_role')||'doctor';
  let body=name==='getAccountSession'?responses[role]:responses[name];
  if(name==='signInAccount')body=role==='patient'?${JSON.stringify(serialize({ role: "patient", medicalAccess: false }))}:${JSON.stringify(serialize({ role: "doctor", medicalAccess: true }))};
  if(!body)throw new Error('Unexpected server operation in UI test: '+name);
  return new Response(body,{status:200,headers:{'Content-Type':'application/json','x-tss-serialized':'true'}});
};})();`;
const browser = await browserSession();
const { command, evaluate, wait, click } = browser;
let scriptId;
async function fill(selector, value) {
  await wait(`document.querySelector(${JSON.stringify(selector)})`);
  await evaluate(
    `(()=>{const input=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(input.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(input,${JSON.stringify(value)});input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));})()`,
  );
}
try {
  ({ identifier: scriptId } = await command("Page.addScriptToEvaluateOnNewDocument", {
    source: injection,
  }));
  await command("Page.navigate", { url: base + "/acesso" });
  await wait(
    "document.querySelector('[name=email]') && Object.keys(document.querySelector('[name=email]')).some(key=>key.startsWith('__reactProps'))",
  );
  await fill("[name=email]", "doctor@example.test");
  await fill("[name=password]", "SenhaFicticiaTeste123");
  await evaluate("document.querySelector('form').requestSubmit()");
  await wait("location.pathname==='/patients' && location.search.includes('workspace=account')");
  await wait(`document.body.innerText.includes(${JSON.stringify(fixture.name)})`);
  assert.equal(await evaluate("document.body.innerText.includes('Mariana Oliveira')"), false);
  await evaluate(
    "[...document.querySelectorAll('a')].find(a=>a.textContent.trim()==='Novo paciente' && a.href.includes('workspace=account')).click()",
  );
  await wait("location.pathname==='/patients/new' && document.querySelector('[name=email]')");
  for (const [name, value] of Object.entries({
    name: fixture.name,
    cpf: fixture.cpf,
    birth: fixture.birth,
    email: fixture.email,
    phone: fixture.phone,
    rg: fixture.rg,
    address: fixture.address,
    notes: fixture.notes,
  }))
    await fill(`[name=${name}]`, value);
  await evaluate("document.querySelector('[name=identityConfirmed]').click()");
  await evaluate("document.querySelector('form').requestSubmit()");
  await wait(
    `location.pathname==='/patients/${chartId}' && document.body.innerText.includes('Dados cadastrados')`,
  );
  assert.equal(await evaluate("new URL(location.href).searchParams.get('workspace')"), "account");
  assert.equal(
    await evaluate(`document.body.innerText.includes(${JSON.stringify(fixture.phone)})`),
    true,
  );
  assert.equal(await evaluate("window.__enrollmentCalls.includes('createMedicalPatient')"), true);
  console.log(
    "PASS: existing physician screens save a real enrollment request and open the original chart",
  );
  await evaluate("sessionStorage.setItem('__inova_enrollment_test_role','patient')");
  await command("Page.navigate", { url: base + "/acesso-paciente" });
  await wait(
    "document.querySelector('#patient-email') && Object.keys(document.querySelector('#patient-email')).some(key=>key.startsWith('__reactProps'))",
  );
  await fill("#patient-email", fixture.email);
  await fill("#patient-password", "SenhaFicticiaTeste123");
  await evaluate("document.querySelector('form').requestSubmit()");
  await wait(
    "location.pathname==='/portal-paciente' && location.search.includes('workspace=account')",
  );
  await wait(
    `document.querySelector('h1')?.textContent==='Minha saúde' && document.body.innerText.includes('108')`,
  );
  assert.equal(
    await evaluate("window.__enrollmentCalls.includes('synchronizePatientRegistration')"),
    true,
  );
  assert.equal(await evaluate("document.body.innerText.includes('Mariana Oliveira')"), false);
  await click("Meu perfil");
  await wait(`document.body.innerText.includes(${JSON.stringify(fixture.address)})`);
  assert.equal(
    await evaluate(`document.body.innerText.includes(${JSON.stringify(fixture.phone)})`),
    true,
  );
  assert.equal(
    await evaluate(`document.body.innerText.includes(${JSON.stringify(fixture.cpf)})`),
    true,
  );
  assert.equal(
    await evaluate(`document.body.innerText.includes(${JSON.stringify(fixture.notes)})`),
    false,
  );
  await click("Meus resultados");
  await wait("document.querySelector('table')?.textContent.includes('108')");
  await click("Orientações do médico");
  await wait("document.body.innerText.includes('Trazer os laudos na próxima consulta.')");
  await click("Meus documentos");
  await wait(`document.body.innerText.includes(${JSON.stringify(report.filename)})`);
  console.log(
    "PASS: patient portal inherits contact details, released results, guidance and prior PDF without private physician notes",
  );
  await click("Minha saúde");
  await command("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await new Promise((resolve) => setTimeout(resolve, 300));
  mkdirSync("artifacts/enrollment", { recursive: true });
  const screenshot = await command("Page.captureScreenshot", { format: "png" });
  writeFileSync("artifacts/enrollment/patient-account.png", Buffer.from(screenshot.data, "base64"));
  await command("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  assert.equal(await evaluate("document.documentElement.scrollWidth>innerWidth+2"), false);
  console.log("PASS: actual patient layout remains responsive");
  assert.deepEqual(browser.exceptions, []);
} finally {
  if (scriptId) await command("Page.removeScriptToEvaluateOnNewDocument", { identifier: scriptId });
  await evaluate("sessionStorage.removeItem('__inova_enrollment_test_role')").catch(() => {});
  await command("Emulation.clearDeviceMetricsOverride");
  await command("Page.navigate", { url: base + "/dashboard" });
  await wait("document.querySelector('h1')");
  browser.close();
}
