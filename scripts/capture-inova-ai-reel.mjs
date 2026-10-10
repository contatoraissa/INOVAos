import { mkdirSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";

const output = resolve("docs/entregaveis/instagram/INOVA_IA_reel_2026-10-10");
const recordings = resolve("artifacts/inova-ai-reel-recordings");
mkdirSync(output, { recursive: true });
mkdirSync(recordings, { recursive: true });
const base = "http://localhost:8081";
const cdp = "http://127.0.0.1:9223";
async function connect(url) {
  const socket = new WebSocket(url);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  let next = 0;
  const pending = new Map();
  const listeners = new Set();
  socket.addEventListener("message", ({ data }) => {
    const message = JSON.parse(String(data));
    if (!message.id) {
      for (const listener of listeners) listener(message);
      return;
    }
    const item = pending.get(message.id);
    if (!item) return;
    clearTimeout(item.timer);
    pending.delete(message.id);
    if (message.error) item.reject(new Error(message.error.message));
    else item.resolve(message.result);
  });
  return {
    listeners,
    close: () => socket.close(),
    command: (method, params = {}) =>
      new Promise((resolve, reject) => {
        const id = ++next;
        const timer = setTimeout(() => {
          pending.delete(id);
          reject(new Error(method + " timeout"));
        }, 90000);
        pending.set(id, { resolve, reject, timer });
        socket.send(JSON.stringify({ id, method, params }));
      }),
  };
}
const version = await fetch(cdp + "/json/version").then((r) => r.json());
const host = await connect(version.webSocketDebuggerUrl);
const { browserContextId } = await host.command("Target.createBrowserContext");
const { targetId } = await host.command("Target.createTarget", {
  url: "about:blank",
  browserContextId,
});
const targets = await fetch(cdp + "/json/list").then((r) => r.json());
const browser = await connect(targets.find((t) => t.id === targetId).webSocketDebuggerUrl);
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function evaluate(expression) {
  const r = await browser.command("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
    userGesture: true,
  });
  if (r.exceptionDetails)
    throw new Error(r.exceptionDetails.exception?.description ?? "Browser evaluation failed");
  return r.result.value;
}
async function wait(expression, timeout = 45000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if (await evaluate(`Boolean(${expression})`)) return;
    await pause(180);
  }
  throw new Error("Timeout: " + expression);
}
async function navigate(path) {
  await browser.command("Page.navigate", { url: base + path });
  await wait(
    `location.pathname===${JSON.stringify(path)}&&Object.keys(document.querySelector('button')??{}).some(k=>k.startsWith('__reactProps'))`,
  );
  await evaluate("document.fonts.ready");
  await pause(400);
}
async function fill(selector, value) {
  await evaluate(
    `(()=>{const e=document.querySelector(${JSON.stringify(selector)});const proto=e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:e.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));})()`,
  );
}
async function button(label) {
  await wait(
    `[...document.querySelectorAll('button')].some(b=>b.textContent.trim()===${JSON.stringify(label)}&&!b.disabled)`,
  );
  await evaluate(
    `[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(label)}).click()`,
  );
}
const briefing = "document.querySelector('[aria-label=\"Briefing da agenda com IA\"]')";
async function scrollTo(expression, offset = 90) {
  await evaluate(
    `(()=>{const r=(${expression}).getBoundingClientRect();window.scrollTo({top:scrollY+r.top-${offset},behavior:'smooth'});})()`,
  );
  await pause(900);
}
async function pointTo(expression, click = false) {
  const point = await evaluate(
    `(()=>{const r=(${expression}).getBoundingClientRect();return {x:r.left+r.width*.55,y:r.top+r.height*.5}})()`,
  );
  for (let i = 0; i <= 12; i++) {
    const p = i / 12;
    await evaluate(
      `(()=>{const e=document.querySelector('#recording-pointer');e.style.left='${60 + (point.x - 60) * p}px';e.style.top='${120 + (point.y - 120) * p}px';e.style.opacity='1';})()`,
    );
    await pause(24);
  }
  if (click) {
    await browser.command("Input.dispatchMouseEvent", {
      type: "mousePressed",
      ...point,
      button: "left",
      clickCount: 1,
    });
    await browser.command("Input.dispatchMouseEvent", {
      type: "mouseReleased",
      ...point,
      button: "left",
      clickCount: 1,
    });
  }
  await pause(350);
  await evaluate("document.querySelector('#recording-pointer').style.opacity='0'");
}
async function addPointer() {
  await evaluate(
    `(()=>{if(document.querySelector('#recording-pointer'))return;const e=document.createElement('div');e.id='recording-pointer';e.style.cssText='position:fixed;z-index:2147483647;pointer-events:none;left:0;top:0;width:34px;height:34px;border:3px solid #00b8e6;border-radius:50%;background:#00b8e624;box-shadow:0 0 0 8px #00b8e618;transform:translate(-50%,-50%);opacity:0;transition:opacity .2s';document.body.appendChild(e);})()`,
  );
}
const manifest = [];
async function record(name, action) {
  const directory = join(recordings, name);
  mkdirSync(directory, { recursive: true });
  const list = [];
  const startedAt = Date.now();
  const listener = (message) => {
    if (message.method !== "Page.screencastFrame") return;
    const file = `frame-${String(list.length).padStart(5, "0")}.jpg`;
    writeFileSync(join(directory, file), Buffer.from(message.params.data, "base64"));
    list.push({ file, at: (Date.now() - startedAt) / 1000 });
    void browser
      .command("Page.screencastFrameAck", { sessionId: message.params.sessionId })
      .catch(() => {});
  };
  browser.listeners.add(listener);
  await browser.command("Page.startScreencast", {
    format: "jpeg",
    quality: 94,
    maxWidth: 720,
    maxHeight: 1100,
    everyNthFrame: 1,
  });
  await pause(400);
  await action();
  await pause(650);
  await browser.command("Page.stopScreencast");
  await pause(200);
  browser.listeners.delete(listener);
  if (!list.length) throw new Error("No recorded frames");
  const duration = (Date.now() - startedAt) / 1000;
  writeFileSync(
    join(directory, "frames.json"),
    JSON.stringify({ duration, frames: list }, null, 2),
  );
  manifest.push({ name, duration, frames: list.length });
  console.log(`Recorded ${name}: ${list.length} live frames, ${duration.toFixed(1)}s`);
}
try {
  await browser.command("Page.enable");
  await browser.command("Runtime.enable");
  await browser.command("Emulation.setDeviceMetricsOverride", {
    width: 720,
    height: 1100,
    deviceScaleFactor: 1,
    mobile: false,
  });
  // Fictional submission provides context for the live AI demonstration.
  await navigate("/acesso-paciente");
  await evaluate("sessionStorage.setItem('inova-patient-demo','mariana-oliveira')");
  await navigate("/portal-paciente");
  await button("Preparar consulta");
  await wait("document.querySelector('#symptoms')");
  await fill(
    "#symptoms",
    "Quero revisar meus exames e conversar sobre meu acompanhamento. Demonstração fictícia.",
  );
  await fill(
    "#questions",
    "O que mudou nas últimas coletas? Quais próximos passos vamos combinar?",
  );
  await evaluate(
    `(async()=>{const r=await fetch('/examples/laudo-laboratorial-ficticio.pdf');if(!r.ok)throw new Error('PDF unavailable');const d=new DataTransfer();d.items.add(new File([await r.blob()],'Laudo-demonstracao-INOVA.pdf',{type:'application/pdf'}));const e=document.querySelector('input[aria-label="Adicionar laudo à preparação"]');e.files=d.files;e.dispatchEvent(new Event('change',{bubbles:true}));})()`,
  );
  await wait(
    "[...document.querySelectorAll('label')].some(e=>e.textContent.includes('Laudo-demonstracao-INOVA.pdf'))",
  );
  await evaluate(
    "[...document.querySelectorAll('label')].find(e=>e.textContent.includes('Laudo-demonstracao-INOVA.pdf')).querySelector('input').click()",
  );
  await evaluate(
    "[...document.querySelectorAll('label')].find(e=>e.textContent.includes('Confirmo que as respostas')).querySelector('input').click()",
  );
  await button("Revisar antes de enviar");
  await button("Confirmar envio ao médico");
  await wait(
    "document.querySelector('main').textContent.includes('Recebido na caixa demonstrativa do médico')",
  );
  await navigate("/agenda");
  await button("Adicionar evento");
  await fill("#agenda-patient", "mariana-oliveira");
  await fill("#agenda-title", "Acompanhamento · demonstração INOVA");
  await fill("#agenda-date", "2026-10-14");
  await fill("#agenda-status", "Confirmado");
  await fill("input[type=time]", "14:30");
  await fill(
    "#agenda-notes",
    "Revisar relato e laudo enviados pela paciente. Consulta fictícia para apresentação do INOVA.",
  );
  await button("Salvar evento");
  await wait("!document.querySelector('[role=dialog]')");
  await wait(
    "[...document.querySelectorAll('button')].some(b=>b.getAttribute('aria-label')?.startsWith('14 de Outubro'))",
  );
  await evaluate(
    "[...document.querySelectorAll('button')].find(b=>b.getAttribute('aria-label')?.startsWith('14 de Outubro')).click()",
  );
  await wait(`${briefing}?.textContent.includes('Conferir textos usados')`);
  await addPointer();
  await scrollTo(briefing, 180);
  await record("01-assistente", async () => {
    await pointTo(`${briefing}.querySelector('h2')`);
    await pause(1300);
  });
  await record("02-contexto", async () => {
    const summary = `${briefing}.querySelector('summary')`;
    await pointTo(summary, true);
    await pause(800);
    await scrollTo(`${briefing}.querySelector('article')`, 130);
    await pause(900);
  });
  await evaluate(`${briefing}.querySelector('details').open=false`);
  await scrollTo(`${briefing}.querySelector('input[type=checkbox]')`, 450);
  await record("03-gerar", async () => {
    await pointTo(`${briefing}.querySelector('input[type=checkbox]')`, true);
    await pointTo(
      `[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Gerar briefing do dia')`,
      true,
    );
    await pause(1600);
  });
  console.log("Waiting for live Gemini result...");
  await wait(
    `${briefing}.textContent.includes('Gerado por IA')||${briefing}.querySelector('[role=alert]')`,
    90000,
  );
  const error = await evaluate(`${briefing}.querySelector('[role=alert]')?.textContent`);
  if (error) throw new Error(error);
  const resultArticle = `${briefing}.querySelector('article.border')`;
  await wait(resultArticle);
  await scrollTo(resultArticle, 110);
  const generated = await evaluate(`(${resultArticle}).innerText`);
  await record("04-resumo", async () => {
    await pause(1600);
    await pointTo(`(${resultArticle}).querySelector('h3')`);
    await evaluate("window.scrollBy({top:230,behavior:'smooth'})");
    await pause(1700);
  });
  await record("05-revisao", async () => {
    await pointTo(
      `[...document.querySelectorAll('a')].find(a=>a.textContent.trim()==='Abrir envios do paciente')`,
      true,
    );
    await wait(
      "location.pathname==='/patients/mariana-oliveira'&&document.querySelector('main').textContent.includes('Respostas do paciente')",
    );
    await addPointer();
    await scrollTo(
      "[...document.querySelectorAll('h3')].find(e=>e.textContent==='Respostas do paciente')",
      120,
    );
    await pause(1500);
  });
  writeFileSync(
    join(output, "captura-validada.json"),
    JSON.stringify(
      {
        actualScreencast: true,
        liveGeminiVerified: true,
        fictionalDataOnly: true,
        isolatedBrowser: true,
        width: 720,
        height: 1100,
        generated,
        clips: manifest,
      },
      null,
      2,
    ),
  );
  console.log("Verified live AI briefing and recorded actual interface interactions.");
} finally {
  browser.close();
  await host.command("Target.disposeBrowserContext", { browserContextId });
  host.close();
}
