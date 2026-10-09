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
  await command("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1050,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await navigate("/agenda", "main");
  assert.equal(
    await evaluate("document.querySelectorAll('[aria-label=\"Calendário mensal\"]').length"),
    1,
  );
  assert.equal(
    await evaluate("document.querySelectorAll('[aria-label=\"Calendário mensal\"] button').length"),
    42,
  );
  const heading = await evaluate("document.querySelector('main h2').textContent");
  await evaluate("document.querySelector('[aria-label=\"Próximo mês\"]').click()");
  await wait(`document.querySelector('main h2').textContent!==${JSON.stringify(heading)}`);
  await evaluate("document.querySelector('[aria-label=\"Mês anterior\"]').click()");
  await wait(`document.querySelector('main h2').textContent===${JSON.stringify(heading)}`);
  await click("Hoje");
  await wait(
    "document.querySelector('[aria-label=\"Calendário mensal\"] button[aria-pressed=true]')",
  );
  const selected = await evaluate(
    "document.querySelector('[aria-label=\"Calendário mensal\"] button[aria-pressed=true]').getAttribute('aria-label')",
  );
  await evaluate("document.querySelector('[aria-label=\"Próximo dia\"]').click()");
  await wait(
    `document.querySelector('[aria-label=\"Calendário mensal\"] button[aria-pressed=true]').getAttribute('aria-label')!==${JSON.stringify(selected)}`,
  );
  await command("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  assert.equal(await evaluate("document.documentElement.scrollWidth<=innerWidth"), true);
  await navigate("/acesso-paciente", "button");
  await evaluate("sessionStorage.setItem('inova-patient-demo','mariana-oliveira')");
  await navigate("/portal-paciente", "button");
  await click("Minha agenda");
  assert.equal(
    await evaluate("document.querySelectorAll('[aria-label=\"Calendário mensal\"]').length"),
    1,
  );
  assert.equal(await evaluate("document.documentElement.scrollWidth<=innerWidth"), true);
  console.log(
    "PASS: single monthly calendar, month/day navigation, Today, mobile doctor and patient.",
  );
} finally {
  ws.close();
}
