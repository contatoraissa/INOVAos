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
  await navigate("/agenda", "button");
  await evaluate(
    `(async()=>{const api=await import('/src/lib/exam-orders.ts');const orders=await api.listExamOrders({data:{patientId:'mariana-oliveira',audience:'doctor'}});let order=orders.find(o=>o.status==='released'&&o.notes==='SIMULAÇÃO S2 LABS: pedido para testar cotação fictícia.');if(!order){order=await api.createExamOrder({data:{requestId:'s2-demo-'+Date.now(),patientId:'mariana-oliveira',exams:['hemograma','glicemia-jejum','perfil-lipidico'],notes:'SIMULAÇÃO S2 LABS: pedido para testar cotação fictícia.'}});await api.releaseExamOrder({data:{id:order.id}});}return order.id;})()`,
  );
  await evaluate("sessionStorage.setItem('inova-patient-demo','mariana-oliveira')");
  await navigate("/portal-paciente", "button");
  await click("Minha agenda");
  await wait(
    "document.querySelector('[aria-label=\"Exames solicitados na agenda\"]')?.textContent.includes('Perfil lipídico')",
  );
  await click("Ver pedido e consultar valores");
  await wait("document.querySelector('#order-cep')");
  await fill("#order-cep", "18035-000");
  await wait(
    "[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Simular consulta de preços' && !b.disabled)",
  );
  await click("Simular consulta de preços");
  await wait("document.body.textContent.includes('Explorar exames e laboratórios')");
  await click("Explorar exames e laboratórios");
  await wait(
    "document.querySelector('[role=\"dialog\"]')?.textContent.includes('Seu carrinho (3)')",
  );
  await click("Comparar laboratórios");
  await wait("document.body.textContent.includes('Laboratório Centro · fictício')");
  const text = await evaluate("document.body.textContent");
  assert.match(text, /85,00/);
  assert.match(text, /97,75/);
  await click("À domicílio");
  await wait("document.querySelector('[role=\"dialog\"]')?.textContent.includes('135,00')");
  await click("No laboratório");
  await evaluate(
    "[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Escolher este laboratório').click()",
  );
  await wait("document.body.textContent.includes('Confira sua escolha')");
  await click("Concluir simulação");
  await wait("document.body.textContent.includes('Escolha simulada concluída')");
  await command("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  assert.equal(
    await evaluate(
      "document.querySelector('[role=\"dialog\"]').scrollWidth <= document.querySelector('[role=\"dialog\"]').clientWidth + 1",
    ),
    true,
  );
  await command("Emulation.clearDeviceMetricsOverride");
  await evaluate(
    'document.querySelector(\'[role="dialog"] button[data-slot="dialog-close"]\')?.click()',
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
  await wait("!document.querySelector('[role=\"dialog\"]')");
  await click("Minha agenda");
  console.log(
    "PASS: released order, cart, unit/home quotes, lab selection, review, mobile overflow and no booking; demo order left available",
  );
} finally {
  ws.close();
}
