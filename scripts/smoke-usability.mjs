import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
const base = process.env.INOVA_TEST_URL ?? "http://192.168.0.2:8080";
const targets = await fetch("http://127.0.0.1:9222/json/list").then((response) => response.json());
const target = targets.find((item) => item.type === "page");
if (!target) throw new Error("Start headless Chrome on port 9222");
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve) => ws.addEventListener("open", resolve, { once: true }));
let counter = 0;
const pending = new Map();
const errors = [];
ws.addEventListener("message", ({ data }) => {
  const result = JSON.parse(String(data));
  if (result.id) {
    const item = pending.get(result.id);
    pending.delete(result.id);
    if (result.error) item?.reject(new Error(result.error.message));
    else item?.resolve(result.result);
  }
  if (result.method === "Runtime.exceptionThrown")
    errors.push(
      result.params.exceptionDetails.exception?.description ?? result.params.exceptionDetails.text,
    );
});
const command = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = ++counter;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
async function evaluate(expression) {
  const result = await command("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
    userGesture: true,
  });
  if (result.exceptionDetails)
    throw new Error(result.exceptionDetails.exception?.description ?? "Evaluation failed");
  return result.result.value;
}
async function wait(expression) {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (await evaluate(`Boolean(${expression})`)) return;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error("Timed out: " + expression);
}
async function fill(selector, value) {
  await wait(
    `Object.keys(document.querySelector(${JSON.stringify(selector)}) || {}).some(key=>key.startsWith('__reactProps'))`,
  );
  await evaluate(
    `(()=>{const input=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(input.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(input,${JSON.stringify(value)});input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));})()`,
  );
}
async function click(label) {
  await wait(
    `[...document.querySelectorAll('button')].some(b=>b.textContent.trim()===${JSON.stringify(label)} && !b.disabled)`,
  );
  await evaluate(
    `(()=>{const button=[...document.querySelectorAll('button')].find(item=>item.textContent.trim()===${JSON.stringify(label)});if(!button)throw new Error('Missing button');button.click();})()`,
  );
}
async function navigate(path, selector) {
  await command("Page.navigate", { url: base + path });
  await wait(
    `location.pathname===${JSON.stringify(path)} && document.querySelector(${JSON.stringify(selector)})`,
  );
  await wait(
    `Object.keys(document.querySelector(${JSON.stringify(selector)}) || {}).some(key=>key.startsWith('__reactProps'))`,
  );
}

await command("Page.enable");
await command("Runtime.enable");
const token = "usability-" + Date.now();
let backupKey = "";
let preferences;
let testOrderId;
try {
  await navigate("/acesso-paciente", "#patient-email");
  preferences = await evaluate('localStorage.getItem("inova-patient-accessibility")');
  backupKey = "smoke-backup-" + token;
  await evaluate(
    `(async()=>{const {patientDraft}=await import('/src/lib/patient-draft.ts');const existing=await patientDraft('mariana-oliveira','read');if(existing)await patientDraft(${JSON.stringify(backupKey)},'save',existing.value);await patientDraft('mariana-oliveira','remove');})()`,
  );
  await click("Explorar demonstração gratuita");
  await wait('location.pathname==="/portal-paciente" && document.querySelector("nav")');
  await click("Preparar consulta");
  await fill("#symptoms", token);
  const audioTree = await command("DOM.getDocument");
  const audioInput = await command("DOM.querySelector", {
    nodeId: audioTree.root.nodeId,
    selector: 'input[accept^="audio/"]',
  });
  await command("DOM.setFileInputFiles", {
    nodeId: audioInput.nodeId,
    files: [
      new URL("../artifacts/test-recorded-audio.webm", import.meta.url).pathname.replace(
        /^\/(\w:)/,
        "$1",
      ),
    ],
  });
  await wait(`document.querySelector('[aria-label="Ouvir áudio: Como você tem se sentido?"]')`);
  await evaluate(
    `(async()=>{const response=await fetch('/examples/laudo-laboratorial-ficticio.pdf');const transfer=new DataTransfer();transfer.items.add(new File([await response.blob()], 'Usability-ficticio.pdf', {type:'application/pdf'}));const input=document.querySelector('[aria-label="Adicionar laudo à preparação"]');input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));})()`,
  );
  await wait('document.querySelector("main").textContent.includes("Usability-ficticio.pdf")');
  await wait(
    `document.querySelector('[aria-label="Rascunho da preparação"]').textContent.includes("Rascunho salvo neste navegador")`,
  );
  await new Promise((resolve) => setTimeout(resolve, 500));
  await command("Page.reload", {});
  await new Promise((resolve) => setTimeout(resolve, 500));
  await wait('document.querySelector("nav")');
  await click("Preparar consulta");
  await wait(`document.querySelector('#symptoms')?.value===${JSON.stringify(token)}`);
  assert.equal(
    await evaluate('document.querySelector("main").textContent.includes("Usability-ficticio.pdf")'),
    true,
  );
  await wait(
    `document.querySelector('[aria-label="Ouvir áudio: Como você tem se sentido?"]')?.src.startsWith('blob:')`,
  );
  console.log("PASS: text, completed audio and PDF drafts survive a full reload");
  await fill("#patient-unified-search", "Usability-ficticio");
  await wait(
    `document.querySelector('[aria-label="Busca no espaço do paciente"]').textContent.includes("Usability-ficticio.pdf")`,
  );
  await evaluate(
    `document.querySelector('[aria-label="Busca no espaço do paciente"] button').click()`,
  );
  await wait('document.querySelector("h1").textContent==="Meus documentos"');
  await evaluate('document.querySelector("details input").click()');
  await wait('document.querySelector(".patient-large-text")');
  await evaluate('document.querySelectorAll("details input")[1].click()');
  await wait('document.querySelector(".patient-high-contrast")');
  await command("Page.reload", {});
  await new Promise((resolve) => setTimeout(resolve, 500));
  await wait('document.querySelector(".patient-large-text.patient-high-contrast")');
  await wait(`document.querySelector('nav button')`);
  await command("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  assert.equal(await evaluate("document.documentElement.scrollWidth>innerWidth+2"), false);
  await command("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  });
  console.log(
    "PASS: unified search opens documents; accessibility survives reload and mobile does not overflow",
  );
  await click("Preparar consulta");
  await click("Apagar rascunho deste navegador");
  await click("Cancelar exclusão");
  assert.equal(await evaluate('document.querySelector("#symptoms").value'), token);
  await click("Apagar rascunho deste navegador");
  await click("Confirmar exclusão do rascunho e anexos");
  await wait('document.querySelector("#symptoms").value===""');
  assert.equal(
    await evaluate('document.querySelector("main").textContent.includes("Usability-ficticio.pdf")'),
    false,
  );
  console.log("PASS: draft deletion requires confirmation and clears notes and attachments");
  await navigate("/dashboard", "main button");
  testOrderId = await evaluate(
    `(async()=>{const {createExamOrder}=await import('/src/lib/exam-orders.ts');const order=await createExamOrder({data:{requestId:${JSON.stringify(token)},patientId:'mariana-oliveira',exams:['hemograma'],notes:'Teste fictício da fila'}});return order.id;})()`,
  );
  await wait(`document.querySelector('[aria-label="Fila de trabalho médica"]')`);
  await click("Atualizar fila");
  await wait(
    `document.querySelector('[aria-label="Fila de trabalho médica"] a[href*="Solicitar"]')`,
  );
  await evaluate(
    `document.querySelector('[aria-label="Fila de trabalho médica"] a[href*="Solicitar"]').click()`,
  );
  await wait(`document.querySelector('#search-order-exams')`);
  console.log("PASS: doctor queue opens the pending task directly in the patient record");
  await navigate("/patients/mariana-oliveira", "main button");
  await click("Resumo da consulta");
  await wait(`document.querySelector('[aria-label="Fechamento da consulta"]')`);
  await wait(
    `!document.querySelector('[aria-label="Fechamento da consulta"]').textContent.includes("Conferindo…")`,
  );
  await fill("#closing-plan", "Pendência fictícia " + token);
  await wait(
    `document.querySelector('#closing-plan').value===${JSON.stringify("Pendência fictícia " + token)}`,
  );
  await new Promise((resolve) => setTimeout(resolve, 100));
  await evaluate(
    `[...document.querySelectorAll('[aria-label="Fechamento da consulta"] label')].find(label=>label.textContent.includes('Conferi este resumo')).querySelector('input[type=checkbox]').click()`,
  );
  await click("Registrar fechamento nesta sessão");
  await wait(
    `document.querySelector('[aria-label="Fechamento da consulta"]').textContent.includes("Fechamento registrado" )`,
  );
  await fill("#closing-plan", "Mudança fictícia " + token);
  await wait(
    `document.querySelector('[aria-label="Fechamento da consulta"]').textContent.includes("Houve alterações" )`,
  );
  console.log("PASS: doctor queue loads; closing records a snapshot and detects later edits");
  await click("Envios do paciente");
  await click("Resumo da consulta");
  await wait(
    `document.querySelector('#closing-plan')?.value===${JSON.stringify("Mudança fictícia " + token)}`,
  );
  await wait(
    `document.querySelector('[aria-label="Fechamento da consulta"]').textContent.includes('Fechamento registrado')`,
  );
  console.log("PASS: closing plan and snapshot survive changes between patient tabs");
  await evaluate(
    `(()=>{let fiber=document.querySelector('#closing-plan');fiber=fiber[Object.keys(fiber).find(key=>key.startsWith('__reactFiber'))];while(fiber&&!fiber.memoizedProps?.value?.setReportsByKind)fiber=fiber.return;if(!fiber)throw Error('Context unavailable');const context=fiber.memoizedProps.value;context.setReportsByKind(items=>({...items,Laboratorial:[{id:'identity-test',title:'Laudo fictício para teste de identidade',date:'Exemplo',source:'Teste',demo:false,scope:'Teste fictício',findings:[],limitations:[],analysis:{subjectName:'Pessoa fictícia diferente',pages:1,scope:'Teste fictício',findings:[],limitations:[],observations:[]}}]}));})()`,
  );
  await click("Laudos laboratoriais");
  await wait(`document.querySelector('main').textContent.includes('O nome no laudo difere')`);
  assert.equal(
    await evaluate(
      `[...document.querySelectorAll('button')].find(item=>item.textContent.includes('Marcar síntese como revisada')).disabled`,
    ),
    true,
  );
  await evaluate(
    `[...document.querySelectorAll('label')].find(item=>item.textContent.includes('Conferi a identidade')).querySelector('input').click()`,
  );
  await wait(
    `![...document.querySelectorAll('button')].find(item=>item.textContent.includes('Marcar síntese como revisada')).disabled`,
  );
  console.log(
    "PASS: differing document identity is highlighted and review requires explicit original-document confirmation",
  );
  assert.deepEqual(errors, []);
} finally {
  if (testOrderId)
    await evaluate(
      `(async()=>{const {cancelExamOrder}=await import('/src/lib/exam-orders.ts');await cancelExamOrder({data:{id:${JSON.stringify(testOrderId)}}});})()`,
    );
  if (backupKey)
    await evaluate(
      `(async()=>{const {patientDraft}=await import('/src/lib/patient-draft.ts');const backup=await patientDraft(${JSON.stringify(backupKey)},'read');if(backup)await patientDraft('mariana-oliveira','save',backup.value);else await patientDraft('mariana-oliveira','remove');await patientDraft(${JSON.stringify(backupKey)},'remove');})()`,
    );
  if (preferences !== undefined)
    await evaluate(
      preferences === null
        ? 'localStorage.removeItem("inova-patient-accessibility")'
        : `localStorage.setItem("inova-patient-accessibility",${JSON.stringify(preferences)})`,
    );
  ws.close();
}
