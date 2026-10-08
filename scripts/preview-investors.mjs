import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
const targets = await fetch("http://127.0.0.1:9222/json/list").then((r) => r.json());
const target = targets.find((t) => t.type === "page");
if (!target) throw new Error("Chrome CDP required on port 9222.");
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r, { once: true }));
let id = 0;
const pending = new Map();
const errors = [];
ws.addEventListener("message", (e) => {
  const message = JSON.parse(String(e.data));
  if (message.id) {
    const item = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) item.reject(new Error(message.error.message));
    else item.resolve(message.result);
  }
  if (message.method === "Runtime.exceptionThrown")
    errors.push(
      message.params.exceptionDetails.exception?.description ??
        message.params.exceptionDetails.text,
    );
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
const click = (label) =>
  evaluate(
    `[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(label)}).click()`,
  );
mkdirSync("docs/entregaveis", { recursive: true });
try {
  await command("Runtime.enable");
  await command("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1080,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await command("Page.navigate", { url: "http://localhost:8080/investidores" });
  for (let i = 0; i < 40; i++) {
    await pause(500);
    if (await evaluate("document.body.textContent.includes('Uma história de saúde.')")) break;
  }
  assert.equal(
    await evaluate("document.body.textContent.includes('Uma história de saúde.')"),
    true,
  );
  await pause(600);
  const shot = await command("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: true,
  });
  writeFileSync(
    "docs/entregaveis/INOVA_investidores_2026-10-08.png",
    Buffer.from(shot.data, "base64"),
  );
  await click("Próximo capítulo");
  await pause(250);
  assert.equal(
    await evaluate("document.body.textContent.includes('A consulta começa antes do encontro.')"),
    true,
  );
  await click("Próximo capítulo");
  await pause(350);
  await evaluate(
    "(()=>{const select=document.querySelector('[aria-label=\"Marcador demonstrativo\"]'); const setter=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set; setter.call(select,'2'); select.dispatchEvent(new Event('change',{bubbles:true}));})()",
  );
  await pause(250);
  assert.equal(await evaluate("document.querySelector('h2').textContent"), "Hemoglobina");
  await click("Próximo capítulo");
  await pause(250);
  assert.equal(await evaluate("document.body.textContent.includes('37.990')"), true);
  await evaluate(
    "(()=>{const input=document.querySelector('[aria-label=\"Ticket mensal hipotético\"]'); const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; setter.call(input,'200'); input.dispatchEvent(new Event('input',{bubbles:true})); input.dispatchEvent(new Event('change',{bubbles:true}));})()",
  );
  await pause(250);
  assert.equal(await evaluate("document.body.textContent.includes('20.000')"), true);
  await click("Próximo capítulo");
  await pause(300);
  assert.equal(
    await evaluate(
      "document.querySelector('[data-financial=\"EBITDA estimado · M1\"]').textContent.includes('4.900')",
    ),
    true,
  );
  await evaluate(
    "(()=>{const input=document.querySelector('[aria-label=\"Equipe e desenvolvimento\"]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'9000'); input.dispatchEvent(new Event('input',{bubbles:true})); input.dispatchEvent(new Event('change',{bubbles:true}));})()",
  );
  await pause(200);
  assert.equal(
    await evaluate(
      "document.querySelector('[data-financial=\"EBITDA estimado · M1\"]').textContent.includes('1.900')",
    ),
    true,
  );
  await click("Anterior");
  await click("Próximo capítulo");
  await pause(200);
  assert.equal(
    await evaluate("document.querySelector('[aria-label=\"Equipe e desenvolvimento\"]').value"),
    "9000",
  );
  await evaluate(
    "(()=>{const input=document.querySelector('[aria-label=\"Equipe e desenvolvimento\"]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'6000'); input.dispatchEvent(new Event('input',{bubbles:true})); input.dispatchEvent(new Event('change',{bubbles:true}));})()",
  );
  await click("Visão completa");
  await pause(600);
  assert.equal(await evaluate("document.querySelectorAll('.investor-chapter').length"), 6);
  await command("Emulation.setEmulatedMedia", { media: "print" });
  const pdf = await command("Page.printToPDF", {
    printBackground: true,
    landscape: true,
    paperWidth: 11.69,
    paperHeight: 8.27,
    marginTop: 0.3,
    marginBottom: 0.3,
    marginLeft: 0.3,
    marginRight: 0.3,
    preferCSSPageSize: true,
  });
  writeFileSync(
    "docs/entregaveis/INOVA_investidores_2026-10-08.pdf",
    Buffer.from(pdf.data, "base64"),
  );
  await command("Emulation.setEmulatedMedia", { media: "screen" });
  await click("Por capítulos");
  await command("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await pause(400);
  assert.equal(
    await evaluate("document.documentElement.scrollWidth <= innerWidth + 1"),
    true,
    "Mobile content must fit",
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS: 6 chapters, marker, revenue and EBITDA scenarios, retained cost inputs, mobile width; PNG and updated PDF generated.",
  );
} finally {
  ws.close();
}
