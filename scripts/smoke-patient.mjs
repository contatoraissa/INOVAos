import assert from "node:assert/strict";
import { resolve } from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
const audioTest = process.argv.includes("--audio");
const attachmentTest = process.argv.includes("--audio-attachment");
const deliveryTest = audioTest || attachmentTest;
const base =
  process.env.INOVA_TEST_URL ?? (audioTest ? "http://localhost:8080" : "http://192.168.0.2:8080");
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
try {
  await command("Page.enable");
  await command("Runtime.enable");
  await command("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await command("Page.navigate", { url: base + "/acesso-paciente" });
  await wait('location.pathname==="/acesso-paciente" && document.querySelector("#patient-email")');
  await fill("#patient-password", "invalid");
  errors.length = 0;
  await evaluate(
    'sessionStorage.removeItem("inova-patient-demo");document.querySelector("form").requestSubmit()',
  );
  await wait('document.querySelector("[role=alert]")');
  assert.equal(await evaluate("location.pathname"), "/acesso-paciente");
  console.log("PASS: invalid demonstration credentials stay on patient login");
  await fill("#patient-password", "inova2026");
  await evaluate('document.querySelector("form").requestSubmit()');
  await wait(
    'location.pathname==="/portal-paciente" && document.body.innerText.includes("Olá, Mariana.")',
  );
  assert.equal(
    await evaluate('document.querySelector("nav").innerText.includes("Médicos")'),
    false,
  );
  console.log("PASS: patient login opens a separate patient navigation");
  await click("Meus resultados");
  await wait('document.body.innerText.includes("92")');
  await evaluate('document.querySelector("[aria-label=\\"Coleta dos resultados\\"]").click()');
  await wait('document.querySelectorAll("[role=option]").length>0');
  await evaluate(
    '[...document.querySelectorAll("[role=option]")].find(item=>item.textContent==="Mar/25").click()',
  );
  await wait('document.querySelector("main").innerText.includes("104")');
  console.log("PASS: patient results follow the chosen collection");
  await click("Minha evolução");
  await wait('document.querySelectorAll("[role=img]").length===4');
  assert.equal(
    await evaluate('document.querySelector("main").innerText.includes("Revisão destacada")'),
    false,
  );
  console.log("PASS: patient evolution shows four charts without illustrative medical highlights");
  assert.equal(
    await evaluate(
      'document.querySelector("[aria-label=\\"Perfil usado nas referências\\"]").innerText.includes("14/03/1994")',
    ),
    true,
  );
  assert.equal(
    await evaluate(
      'document.querySelector("[aria-label=\\"Perfil usado nas referências\\"]").innerText.includes("32 anos na última coleta")',
    ),
    true,
  );
  assert.equal(
    await evaluate(
      'document.querySelector("[aria-label=\\"Referência de Hemoglobina\\"]").innerText.includes("11,6 a 15,0 g/dL")',
    ),
    true,
  );
  assert.equal(
    await evaluate(
      'document.querySelector("[aria-label=\\"Referência de Vitamina D\\"]").innerText.includes("20 a 60 ng/mL")',
    ),
    true,
  );
  assert.equal(
    await evaluate(
      'document.querySelector("[aria-label=\\"Referência de Colesterol LDL\\"]").innerText.includes("Meta individual definida pelo médico")',
    ),
    true,
  );
  assert.equal(
    await evaluate(
      'document.querySelector("[aria-label=\\"Referência de Glicemia\\"]").innerText.includes("jejum não está informado")',
    ),
    true,
  );
  console.log(
    "PASS: references use birth-derived age with sources and explicit clinical prerequisites",
  );
  await click("Preparar consulta");
  await fill("#symptoms", "Anotação fictícia para teste");
  await fill("#questions", "Quero conversar sobre meus exames");
  await click("Salvar minhas anotações");
  await wait('document.body.innerText.includes("Anotações salvas neste navegador.")');
  await command("Emulation.setEmulatedMedia", { media: "print" });
  assert.equal(
    await evaluate(
      'getComputedStyle(document.querySelector(".patient-consultation-form")).display',
    ),
    "none",
  );
  assert.equal(
    await evaluate(
      'getComputedStyle(document.querySelector(".patient-preparation-print")).display',
    ),
    "block",
  );
  assert.equal(
    await evaluate(
      'document.querySelector(".patient-preparation-print").innerText.includes("Anotação fictícia para teste")',
    ),
    true,
  );
  await command("Emulation.setEmulatedMedia", { media: "screen" });
  console.log("PASS: print layout uses saved notes without navigation or editable form");
  await click("Meu cuidado");
  await wait('document.querySelector("main").innerText.includes("Salva")');
  await click("Preparar consulta");
  assert.equal(
    await evaluate('document.querySelector("#symptoms").value'),
    "Anotação fictícia para teste",
  );
  console.log("PASS: consultation notes survive navigation and update home status");
  if (audioTest) {
    await evaluate(`(() => {
      globalThis.__audioTestTracks = [];
      globalThis.__denyMicrophone = true;
      navigator.mediaDevices.getUserMedia = async () => {
        if (globalThis.__denyMicrophone) throw new DOMException('Denied', 'NotAllowedError');
        const context = new AudioContext();
        const oscillator = context.createOscillator();
        const destination = context.createMediaStreamDestination();
        oscillator.connect(destination); oscillator.start(); await context.resume();
        for (const track of destination.stream.getTracks()) {
          const stop = track.stop.bind(track);
          track.stop = () => { stop(); oscillator.stop(); void context.close(); };
          globalThis.__audioTestTracks.push(track);
        }
        return destination.stream;
      };
    })()`);
    const audioClick = async (action, label) =>
      evaluate(
        `document.querySelector(${JSON.stringify(`[aria-label="${action}: ${label}"]`)}).click()`,
      );
    const symptomLabel = "Como você tem se sentido?";
    await audioClick("Gravar áudio", symptomLabel);
    await wait('document.body.innerText.includes("Permita o acesso ao microfone")');
    await evaluate("globalThis.__denyMicrophone=false");
    await audioClick("Gravar áudio", symptomLabel);
    await wait('document.body.innerText.includes("Gravando")');
    await new Promise((resolve) => setTimeout(resolve, 1200));
    await audioClick("Concluir áudio", symptomLabel);
    await wait('document.querySelector("audio")');
    await audioClick("Apagar áudio", symptomLabel);
    await wait('!document.querySelector("audio")');
    await audioClick("Gravar áudio", symptomLabel);
    await wait('document.body.innerText.includes("Gravando")');
    await click("Descartar");
    await wait('!document.body.innerText.includes("Gravando")');
    assert.equal(await evaluate('document.querySelector("audio")===null'), true);
    for (const label of [
      symptomLabel,
      "Medicamentos e suplementos",
      "Suas perguntas para a consulta",
    ]) {
      await audioClick("Gravar áudio", label);
      await wait('document.body.innerText.includes("Gravando")');
      await new Promise((resolve) => setTimeout(resolve, 1200));
      await audioClick("Concluir áudio", label);
      await wait(
        `document.querySelector(${JSON.stringify(`[aria-label="Ouvir áudio: ${label}"]`)})`,
      );
    }
    assert.equal(
      await evaluate('globalThis.__audioTestTracks.every(track=>track.readyState==="ended")'),
      true,
    );
    mkdirSync("artifacts", { recursive: true });
    const recorded = await evaluate(
      `fetch(document.querySelector('audio').src).then(response=>response.arrayBuffer()).then(buffer=>btoa(String.fromCharCode(...new Uint8Array(buffer))))`,
    );
    writeFileSync("artifacts/test-recorded-audio.webm", Buffer.from(recorded, "base64"));
    console.log(
      "PASS: microphone denial, native MediaRecorder, delete/rerecord, three audio answers and microphone cleanup",
    );
  } else {
    assert.equal(
      await evaluate(
        'document.querySelector("[aria-label=\\"Gravar áudio: Como você tem se sentido?\\"]").disabled',
      ),
      true,
    );
    console.log(
      "PASS: insecure LAN access explains microphone restriction and offers audio attachment",
    );
    if (attachmentTest) {
      const tree = await command("DOM.getDocument");
      for (const label of [
        "Como você tem se sentido?",
        "Medicamentos e suplementos",
        "Suas perguntas para a consulta",
      ]) {
        const input = await command("DOM.querySelector", {
          nodeId: tree.root.nodeId,
          selector: `[aria-label="Adicionar áudio: ${label}"]`,
        });
        await command("DOM.setFileInputFiles", {
          nodeId: input.nodeId,
          files: [resolve("artifacts/test-recorded-audio.webm")],
        });
        await wait(
          `document.querySelector(${JSON.stringify(`[aria-label="Ouvir áudio: ${label}"]`)})`,
        );
      }
      console.log("PASS: all three audio attachments work on insecure LAN address");
    }
  }
  await click("Meus documentos");
  const tree = await command("DOM.getDocument");
  const field = await command("DOM.querySelector", {
    nodeId: tree.root.nodeId,
    selector: 'input[type="file"]',
  });
  await command("DOM.setFileInputFiles", {
    nodeId: field.nodeId,
    files: [resolve("public/examples/laudo-laboratorial-ficticio.pdf")],
  });
  await wait('document.querySelector("iframe")');
  if (deliveryTest) {
    await click("Preparar consulta");
    await evaluate(
      '[...document.querySelectorAll(".patient-consultation-form input[type=checkbox]")].forEach(input=>input.click())',
    );
    await click("Revisar antes de enviar");
    await wait(
      `document.querySelector('[role="dialog"]')?.textContent.includes("Confira seu envio ao médico")`,
    );
    await click("Confirmar envio ao médico");
    await wait('document.body.innerText.includes("Recebido na caixa demonstrativa do médico")');
    await wait('document.body.innerText.includes("3 áudio(s) e 1 laudo(s)")');
    assert.equal(
      await evaluate(
        '[...document.querySelectorAll("button")].find(item=>item.textContent.trim()==="Preparação enviada").disabled',
      ),
      true,
    );
    console.log("PASS: three audio answers and a PDF are delivered to the server inbox");
    await click("Meus documentos");
  }
  await fill('[aria-label="Pesquisar meus documentos"]', "missing");
  await wait('document.body.innerText.includes("Nenhum documento encontrado.")');
  await fill('[aria-label="Pesquisar meus documentos"]', "");
  await click("Remover");
  await wait('!document.querySelector("iframe")');
  console.log("PASS: patient PDF upload, preview, search and removal");
  await click("Meu perfil");
  await fill("#profile-phone", "11999999999");
  await click("Salvar contato nesta sessão");
  await wait('document.body.innerText.includes("Contato atualizado nesta sessão.")');
  await click("Meu cuidado");
  mkdirSync("artifacts", { recursive: true });
  const screenshot = await command("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
  });
  writeFileSync("artifacts/patient-portal.png", Buffer.from(screenshot.data, "base64"));
  await command("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  assert.equal(await evaluate("document.documentElement.scrollWidth>innerWidth+2"), false);
  await evaluate('document.querySelector("[aria-label=\\"Abrir menu\\"]").click()');
  await click("Meus documentos");
  assert.equal(
    await evaluate('document.querySelector("[aria-label=\\"Fechar menu\\"]")!==null'),
    false,
  );
  console.log("PASS: mobile patient menu and layout");
  await command("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await click("Sair do meu espaço");
  await wait('location.pathname==="/acesso-paciente"');
  await command("Page.navigate", { url: base + "/portal-paciente" });
  await wait('location.pathname==="/acesso-paciente" && document.querySelector("#patient-email")');
  console.log("PASS: logout clears demo access; direct portal entry returns to login");
  if (deliveryTest) {
    await command("Page.navigate", { url: base + "/patients/mariana-oliveira" });
    await wait(
      'document.querySelector("main") && [...document.querySelectorAll("button")].some(item=>item.textContent.trim()==="Envios do paciente")',
    );
    await wait(
      'Object.keys([...document.querySelectorAll("button")].find(item=>item.textContent.trim()==="Envios do paciente") || {}).some(key=>key.startsWith("__reactProps"))',
    );
    await click("Envios do paciente");
    await wait('document.body.innerText.includes("3 áudio(s) · 1 laudo(s)")');
    await click("Ouvir áudio recebido");
    await wait('document.querySelector("audio")?.readyState>=1');
    await evaluate(
      'document.querySelector("audio").play().then(()=>document.querySelector("audio").pause())',
    );
    await click("Abrir laudo recebido");
    await wait('document.querySelector("iframe")');
    await click("Abrir na análise de laudos");
    await wait(
      'document.body.innerText.includes("Enviado pelo paciente · confirmar identidade no laudo")',
    );
    await click("Envios do paciente");
    await wait('document.body.innerText.includes("Marcar envio como revisado")');
    await click("Marcar envio como revisado");
    await wait('document.body.innerText.includes("Envio revisado")');
    await click("Remover envio da caixa");
    await wait('!document.body.innerText.includes("3 áudio(s) · 1 laudo(s)")');
    console.log(
      "PASS: doctor receives playable audio and PDF, opens analysis, reviews and removes the submission",
    );
  }
  assert.deepEqual(errors, []);
  console.log("PASS: no patient browser runtime exceptions");
} finally {
  ws.close();
}
