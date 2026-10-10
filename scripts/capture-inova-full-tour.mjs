import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { scenes } from "./inova-full-tour-scenes.mjs";
import { resolve, join } from "node:path";

const output = resolve("docs/entregaveis/instagram/INOVA_portais_completos_2026-10-10");
const recordings = resolve("artifacts/inova-full-tour-recordings");
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

async function upload(selector, filename = "Laudo-INOVA-ficticio.pdf") {
  await wait(`document.querySelector(${JSON.stringify(selector)})`);
  await evaluate(
    `(async()=>{const r=await fetch('/examples/laudo-laboratorial-ficticio.pdf');if(!r.ok)throw new Error('Example PDF missing');const d=new DataTransfer();d.items.add(new File([await r.blob()],${JSON.stringify(filename)},{type:'application/pdf'}));const e=document.querySelector(${JSON.stringify(selector)});e.files=d.files;e.dispatchEvent(new Event('change',{bubbles:true}));})()`,
  );
  await pause(500);
}
async function scroll(top) {
  await evaluate(`window.scrollTo({top:${top},behavior:'smooth'})`);
  await pause(800);
}
let patientReady = false;
const facts = [];
try {
  await browser.command("Page.enable");
  await browser.command("Runtime.enable");
  await browser.command("Emulation.setDeviceMetricsOverride", {
    width: 720,
    height: 1100,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await navigate("/dashboard");
  if (process.argv.includes("--check")) {
    const s = await browser.command("Page.captureScreenshot", { format: "png" });
    writeFileSync(resolve("artifacts/full-tour-check.png"), Buffer.from(s.data, "base64"));
  } else {
    // Reuse an existing local order; create one only if no released demonstration order exists.
    await evaluate(
      `(async()=>{const api=await import('/src/lib/exam-orders.ts');const orders=await api.listExamOrders({data:{patientId:'mariana-oliveira',audience:'doctor'}});if(!orders.some(o=>o.status==='released')){const o=await api.createExamOrder({data:{requestId:'tour-'+Date.now(),patientId:'mariana-oliveira',exams:['hemograma','glicemia-jejum','perfil-lipidico'],notes:'Demonstração INOVA: pedido fictício para apresentação.'}});await api.releaseExamOrder({data:{id:o.id}})}})()`,
    );
    for (const scene of scenes) {
      const startAt = process.argv.indexOf("--start");
      if (
        startAt >= 0 &&
        scenes.indexOf(scene) < scenes.findIndex((s) => s.id === process.argv[startAt + 1])
      )
        continue;
      const endAt = process.argv.indexOf("--end");
      if (
        endAt >= 0 &&
        scenes.indexOf(scene) > scenes.findIndex((s) => s.id === process.argv[endAt + 1])
      )
        break;
      if (scene.reuse) {
        facts.push({ id: scene.id, reuse: scene.reuse });
        continue;
      }
      if (scene.section) {
        if (!patientReady) {
          await navigate("/acesso-paciente");
          await evaluate("sessionStorage.setItem('inova-patient-demo','mariana-oliveira')");
          await navigate("/portal-paciente");
          patientReady = true;
        }
        await button(scene.section);
        await wait(
          `document.querySelector('main h1')?.textContent===${JSON.stringify(scene.section)}`,
        );
        await pause(600);
      } else if (scene.tab) {
        if (await evaluate("location.pathname!=='/patients/mariana-oliveira'"))
          await navigate("/patients/mariana-oliveira");
        await button(scene.tab);
        await pause(500);
      } else await navigate(scene.path);
      await scroll(scene.tab ? 420 : (scene.scroll ?? 0));
      await addPointer();
      if (
        existsSync(join(recordings, scene.id, "frames.json")) &&
        !process.argv.includes("--force") &&
        !["patient-ai", "send", "s2", "preparation"].includes(scene.action)
      ) {
        console.log("Reused " + scene.id);
        continue;
      }
      if (scene.action === "lab") {
        await upload("input[type=file]");
        await wait(
          "[...document.querySelectorAll('label')].some(e=>e.textContent.includes('Confirmo que este PDF'))",
        );
        await evaluate(
          "[...document.querySelectorAll('label')].find(e=>e.textContent.includes('Confirmo que este PDF')).querySelector('input').click()",
        );
        await button("Analisar com Gemini");
        await wait(
          "document.querySelector('[aria-label=\"Resultado da análise por IA\"]')||document.querySelector('main [role=alert]')",
          90000,
        );
        if (
          !(await evaluate(
            "Boolean(document.querySelector('[aria-label=\"Resultado da análise por IA\"]'))",
          ))
        ) {
          await pause(1000);
          await button("Analisar com Gemini");
          await wait(
            "document.querySelector('[aria-label=\"Resultado da análise por IA\"]')||document.querySelector('main [role=alert]')",
            90000,
          );
        }
        await wait("document.querySelector('[aria-label=\"Resultado da análise por IA\"]')", 5000);
        facts.push({
          id: scene.id,
          liveAI: true,
          generatedText: await evaluate(
            "document.querySelector('[aria-label=\"Resultado da análise por IA\"]')?.textContent",
          ),
        });
        await scrollTo("document.querySelector('.insight-panel')", 130);
      }
      if (scene.action === "document") {
        // The library already contains the PDF from preparation in this isolated browser.
        const exists = await evaluate(
          "document.querySelector('main').textContent.includes('Laudo-INOVA-ficticio.pdf')",
        );
        if (!exists) await upload("input[type=file]");
      }
      if (scene.action === "lab") {
        await record(scene.id, async () => {
          await pause(1300);
          await evaluate(
            "document.querySelector('[aria-label=\"Resultado da análise por IA\"]').scrollTo({top:360,behavior:'smooth'})",
          );
          await pause(1200);
        });
      } else if (scene.action === "patient-ai") {
        const expr =
          "document.querySelector('[aria-label=\"Interpretação dos resultados por IA\"]')";
        await wait(expr);
        await scrollTo(expr, 100);
        await evaluate(`${expr}.querySelector('input[type=checkbox]').click()`);
        await button("Interpretar com Gemini");
        await wait(
          "document.querySelector('[aria-label=\"Explicação gerada por IA\"]')||document.querySelector('[aria-label=\"Interpretação dos resultados por IA\"] [role=alert]')",
          90000,
        );
        let result = await evaluate(
          "document.querySelector('[aria-label=\"Explicação gerada por IA\"]')?.textContent",
        );
        if (!result) {
          console.log("Retrying transient patient AI error");
          await pause(1200);
          await button("Interpretar com Gemini");
          await wait(
            "document.querySelector('[aria-label=\"Explicação gerada por IA\"]')||document.querySelector('[aria-label=\"Interpretação dos resultados por IA\"] [role=alert]')",
            90000,
          );
          result = await evaluate(
            "document.querySelector('[aria-label=\"Explicação gerada por IA\"]')?.textContent",
          );
        }
        if (!result)
          throw new Error(
            "Patient AI did not generate: " +
              (await evaluate("document.querySelector('[role=alert]')?.textContent")),
          );
        facts.push({ id: scene.id, liveAI: true, generatedText: result });
        await record(scene.id, async () => {
          await pause(1000);
          await scrollTo(
            "document.querySelector('[aria-label=\"Explicação gerada por IA\"]')",
            130,
          );
          await pause(1300);
        });
      } else if (scene.action === "s2") {
        await wait("document.querySelector('#order-cep')");
        await fill("#order-cep", "18035-000");
        await button("Simular consulta de preços");
        await button("Explorar exames e laboratórios");
        await wait("document.querySelector('[role=dialog]')");
        await record(scene.id, async () => {
          await pause(900);
          await button("Comparar laboratórios");
          await wait("document.body.textContent.includes('Laboratório Centro · fictício')");
          await pause(1200);
          await evaluate(
            "document.querySelector('[role=dialog]').scrollTo({top:420,behavior:'smooth'})",
          );
          await pause(1000);
        });
        await evaluate(
          "document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))",
        );
        await wait("!document.querySelector('[role=dialog]')");
      } else if (scene.action === "preparation") {
        await scrollTo("document.querySelector('#symptoms')", 150);
        await record(scene.id, async () => {
          await fill(
            "#symptoms",
            "Quero revisar meus resultados e conversar sobre meu acompanhamento. Exemplo fictício para a demonstração.",
          );
          await pause(650);
          await fill("#medicines", "Quero conferir com o médico meus medicamentos e suplementos.");
          await fill(
            "#questions",
            "O que mudou nas minhas últimas coletas? Quais serão os próximos passos?",
          );
          await pause(800);
          await upload('input[aria-label="Adicionar laudo à preparação"]');
          await scrollTo(
            "document.querySelector('input[aria-label=\"Adicionar laudo à preparação\"]')",
            180,
          );
          await pause(700);
        });
      } else if (scene.action === "send") {
        await evaluate(
          "[...document.querySelectorAll('label')].find(e=>e.textContent.includes('Laudo-INOVA-ficticio.pdf')).querySelector('input').click()",
        );
        await evaluate(
          "[...document.querySelectorAll('label')].find(e=>e.textContent.includes('Confirmo que as respostas')).querySelector('input').click()",
        );
        await scrollTo(
          "[...document.querySelectorAll('button')].find(e=>e.textContent.trim()==='Revisar antes de enviar')",
          520,
        );
        await record(scene.id, async () => {
          await button("Revisar antes de enviar");
          await pause(1000);
          await button("Confirmar envio ao médico");
          await wait(
            "document.querySelector('main').textContent.includes('Recebido na caixa demonstrativa do médico')",
          );
          await scrollTo(
            "[...document.querySelectorAll('p')].find(e=>e.textContent.includes('Recebido na caixa demonstrativa do médico'))",
            350,
          );
          await pause(1000);
        });
      } else if (scene.action === "event") {
        await button("Adicionar evento");
        await record(scene.id, async () => {
          await pause(1400);
          await evaluate(
            "document.querySelector('[role=dialog]').scrollTo({top:250,behavior:'smooth'})",
          );
          await pause(1300);
        });
        await evaluate(
          "document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))",
        );
      } else if (scene.action === "bell") {
        const b =
          "[...document.querySelectorAll('button')].find(b=>/notifica/i.test(b.getAttribute('aria-label')??''))";
        if (await evaluate(`Boolean(${b})`)) {
          await record(scene.id, async () => {
            await pointTo(b, true);
            await pause(1600);
          });
          await evaluate(
            "document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))",
          );
        } else
          await record(scene.id, async () => {
            await pause(1700);
          });
      } else {
        await record(scene.id, async () => {
          await pause(850);
          await scroll((scene.tab ? 420 : (scene.scroll ?? 0)) + 400);
          await pause(1150);
        });
      }
      const alerts = await evaluate(
        "[...document.querySelectorAll('main [role=alert]')].map(e=>e.textContent).filter(t=>/Não foi possível|não carregou/.test(t))",
      );
      if (alerts.length) throw new Error(scene.id + ": " + alerts.join(" / "));
      facts.push({
        id: scene.id,
        url: await evaluate("location.pathname+location.hash"),
        section: scene.section ?? scene.tab ?? scene.path,
        title: scene.title,
      });
    }
    const existing = existsSync(join(output, "captura-validada.json"))
      ? JSON.parse(readFileSync(join(output, "captura-validada.json"), "utf8"))
      : { facts: [] };
    writeFileSync(
      join(output, "captura-validada.json"),
      JSON.stringify(
        {
          date: "2026-10-10",
          onlyDoctorAndPatient: true,
          liveRecordings: scenes
            .filter((s) => !s.reuse)
            .map((s) => ({
              id: s.id,
              ...JSON.parse(readFileSync(join(recordings, s.id, "frames.json"), "utf8")),
              title: s.title,
              role: s.role,
            })),
          facts: [...existing.facts, ...facts],
        },
        null,
        2,
      ),
    );
  }
} finally {
  browser.close();
  await host.command("Target.disposeBrowserContext", { browserContextId });
  host.close();
}
