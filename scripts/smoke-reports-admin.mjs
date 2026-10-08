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
let backup;
try {
  await navigate('/indicators','main');
  await wait("document.querySelector('h1')?.textContent==='Meus relatórios' && !document.querySelector('main').textContent.includes('Carregando atividades')");
  assert.equal(await evaluate("document.querySelector('main').textContent.includes('Médicos parceiros')"),false);
  assert.equal(await evaluate("document.querySelector('main').textContent.includes('Não foi possível carregar')"),false);
  await navigate('/admin-inova','main');
  backup=await evaluate("localStorage.getItem('inova-demo-admin-v1')");
  assert.equal(await evaluate("document.querySelector('h1').textContent"),'Visão geral');
  await click('Usuários');
  await fill('[aria-label="Pesquisar usuários administrativos"]','Mariana');
  await wait("document.querySelectorAll('main article').length===1");
  assert.equal(await evaluate("document.querySelector('main article').textContent.includes('Mariana Oliveira')"),true);
  await click('Desativar');
  await wait("document.querySelector('[role=dialog]')");
  await click('Cancelar');
  assert.equal(await evaluate("document.querySelector('main article').textContent.includes('Ativo')"),true);
  await click('Desativar'); await click('Confirmar alteração');
  await wait("document.querySelector('main article').textContent.includes('Desativado')");
  await navigate('/admin-inova','main'); await click('Usuários');
  await fill('[aria-label="Pesquisar usuários administrativos"]','Mariana');
  await wait("document.querySelector('main article').textContent.includes('Desativado')");
  await click('Registrar contato');
  await fill('#admin-contact-note','Teste fictício de tentativa de contato.');
  await wait("!document.querySelector('button[type=submit]').disabled");
  await click('Salvar registro');
  await wait("document.querySelector('main section').textContent.includes('Teste fictício de tentativa de contato.')");
  await click('Feedbacks');
  assert.equal(await evaluate("document.querySelector('#admin-contact-kind').value"),'Pedido de feedback');
  await fill('#admin-contact-note','Pedido fictício de feedback registrado manualmente.');
  await wait("!document.querySelector('button[type=submit]').disabled");
  await click('Salvar registro');
  await wait("document.querySelector('main section').textContent.includes('Pedido fictício de feedback registrado manualmente.')");
  await navigate('/admin-inova','main'); await click('Feedbacks');
  await wait("document.querySelector('main').textContent.includes('Pedido fictício de feedback registrado manualmente.')");
  assert.equal(await evaluate("document.querySelector('main').textContent.includes('Pedido fictício de feedback registrado manualmente.')"),true);
  await command('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  for(const path of ['/admin-inova','/indicators']){await navigate(path,'main');assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true);}
  await navigate('/patients/mariana-oliveira','main');
  assert.equal(await evaluate("document.querySelector('main').textContent.includes('Mariana Oliveira')"),true);
  console.log('PASS: scoped doctor reports, admin search, confirmation, status persistence, contact/feedback logs, mobile widths and preserved patient portal.');
} finally {
  if(backup!==undefined)await evaluate(`(()=>{const value=${JSON.stringify(backup)};if(value===null)localStorage.removeItem('inova-demo-admin-v1');else localStorage.setItem('inova-demo-admin-v1',value);})()`);
  ws.close();
}
