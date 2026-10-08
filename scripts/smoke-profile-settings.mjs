import assert from "node:assert/strict";
const targets = await fetch("http://127.0.0.1:9222/json/list").then((r) => r.json());
const target = targets.find((t) => t.type === "page");
if (!target) throw new Error("Chrome CDP on port 9222 is required.");
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r, { once: true }));
let id = 0;
const pending = new Map();
ws.addEventListener("message", (e) => {
  const message = JSON.parse(String(e.data));
  if (message.id) {
    const item = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) item.reject(new Error(message.error.message));
    else item.resolve(message.result);
  }
});
const command = (method, params = {}) =>
  new Promise((resolve, reject) => {
    pending.set(++id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
const evaluate = async (expression) => {
  const result = await command("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (result.exceptionDetails) throw new Error("Browser evaluation failed");
  return result.result.value;
};
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const base = process.env.INOVA_TEST_URL ?? "http://192.168.0.2:8080";
const keys = ['inova-demo-doctor-profile-v1', 'inova-demo-doctor-settings-v1'];
let backup;
const navigate = async path => { await command('Page.navigate', {url:base+path}); await pause(3000); };
const click = async text => { await evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()===${JSON.stringify(text)}).click()`); await pause(200); };
try {
  await navigate('/doctors');
  backup = await evaluate(`(${JSON.stringify(keys)}).map(k=>localStorage.getItem(k))`);
  assert.equal(await evaluate("document.querySelector('h1').textContent"), 'Meu perfil profissional');
  await evaluate(`(()=>{const input=document.querySelector('#profile-name');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'Dr. Rafael Teste');input.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  await pause(200); await click('Salvar perfil'); await navigate('/doctors');
  assert.equal(await evaluate("document.querySelector('#profile-name').value"), 'Dr. Rafael Teste');
  await navigate('/settings');
  const before=await evaluate("document.querySelector('#settings-results').getAttribute('aria-checked')");
  await evaluate("document.querySelector('#settings-results').click()"); await pause(200);
  await click('Salvar alterações'); await navigate('/settings');
  assert.notEqual(await evaluate("document.querySelector('#settings-results').getAttribute('aria-checked')"), before);
  await evaluate("document.querySelector('#settings-results').click()"); await pause(200); await click('Cancelar alterações');
  assert.notEqual(await evaluate("document.querySelector('#settings-results').getAttribute('aria-checked')"), before);
  await command('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  for (const path of ['/settings','/doctors']) { await navigate(path); assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true); }
  await navigate('/dashboard'); assert.equal(await evaluate("document.body.textContent.includes('Dr. Rafael Mendes')"),true);
  console.log('PASS: profile and settings save/reload, cancel edits, both mobile widths, unchanged dashboard identity.');
} finally {
  if(backup) await evaluate(`(${JSON.stringify(keys)}).forEach((k,i)=>{const v=${JSON.stringify(backup)}[i];if(v===null)localStorage.removeItem(k);else localStorage.setItem(k,v);})`);
  ws.close();
}
