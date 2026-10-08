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
async function doctor() {
  await navigate("/patients/mariana-oliveira", "main button");
  await click("Solicitar exames");
  await wait('document.querySelector("#search-order-exams")');
}
async function patient() {
  await navigate("/acesso-paciente", "#patient-email");
  await evaluate('document.querySelector("form").requestSubmit()');
  await wait('location.pathname==="/portal-paciente" && document.querySelector("nav")');
  await click("Exames solicitados");
  await wait(
    'document.querySelector("main").innerText.includes("Confira os exames que seu médico liberou")',
  );
}
const token = String(Date.now());
const name = "Genetica_ficticia_" + token + ".txt";
async function rawPatient() {
  await patient();
  await click("Minha genética");
  await wait('document.querySelector("[data-genetic-raw-panel]")');
  await wait(
    `!document.querySelector('[data-genetic-raw-panel]').textContent.includes('Carregando genética…')`,
  );
}
async function rawDoctor() {
  await navigate("/patients/mariana-oliveira", "main button");
  await click("Genética");
  await wait('document.querySelector("[data-genetic-raw-panel]")');
}
async function attachRaw(text) {
  await evaluate(
    `(()=>{const transfer=new DataTransfer();transfer.items.add(new File([${JSON.stringify(text)}],${JSON.stringify(name)},{type:'text/plain'}));const input=document.querySelector('[aria-label="Selecionar arquivo genético TXT"]');input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));})()`,
  );
  await evaluate(`document.querySelector('[data-genetic-raw-panel] input[type=checkbox]').click()`);
}
try {
  await command("Page.enable");
  await command("Runtime.enable");
  await command("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await rawPatient();
  errors.length = 0;
  const text = await evaluate(
    `fetch('/examples/23andme-exemplo-ficticio.txt').then(response=>response.text())`,
  );
  const unique = text + "\n# Browser test " + token + "\n";
  await attachRaw(unique);
  await click("Enviar arquivo genético");
  await wait(
    `document.querySelector('[data-raw-record-id]')?.textContent.includes(${JSON.stringify(name)})`,
  );
  const id = await evaluate(`document.querySelector('[data-raw-record-id]').dataset.rawRecordId`);
  const versionCount = await evaluate(
    `document.querySelectorAll('[aria-label="Versão do arquivo genético"] option').length`,
  );
  assert.equal(
    await evaluate(`document.querySelectorAll('[aria-label="Domínios genéticos"] article').length`),
    4,
  );
  assert.equal(
    await evaluate(`document.querySelectorAll('[aria-label="Score não calculado"]').length`),
    4,
  );
  assert.equal(
    await evaluate(`document.querySelector('[data-raw-record-id]').textContent.includes('GRCh37')`),
    true,
  );
  console.log(
    "PASS: patient uploads TXT, four domains have no fabricated score and technical metadata are shown",
  );
  await attachRaw(unique);
  await click("Enviar arquivo genético");
  await wait(
    `document.querySelector('[data-genetic-raw-panel]').textContent.includes('Nenhuma cópia duplicada')`,
  );
  assert.equal(
    await evaluate(
      `document.querySelectorAll('[aria-label="Versão do arquivo genético"] option').length`,
    ),
    versionCount,
  );
  await rawDoctor();
  await wait(`document.querySelector('[data-raw-record-id="${id}"]')`);
  assert.equal(
    await evaluate(
      `[...document.querySelectorAll('button')].find(item=>item.textContent.trim()==='Marcar arquivo genético revisado').disabled`,
    ),
    true,
  );
  await evaluate(`document.querySelector('[data-raw-record-id] input[type=checkbox]').click()`);
  await click("Marcar arquivo genético revisado");
  await wait(
    `document.querySelector('[data-raw-record-id]').textContent.includes('Conferido por Dr. Rafael Mendes')`,
  );
  await click("Resumo da consulta");
  await wait(`document.querySelector('[aria-label="Domínios genéticos"]')`);
  console.log(
    "PASS: physician receives the same file, explicitly reviews association and sees domains on return summary",
  );
  await navigate("/patients/carlos-henrique", "main button");
  await click("Genética");
  await wait(
    `document.querySelector('[data-genetic-raw-panel]')?.textContent.includes('Nenhum arquivo bruto vinculado')`,
  );
  assert.equal(await evaluate(`document.querySelector('[data-raw-record-id]')===null`), true);
  await rawPatient();
  await wait(
    `document.querySelector('[data-raw-record-id="${id}"]')?.textContent.includes('Associação revisada')`,
  );
  await click("Baixar cópia do TXT");
  await wait(
    `document.querySelector('[data-genetic-raw-panel]').textContent.includes('Cópia UTF-8 conferida')`,
  );
  await click("Avisos");
  await wait(
    `document.querySelector('main').textContent.includes('Arquivo genético revisado pelo médico')`,
  );
  await rawPatient();
  await attachRaw("invalid raw file");
  await click("Enviar arquivo genético");
  await wait(`document.querySelector('[data-genetic-raw-panel] [role=alert]')`);
  assert.equal(
    await evaluate(`document.querySelector('[data-raw-record-id]').dataset.rawRecordId`),
    id,
  );
  await command("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  assert.equal(await evaluate("document.documentElement.scrollWidth>innerWidth+2"), false);
  console.log(
    "PASS: persistence after portal reload, patient separation, original download, notifications, atomic rejection and mobile layout",
  );
  await command("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await click("Excluir arquivo genético");
  assert.equal(
    await evaluate(`document.querySelector('[data-raw-record-id]').dataset.rawRecordId`),
    id,
  );
  await click("Confirmar exclusão do arquivo");
  await wait(
    `document.querySelector('[data-genetic-raw-panel]').textContent.includes('Arquivo e metadados excluídos')`,
  );
  await rawDoctor();
  await wait(
    `document.querySelector('[data-genetic-raw-panel]') && !document.querySelector('option[value="${id}"]') && !document.querySelector('[data-genetic-raw-panel]').textContent.includes('Carregando genética')`,
  );
  assert.deepEqual(errors, []);
  console.log("PASS: explicit deletion reaches physician; no browser runtime exceptions");
} finally {
  ws.close();
}
