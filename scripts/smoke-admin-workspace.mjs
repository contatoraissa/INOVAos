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
let backup,legacy;
async function select(selector,value){await evaluate(`(()=>{const input=document.querySelector(${JSON.stringify(selector)});input.value=${JSON.stringify(value)};input.dispatchEvent(new Event('change',{bubbles:true}));})()`);}
async function escape(){await command('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await command('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});}
try {
 await command('Emulation.setDeviceMetricsOverride',{width:1440,height:1050,deviceScaleFactor:1,mobile:false});
 await navigate('/admin-inova','main');
 backup=await evaluate("localStorage.getItem('inova-demo-admin-v2')");legacy=await evaluate("localStorage.getItem('inova-demo-admin-v1')");
 await evaluate("localStorage.removeItem('inova-demo-admin-v2');localStorage.removeItem('inova-demo-admin-v1')");
 await navigate('/admin-inova','main');
 await wait("document.querySelector('main').textContent.includes('Entenda quem chega.')");
 await wait("document.querySelectorAll('.recharts-surface').length>=4");
 mkdirSync('artifacts',{recursive:true});
 let shot=await command('Page.captureScreenshot',{format:'png'});writeFileSync('artifacts/admin-overview.png',Buffer.from(shot.data,'base64'));
 await click('Usuários');await fill('[aria-label="Pesquisar usuários administrativos"]','Mariana');
 await wait("document.querySelectorAll('[data-admin-user]').length===1");
 await click('Desativar');await wait("document.querySelector('#admin-status-reason')");
 assert.equal(await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Confirmar alteração').disabled"),true);
 await click('Cancelar');await click('Desativar');await fill('#admin-status-reason','SIMULAÇÃO: pausa solicitada para teste.');await click('Confirmar alteração');
 await wait("document.querySelector('[data-admin-user]').textContent.includes('Desativado')");
 await navigate('/admin-inova','main');await click('Usuários');await fill('[aria-label="Pesquisar usuários administrativos"]','Mariana');await wait("document.querySelector('[data-admin-user]').textContent.includes('Desativado')");
 await click('Reativar');await fill('#admin-status-reason','SIMULAÇÃO: retomada de teste.');await click('Confirmar alteração');await wait("!document.querySelector('[role=dialog]')");
 await click('Registrar contato');await fill('#admin-contact-note','SIMULAÇÃO: contato sobre experiência de uso.');await click('Salvar registro');await wait("document.querySelector('main').textContent.includes('SIMULAÇÃO: contato sobre experiência de uso.')");
 await evaluate("[...document.querySelectorAll('article')].find(a=>a.textContent.includes('SIMULAÇÃO: contato sobre experiência de uso.')).querySelector('button').click()");
 await select('[aria-label="Situação dos contatos"]','Concluído');await wait("document.querySelector('main').textContent.includes('SIMULAÇÃO: contato sobre experiência de uso.')");
 await click('Feedbacks');await select('#admin-feedback-user','mariana-oliveira');await select('#admin-feedback-rating','2');await fill('#admin-feedback-comment','SIMULAÇÃO: preciso de orientação para encontrar documentos.');await click('Salvar feedback');await wait("document.querySelector('main').textContent.includes('SIMULAÇÃO: preciso de orientação')");
 await click('Usuários');await wait("document.querySelector('[data-admin-user]').textContent.includes('Negativo')");
 await click('Mariana Oliveira');await wait("document.querySelector('[role=dialog]')?.textContent.includes('Resumo administrativo fictício')");await click('Simular acesso');await escape();
 await click('Assinaturas');await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Editar plano').click()");await select('#admin-plan-status','Ativa');await click('Salvar assinatura');
 await wait("!document.querySelector('[role=dialog]')");
 assert.equal(await evaluate("JSON.parse(localStorage.getItem('inova-demo-admin-v2')).subscriptions[0].status"),'Ativa');
 await click('Atividade');await wait("document.body.textContent.includes('Uso por funcionalidade')");await select('[aria-label="Período da atividade"]','7');
 await click('Resumo com IA');await wait("document.body.textContent.includes('Sua operação, explicada')");
 assert.equal(await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Gerar resumo com IA').disabled"),true);
 assert.equal(await evaluate("document.querySelector('pre').textContent.includes('example.com')"),false);
 if(process.env.INOVA_TEST_AI==='true'){
   await wait("!document.body.textContent.includes('Carregando cenário')");
   await evaluate("document.querySelector('main input[type=checkbox]').click()");
   await wait("[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Gerar resumo com IA'&&!b.disabled)");
   await click('Gerar resumo com IA');
   for(let i=0;i<300;i++){if(await evaluate("document.body.textContent.includes('Gerado por IA')||!!document.querySelector('[role=alert]')"))break;await new Promise(resolve=>setTimeout(resolve,200));}
   assert.equal(await evaluate("document.body.textContent.includes('Gerado por IA')"),true,await evaluate("document.querySelector('[role=alert]')?.textContent"));
   shot=await command('Page.captureScreenshot',{format:'png'});writeFileSync('artifacts/admin-ai.png',Buffer.from(shot.data,'base64'));
   console.log('PASS: real Gemini administrative summary');
 }
 await evaluate("document.querySelector('[aria-label=\"Abrir histórico de alterações\"]').click()");await wait("document.querySelector('[role=dialog]')?.textContent.includes('Feedback registrado')");await escape();
 await command('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 for(const tab of ['Visão geral','Usuários','Atividade','Assinaturas','Contatos e reativação','Feedbacks','Resumo com IA']){await evaluate("document.querySelector('[aria-label=\"Abrir menu administrativo\"]').click()");await evaluate(`[...document.querySelectorAll('nav button')].filter(b=>b.textContent.trim()===${JSON.stringify(tab)}).at(-1).click()`);await wait(`document.querySelector('h1')?.textContent===${JSON.stringify(tab)}`);assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true,tab+' mobile overflow');}
 await navigate('/patients/mariana-oliveira','main');await wait("document.querySelector('main').textContent.includes('Mariana Oliveira')");
 console.log('PASS: admin charts, users, confirmation, persistence, contact tasks, feedback, subscriptions, activity, audit, AI gate, all mobile tabs and preserved patient page');
} finally {
 await command('Emulation.clearDeviceMetricsOverride');
 if(backup!==undefined)await evaluate(`(()=>{const b=${JSON.stringify(backup)},l=${JSON.stringify(legacy)};if(b===null)localStorage.removeItem('inova-demo-admin-v2');else localStorage.setItem('inova-demo-admin-v2',b);if(l===null)localStorage.removeItem('inova-demo-admin-v1');else localStorage.setItem('inova-demo-admin-v1',l);})()`);
 ws.close();
}
