import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
const targets = await fetch("http://127.0.0.1:9222/json/list").then((response) => response.json());
const target = targets.find((item) => item.type === "page");
const baseUrl = process.env.INOVA_TEST_URL ?? "http://127.0.0.1:5173";
const liveAi = process.argv.includes("--live-ai");
if (!target) throw new Error("Start a headless Chrome session on port 9222.");
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  ws.addEventListener("open", resolve, { once: true });
  ws.addEventListener("error", reject, { once: true });
});
let id = 0;
const pending = new Map();
const errors = [];
ws.addEventListener("message", (event) => {
  const message = JSON.parse(String(event.data));
  if (message.id) {
    const item = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) item?.reject(new Error(message.error.message));
    else item?.resolve(message.result);
  }
  if (message.method === "Runtime.exceptionThrown")
    errors.push(message.params.exceptionDetails.text);
});
const command = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const key = ++id;
    pending.set(key, { resolve, reject });
    ws.send(JSON.stringify({ id: key, method, params }));
  });
const evaluate = async (expression) => {
  const result = await command("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (result.exceptionDetails)
    throw new Error(result.exceptionDetails.exception?.description ?? "Browser evaluation failed");
  return result.result.value;
};
const wait = async (expression, timeoutMs = 20000) => {
  for (let count = 0; count < timeoutMs / 200; count++) {
    if (await evaluate("Boolean(" + expression + ")")) return;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error("Timed out waiting for browser condition: " + expression);
};
const button = async (text) =>
  evaluate(
    `(()=>{const element=[...document.querySelectorAll("button")].find(item=>item.textContent.trim()===${JSON.stringify(text)});if(!element)throw new Error("Button missing");element.click();})()`,
  );
const fill = async (selector, value) => {
  await wait(
    `Object.keys(document.querySelector(${JSON.stringify(selector)}) || {}).some(key => key.startsWith("__reactProps"))`,
  );
  return evaluate(
    `(()=>{const element=document.querySelector(${JSON.stringify(selector)});if(!element)throw new Error("Input missing");Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set.call(element,${JSON.stringify(value)});element.dispatchEvent(new Event("input",{bubbles:true}));element.dispatchEvent(new Event("change",{bubbles:true}));})()`,
  );
};
const navigate = async (path) => {
  await command("Page.navigate", { url: baseUrl + path });
  await wait(`location.pathname===${JSON.stringify(path)}`);
  await wait(
    'document.readyState==="complete" && document.querySelector("main") && document.querySelector("button")',
  );
  await wait(
    'Object.keys(document.querySelector("button") || {}).some(key => key.startsWith("__reactProps"))',
  );
};
await command("Page.enable");
await command("Runtime.enable");
await command("Page.addScriptToEvaluateOnNewDocument", {
  source: 'Object.defineProperty(crypto, "randomUUID", { value: undefined, configurable: true })',
});
await command("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 1000,
  deviceScaleFactor: 1,
  mobile: false,
});
try {
  await navigate("/patients/new");
  errors.length = 0;
  await fill('input[name="name"]', "Paciente Teste INOVA");
  await fill('input[name="cpf"]', "000.000.000-00");
  await fill('input[name="birth"]', "1990-01-01");
  await evaluate('document.querySelector("form").requestSubmit()');
  await wait(
    'location.pathname==="/patients" && document.body.innerText.includes("Paciente Teste INOVA")',
  );
  console.log("PASS: patient registration updates directory");
  await evaluate(
    '[...document.querySelectorAll("tr")].find(row=>row.textContent.includes("Paciente Teste INOVA")).querySelector("button").click()',
  );
  await wait('document.body.innerText.includes("Resultados ainda indisponíveis")');
  console.log("PASS: new patient has no borrowed clinical history");
  await navigate("/doctors");
  await wait('document.querySelector("h1")?.textContent==="Meu perfil profissional"');
  assert.equal(
    await evaluate('document.querySelector("#profile-name").value'),
    "Dr. Rafael Mendes",
  );
  console.log("PASS: physician professional profile");
  await navigate("/results");
  const count = await evaluate('document.querySelectorAll("tbody tr").length');
  await button("30 dias");
  await wait('document.querySelectorAll("tbody tr").length>' + count);
  console.log("PASS: results date filter changes rows");
  await navigate("/patients/mariana-oliveira");
  await button("Genética");
  await button("Ver resumo demonstrativo");
  await wait('document.querySelector("[aria-label=\\"Resultado da análise por IA\\"]")');
  const scrollCheck = await evaluate(`(() => {
    const panel = document.querySelector('[aria-label="Resultado da análise por IA"]');
    const pagePosition = window.scrollY;
    panel.scrollTop = 100;
    return { internal: panel.scrollTop > 0, pageStable: window.scrollY === pagePosition };
  })()`);
  assert.equal(scrollCheck.internal, true, "AI result should scroll inside its panel");
  assert.equal(scrollCheck.pageStable, true, "Scrolling AI result should keep page position");
  console.log("PASS: AI result scrolls internally without moving the page");
  await button("Marcar síntese como revisada");
  await button("Resumo da consulta");
  await wait(
    '[...document.querySelectorAll(".metric-card")].find(item=>item.textContent.includes("Laudos a revisar"))?.textContent.includes("1")',
  );
  console.log("PASS: report review updates consultation summary");
  await button("Resultados");
  const before = await evaluate('document.querySelector("main").innerText.includes("92")');
  assert.equal(before, true);
  await evaluate(
    'document.querySelector("button[aria-label=\\"Coleta dos resultados\\"]").click()',
  );
  await wait('document.querySelectorAll("[role=option]").length>0');
  await evaluate(
    '[...document.querySelectorAll("[role=option]")].find(item=>item.textContent==="Mar/25").click()',
  );
  await wait('document.querySelector("main").innerText.includes("104")');
  console.log("PASS: selecting a collection changes laboratory results");
  await button("Laudos laboratoriais");
  const document = await command("DOM.getDocument");
  const found = await command("DOM.querySelector", {
    nodeId: document.root.nodeId,
    selector: 'input[type="file"][accept*="pdf"]',
  });
  await command("DOM.setFileInputFiles", {
    nodeId: found.nodeId,
    files: [resolve("public/examples/laudo-laboratorial-ficticio.pdf")],
  });
  await wait(
    'document.querySelector("iframe") && document.body.innerText.includes("laudo-laboratorial-ficticio.pdf")',
  );
  console.log("PASS: uploaded PDF has original document preview");
  if (liveAi) {
    await wait('document.body.innerText.includes("Gemini configurado")');
    await evaluate('document.querySelector("main input[type=checkbox]").click()');
    await button("Analisar com Gemini");
    await wait(
      'document.body.innerText.includes("Gerado pelo Gemini") || document.querySelector("main [role=alert]")',
      100000,
    );
    assert.equal(
      await evaluate('document.body.innerText.includes("Gerado pelo Gemini")'),
      true,
      await evaluate(
        'document.querySelector("main [role=alert]")?.textContent ?? "No generated summary"',
      ),
    );
    await wait('document.body.innerText.includes("Resultados extraídos")');
    console.log("PASS: live Gemini analysis through the application");
    await evaluate(
      '[...document.querySelectorAll("main button")].find(item=>item.textContent.includes("Conferir fonte sugerida")).click()',
    );
    await wait(
      'document.querySelector("[role=dialog]") && document.querySelector("iframe").src.includes("#page=")',
    );
    await evaluate(
      'document.querySelector("[role=dialog] button[data-slot=dialog-close]")?.click()',
    );
    await command("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape" });
    await command("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape" });
    await wait('!document.querySelector("[role=dialog]")');
    await button("Marcar síntese como revisada");
    console.log("PASS: generated source opens the original PDF page and review is recorded");
  }
  await button("Resumo da consulta");
  await wait(
    'document.querySelector("main").innerText.includes("laudo-laboratorial-ficticio.pdf")',
  );
  console.log("PASS: uploaded document appears in consultation summary");
  for (const tab of ["Genética", "Genômica"]) {
    await button(tab);
    const tree = await command("DOM.getDocument");
    const field = await command("DOM.querySelector", {
      nodeId: tree.root.nodeId,
      selector: 'input[type="file"][accept*="pdf"]',
    });
    await command("DOM.setFileInputFiles", {
      nodeId: field.nodeId,
      files: [resolve("public/examples/laudo-genomico-ficticio.pdf")],
    });
    await wait(
      'document.querySelector("iframe") && document.querySelector("main").innerText.includes("laudo-genomico-ficticio.pdf")',
    );
    console.log(`PASS: ${tab} PDF upload without crypto.randomUUID`);
    if (liveAi && tab === "Genômica") {
      await wait('document.body.innerText.includes("Gemini configurado")');
      await evaluate('document.querySelector("main input[type=checkbox]").click()');
      await button("Analisar com Gemini");
      await wait(
        'document.body.innerText.includes("Gerado pelo Gemini") || document.querySelector("main [role=alert]")',
        100000,
      );
      assert.equal(
        await evaluate('document.body.innerText.includes("Gerado pelo Gemini")'),
        true,
        await evaluate(
          'document.querySelector("main [role=alert]")?.textContent ?? "No genomic summary"',
        ),
      );
      console.log("PASS: live genomic PDF analysis through the application");
    }
  }
  mkdirSync("artifacts", { recursive: true });
  const screenshot = await command("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
  });
  writeFileSync("artifacts/doctor-workspace.png", Buffer.from(screenshot.data, "base64"));
  await command("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await wait('document.querySelector("main")');
  const overflow = await evaluate("document.documentElement.scrollWidth > innerWidth + 2");
  assert.equal(overflow, false, "Mobile viewport has page-level horizontal overflow");
  console.log("PASS: mobile layout does not overflow");
  assert.deepEqual(errors, [], "Browser runtime exceptions were recorded");
  console.log("PASS: no browser runtime exceptions");
} finally {
  ws.close();
}
