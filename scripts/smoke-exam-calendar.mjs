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
  const id = await evaluate(
    `(async()=>{const api=await import('/src/lib/exam-orders.ts');const order=await api.createExamOrder({data:{requestId:"calendar-smoke-"+Date.now(),patientId:'mariana-oliveira',exams:['hemograma'],notes:'SIMULAÇÃO FICTÍCIA: teste do fluxo de coleta.'}});await api.releaseExamOrder({data:{id:order.id}});return order.id;})()`,
  );
  await evaluate("sessionStorage.setItem('inova-patient-demo','mariana-oliveira')");
  await navigate("/portal-paciente", "button");
  await click("Minha agenda");
  await wait(
    "document.querySelector('[aria-label=\"Exames solicitados na agenda\"]')?.textContent.includes('Hemograma completo')",
  );
  assert.match(
    await evaluate(
      "document.querySelector('[aria-label=\"Exames solicitados na agenda\"]').textContent",
    ),
    /Aguardando realização/,
  );
  await click("Ver pedido e consultar valores");
  await wait("document.body.textContent.includes('Enviar resultado PDF ao médico')");
  assert.equal(
    await evaluate(
      "[...document.querySelectorAll('a')].some(a=>a.href==='https://www.s2medica.com.br/')",
    ),
    true,
  );
  await click("Minha agenda");
  await click("Informar coleta");
  await fill("#exam-collection-date", "2026-10-22");
  await fill("#exam-collection-time", "09:00");
  await fill("#exam-collection-lab", "Laboratório fictício de teste");
  await click("Salvar coleta na agenda");
  await wait(
    "document.querySelector('[aria-label=\"Exames solicitados na agenda\"]')?.textContent.includes('Coleta informada')",
  );
  const event = await evaluate(
    `(async()=>{const api=await import('/src/lib/agenda.ts');return (await api.listAgenda({data:{patientIds:['mariana-oliveira'],audience:'doctor'}})).find(e=>e.orderId===${JSON.stringify(id)});})()`,
  );
  assert.equal(event.date, "2026-10-22");
  assert.equal(event.kind, "Exame");
  const duplicateRejected = await evaluate(
    `(async()=>{try{const api=await import('/src/lib/exam-orders.ts');await api.scheduleExamOrder({data:{orderId:${JSON.stringify(id)},date:'2026-10-23',time:'',laboratory:'Fictício'}});return false;}catch{return true;}})()`,
  );
  assert.equal(duplicateRejected, true);
  await evaluate(
    `(async()=>{const api=await import('/src/lib/exam-orders.ts');await api.cancelExamOrder({data:{id:${JSON.stringify(id)}}});})()`,
  );
  const cancelled = await evaluate(
    `(async()=>{const api=await import('/src/lib/agenda.ts');return (await api.listAgenda({data:{patientIds:['mariana-oliveira'],audience:'patient'}})).find(e=>e.orderId===${JSON.stringify(id)});})()`,
  );
  assert.equal(cancelled.status, "Cancelado");
  console.log(
    "PASS: released order in agenda, exact order navigation, S2 link, collection date, duplicate rejection, doctor visibility and cancellation",
  );
} finally {
  ws.close();
}
