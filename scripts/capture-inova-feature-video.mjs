import { mkdirSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";

const base = process.env.INOVA_TEST_URL ?? "http://localhost:8081";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname))
  throw new Error("Local demo only");
const output = resolve("docs/entregaveis/instagram/INOVA_video_preparar_consulta_2026-10-10");
mkdirSync(join(output, "telas"), { recursive: true });

async function connect(url) {
  const socket = new WebSocket(url);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  let sequence = 0;
  const pending = new Map();
  socket.addEventListener("message", ({ data }) => {
    const message = JSON.parse(String(data));
    const item = pending.get(message.id);
    if (!item) return;
    pending.delete(message.id);
    clearTimeout(item.timer);
    if (message.error) item.reject(new Error(message.error.message));
    else item.resolve(message.result);
  });
  return {
    command(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = ++sequence;
        const timer = setTimeout(() => {
          pending.delete(id);
          reject(new Error(method + " timeout"));
        }, 40000);
        pending.set(id, { resolve, reject, timer });
        socket.send(JSON.stringify({ id, method, params }));
      });
    },
    close() {
      socket.close();
    },
  };
}
const version = await fetch("http://127.0.0.1:9222/json/version").then((r) => r.json());
const host = await connect(version.webSocketDebuggerUrl);
const { browserContextId } = await host.command("Target.createBrowserContext");
const { targetId } = await host.command("Target.createTarget", {
  url: "about:blank",
  browserContextId,
});
const targets = await fetch("http://127.0.0.1:9222/json/list").then((r) => r.json());
const page = await connect(targets.find((t) => t.id === targetId).webSocketDebuggerUrl);
async function evaluate(expression) {
  const result = await page.command("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
    userGesture: true,
  });
  if (result.exceptionDetails)
    throw new Error(result.exceptionDetails.exception?.description ?? "Browser error");
  return result.result.value;
}
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function wait(expression) {
  const end = Date.now() + 35000;
  while (Date.now() < end) {
    if (await evaluate(`Boolean(${expression})`)) return;
    await pause(120);
  }
  throw new Error("Timeout: " + expression);
}
async function navigate(path) {
  await page.command("Page.navigate", { url: base + path });
  await wait(
    `location.pathname===${JSON.stringify(path)}&&document.readyState==='complete'&&Object.keys(document.querySelector('button')??{}).some(k=>k.startsWith('__reactProps'))`,
  );
  await evaluate("document.fonts.ready");
}
async function click(label) {
  await wait(
    `[...document.querySelectorAll('button')].some(b=>b.textContent.trim()===${JSON.stringify(label)}&&!b.disabled)`,
  );
  await evaluate(
    `[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(label)}).click()`,
  );
}
async function fill(selector, value) {
  await evaluate(
    `(()=>{const input=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(input,${JSON.stringify(value)});input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));})()`,
  );
}
const captures = [];
async function shot(name, expression, maxHeight = 820) {
  await evaluate(`(${expression}).scrollIntoView({block:'start'})`);
  await evaluate("window.scrollBy(0,-100)");
  await pause(450);
  const bounds = await evaluate(
    `(()=>{const e=(${expression});const r=e.getBoundingClientRect();return {x:Math.max(0,r.left+scrollX-12),y:Math.max(0,r.top+scrollY-12),width:Math.ceil(r.width+24),height:Math.min(${maxHeight},Math.ceil(r.height+24))}})()`,
  );
  const screenshot = await page.command("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: true,
    clip: { ...bounds, scale: 1 },
  });
  writeFileSync(join(output, "telas", name + ".png"), Buffer.from(screenshot.data, "base64"));
  captures.push({ name, path: await evaluate("location.pathname"), ...bounds });
  console.log("Captured " + name);
}
const message =
  "Olá, Dr. Rafael! Gostaria de conversar sobre meu acompanhamento e conferir os exames que estou enviando para nossa próxima consulta. Exemplo fictício.";
const filename = "Laudo-exemplo-INOVA.pdf";
try {
  await page.command("Page.enable");
  await page.command("Runtime.enable");
  await page.command("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1100,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await navigate("/acesso-paciente");
  await evaluate("sessionStorage.setItem('inova-patient-demo','mariana-oliveira')");
  await navigate("/portal-paciente");
  await click("Preparar consulta");
  await wait("document.querySelector('#symptoms')");
  await fill("#symptoms", message);
  await fill(
    "#questions",
    "O que mudou entre minhas coletas? Quais próximos passos vamos combinar? Exemplo fictício.",
  );
  await shot("01-mensagem-paciente", "document.querySelector('.patient-consultation-form')", 770);
  await evaluate(
    `(async()=>{const r=await fetch('/examples/laudo-laboratorial-ficticio.pdf');if(!r.ok)throw new Error('PDF unavailable');const transfer=new DataTransfer();transfer.items.add(new File([await r.blob()],${JSON.stringify(filename)},{type:'application/pdf'}));const input=document.querySelector('input[aria-label="Adicionar laudo à preparação"]');input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));})()`,
  );
  await wait(
    `[...document.querySelectorAll('label')].some(l=>l.textContent.includes(${JSON.stringify(filename)}))`,
  );
  await evaluate(
    `[...document.querySelectorAll('label')].find(l=>l.textContent.includes(${JSON.stringify(filename)})).querySelector('input').click()`,
  );
  await evaluate(
    "[...document.querySelectorAll('label')].find(l=>l.textContent.includes('Confirmo que as respostas')).querySelector('input').click()",
  );
  const sendPanel =
    "[...document.querySelectorAll('section')].find(s=>s.querySelector('h3')?.textContent==='Enviar para a área médica')";
  await shot("02-pdf-selecionado", sendPanel, 820);
  await click("Revisar antes de enviar");
  await wait("document.querySelector('[role=dialog]')");
  await shot("03-revisao-envio", "document.querySelector('[role=dialog]')", 1020);
  await click("Confirmar envio ao médico");
  await wait(
    "document.querySelector('main').textContent.includes('Recebido na caixa demonstrativa do médico')",
  );
  await shot("04-envio-confirmado", sendPanel, 820);
  await navigate("/dashboard");
  await wait(
    "document.querySelector('button[aria-label^=\"Notificações:\"]') && !document.querySelector('button[aria-label^=\"Notificações:\"]').getAttribute('aria-label').includes(': 0 ')",
  );
  await evaluate("document.querySelector('button[aria-label^=\"Notificações:\"]').click()");
  await wait(
    "document.querySelector('[aria-label=\"Notificações do médico\"]')?.textContent.includes('Mariana Oliveira')",
  );
  await shot(
    "05-notificacao-medico",
    "document.querySelector('[aria-label=\"Notificações do médico\"]')",
    800,
  );
  await navigate("/patients/mariana-oliveira");
  await click("Envios do paciente");
  await wait(
    `document.querySelector('main').textContent.includes(${JSON.stringify(message)}) && document.querySelector('main').textContent.includes(${JSON.stringify(filename)})`,
  );
  const responsePanel =
    "[...document.querySelectorAll('div.surface')].find(e=>e.querySelector('h3')?.textContent==='Respostas do paciente')";
  await shot("06-envio-recebido", responsePanel, 900);
  await click("Abrir laudo recebido");
  await wait("document.querySelector('iframe[title^=\"Laudo recebido:\"]')");
  await pause(800);
  await evaluate(`(()=>{const panel=(${responsePanel});panel.scrollTop=panel.scrollHeight;})()`);
  await shot("07-laudo-aberto", responsePanel, 900);
  writeFileSync(
    join(output, "capturas.json"),
    JSON.stringify(
      {
        demo: true,
        isolatedBrowser: true,
        localOnly: true,
        message,
        filename,
        deliveryVerified: true,
        pdfOpened: true,
        captures,
      },
      null,
      2,
    ),
  );
  console.log("Verified local patient message/PDF delivery and doctor notification.");
} finally {
  page.close();
  await host.command("Target.disposeBrowserContext", { browserContextId });
  host.close();
}
