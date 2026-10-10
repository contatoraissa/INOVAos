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
async function doctor() {
  await navigate("/patients/mariana-oliveira", "main button");
  await click("Solicitar exames");
  await wait('document.querySelector("#search-order-exams")');
}
async function patient() {
  await navigate("/acesso-paciente", "#patient-email");
  await click("Explorar demonstração gratuita");
  await wait('location.pathname==="/portal-paciente" && document.querySelector("nav")');
  await click("Exames solicitados");
  await wait(
    'document.querySelector("main").innerText.includes("Confira os exames que seu médico liberou")',
  );
}
const note = "Pedido fictício de teste " + Date.now();
try {
  await command("Page.enable");
  await command("Runtime.enable");
  await command("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await doctor();
  errors.length = 0;
  await evaluate(
    '[...document.querySelectorAll("form label")].find(label=>label.textContent.includes("Hemograma completo")).querySelector("input").click()',
  );
  await fill("#search-order-exams", "Glicemia");
  await wait('document.querySelectorAll("form input[type=checkbox]").length===1');
  await evaluate('document.querySelector("form input[type=checkbox]").click()');
  await fill("#order-notes", note);
  await click("Salvar rascunho do pedido");
  await wait(
    'document.querySelectorAll("[data-order-id]").length>0 && [...document.querySelectorAll("[data-order-id]")].some(item=>item.textContent.includes(' +
      JSON.stringify(note) +
      "))",
  );
  const id = await evaluate(
    '[...document.querySelectorAll("[data-order-id]")].find(item=>item.textContent.includes(' +
      JSON.stringify(note) +
      ")).dataset.orderId",
  );
  console.log("PASS: doctor selects exams, filters catalog and saves draft");
  await patient();
  assert.equal(
    await evaluate(
      'document.querySelector("main").innerText.includes(' + JSON.stringify(note) + ")",
    ),
    false,
  );
  console.log("PASS: unpublished draft is hidden from patient");
  await doctor();
  await wait(`document.querySelector('[data-order-id="${id}"]')`);
  await evaluate(
    `document.querySelector('[data-order-id="${id}"]').querySelector('button').click()`,
  );
  await wait(
    `document.querySelector('[data-order-id="${id}"]').textContent.includes('Liberado ao paciente')`,
  );
  await patient();
  await wait('document.querySelector("main").innerText.includes(' + JSON.stringify(note) + ")");
  assert.equal(
    await evaluate(
      'document.querySelector("main").innerText.includes("Hemograma completo") && document.querySelector("main").innerText.includes("Glicemia em jejum")',
    ),
    true,
  );
  console.log("PASS: released order appears with the right exams, doctor and notes");
  await fill("#order-cep", "123");
  await click("Simular consulta de preços");
  await wait('document.querySelector("[role=alert]")?.textContent.includes("8 dígitos")');
  await fill("#order-cep", "01310-100");
  await click("Simular consulta de preços");
  await wait('document.querySelector("main").innerText.includes("SIMULAÇÃO: cotação fictícia")');
  await click("Explorar exames e laboratórios");
  await wait('document.querySelector("[role=dialog]")?.textContent.includes("R$")');
  assert.equal(
    await evaluate('document.querySelector("[role=dialog]").textContent.includes("R$")'),
    true,
  );
  await command("Input.dispatchKeyEvent", {
    type: "keyDown",
    key: "Escape",
    code: "Escape",
    windowsVirtualKeyCode: 27,
  });
  await command("Input.dispatchKeyEvent", {
    type: "keyUp",
    key: "Escape",
    code: "Escape",
    windowsVirtualKeyCode: 27,
  });
  await wait('!document.querySelector("[role=dialog]")');
  assert.equal(
    await evaluate('document.querySelector("a[href=\\"https://www.s2medica.com.br/\\"]").search'),
    "",
  );
  console.log(
    "PASS: CEP validation, explicitly simulated S2 prices and external link without patient data",
  );
  mkdirSync("artifacts", { recursive: true });
  const screenshot = await command("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
  });
  writeFileSync("artifacts/patient-orders.png", Buffer.from(screenshot.data, "base64"));
  await command("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  assert.equal(await evaluate("document.documentElement.scrollWidth>innerWidth+2"), false);
  console.log("PASS: patient order layout fits mobile viewport");
  await command("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await doctor();
  await wait(`document.querySelector('[data-order-id="${id}"]')`);
  await evaluate(
    `[...document.querySelector('[data-order-id="${id}"]').querySelectorAll('button')].find(button=>button.textContent.trim()==='Cancelar pedido').click()`,
  );
  await wait(`document.querySelector('[data-order-id="${id}"]').textContent.includes('Cancelado')`);
  await patient();
  await wait('document.querySelector("main aside button")');
  // The initial selection can differ when the demonstration already has other orders.
  const orderButtons = await evaluate('document.querySelectorAll("main aside button").length');
  for (let i = 0; i < orderButtons; i++) {
    await evaluate(`document.querySelectorAll('main aside button')[${i}].click()`);
    await new Promise((resolve) => setTimeout(resolve, 150));
    if (
      await evaluate(
        'document.querySelector("main").innerText.includes(' + JSON.stringify(note) + ")",
      )
    )
      break;
  }
  await wait(
    'document.querySelector("main").innerText.includes("Este pedido foi cancelado pelo médico")',
  );
  assert.equal(await evaluate('document.querySelector("#order-cep").disabled'), true);
  assert.equal(
    await evaluate(
      '[...document.querySelectorAll("button")].find(button=>button.textContent.trim()==="Simular consulta de preços").disabled',
    ),
    true,
  );
  console.log("PASS: physician cancellation reaches patient and disables price consultation");
  assert.deepEqual(errors, []);
  console.log("PASS: no order-flow runtime exceptions");
} finally {
  ws.close();
}
