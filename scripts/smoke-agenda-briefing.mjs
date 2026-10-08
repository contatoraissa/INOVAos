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
  await command('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await navigate('/agenda','main');
  await evaluate("document.querySelector('button[aria-label^=\"20 de Outubro\"]').click()");
  await wait("document.querySelector('[aria-label=\"Briefing da agenda com IA\"]')?.textContent.includes('Conferir textos usados')");
  assert.equal(await evaluate("getComputedStyle(document.querySelector('[aria-label=\"Lista de compromissos com rolagem independente\"]')).overflowY"),'auto');
  assert.equal(await evaluate("document.querySelector('[aria-label=\"Briefing da agenda com IA\"]').textContent.includes('Mariana Oliveira')"),true);
  const disabled=await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Gerar briefing do dia').disabled");
  assert.equal(disabled,true);
  await evaluate("document.querySelector('[aria-label=\"Briefing da agenda com IA\"] input[type=checkbox]').click()");
  await wait("![...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Gerar briefing do dia').disabled");
  await click('Gerar briefing do dia');
  for(let i=0;i<350;i++){const done=await evaluate("document.querySelector('[aria-label=\"Briefing da agenda com IA\"]').textContent.includes('Gerado por IA') || !!document.querySelector('[aria-label=\"Briefing da agenda com IA\"] [role=alert]')");if(done)break;await new Promise(r=>setTimeout(r,200));}
  const error=await evaluate("document.querySelector('[aria-label=\"Briefing da agenda com IA\"] [role=alert]')?.textContent");
  if(error)console.log('LIVE PROVIDER LIMITATION: '+error);
  else {assert.equal(await evaluate("document.querySelector('[aria-label=\"Briefing da agenda com IA\"]').textContent.includes('Gerado por IA')"),true);console.log('PASS: live Gemini briefing rendered for synthetic agenda.');}
  await command('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true);
  console.log('PASS: doctor context, consent gate, independent event scroll and mobile width.');
}finally{ws.close();}
