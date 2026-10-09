import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
const base = process.env.INOVA_TEST_URL ?? "http://localhost:8080";
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
try {
  await navigate("/dashboard", "main");
  await wait(
    "document.querySelector('[aria-label=\"Fila de trabalho médica\"]')?.textContent.includes('Envio aguardando revisão')",
  );
  assert.equal(
    await evaluate(
      "document.querySelector('main').textContent.includes('Não foi possível carregar a fila')",
    ),
    false,
  );
  await wait(
    "document.querySelector('button[aria-label^=\"Notificações:\"]').textContent.trim()!==''",
  );
  await navigate("/acesso-paciente", "button");
  await evaluate("sessionStorage.setItem('inova-patient-demo','mariana-oliveira')");
  await navigate("/portal-paciente", "button");
  await click("Minha genética");
  await wait(
    "document.querySelector('[data-genetic-raw-panel]') && !document.querySelector('[data-genetic-raw-panel]').textContent.includes('Carregando genética')",
  );
  assert.equal(
    await evaluate(
      "document.querySelector('[data-genetic-raw-panel] [role=alert]')?.textContent ?? ''",
    ),
    "",
  );
  await click("Avisos");
  await wait("document.querySelector('main').textContent.includes('Sua preparação foi recebida')");
  await navigate("/dashboard", "main");
  console.log(
    "PASS: LAN 8081 physician queue and bell, genetics without server error, patient receipt notice.",
  );
} finally {
  ws.close();
}
