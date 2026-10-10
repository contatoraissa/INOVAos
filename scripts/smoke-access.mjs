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
async function wait(expression) {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    if (await evaluate(`Boolean(${expression})`)) return;
    await pause(100);
  }
  throw new Error("Timed out waiting for hydration: " + expression);
}
const base = process.env.INOVA_TEST_URL ?? "http://192.168.0.2:8080";
try {
  await command("Emulation.setDeviceMetricsOverride", {
    width: 1366,
    height: 680,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await command("Page.navigate", { url: base + "/" });
  await wait(
    "document.querySelector('#produto') && Object.keys(document.querySelector('#product-tab-1') ?? {}).some(key=>key.startsWith('__reactProps'))",
  );
  assert.equal(await evaluate("!!document.querySelector('#produto')"), true);
  await evaluate("document.querySelector('#product-tab-1').click()");
  await wait(
    "document.querySelector('#product-preview')?.textContent.includes('Síntese do documento')",
  );
  assert.equal(
    await evaluate(
      "document.querySelector('#product-preview').textContent.includes('Síntese do documento')",
    ),
    true,
  );
  await command("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await pause(200);
  assert.equal(await evaluate("document.documentElement.scrollWidth <= innerWidth"), true);
  await command("Emulation.setDeviceMetricsOverride", {
    width: 1366,
    height: 680,
    deviceScaleFactor: 1,
    mobile: false,
  });
  for (const path of ["/acesso", "/acesso-paciente"]) {
    await command("Page.navigate", { url: base + path });
    await wait(
      "document.querySelector('form') && Object.keys(document.querySelector('form')).some(key=>key.startsWith('__reactProps'))",
    );
    if (path === "/acesso-paciente")
      assert.equal(
        await evaluate("document.documentElement.scrollHeight <= innerHeight + 1"),
        true,
        "Patient login fits desktop height",
      );
    assert.equal(
      await evaluate(
        "[...document.querySelectorAll('button, a')].some(b=>b.textContent.includes('Entrar na conta'))",
      ),
      true,
    );
    assert.equal(
      await evaluate(
        `[...document.querySelectorAll('button, a')].some(b=>b.textContent.includes('${path === "/acesso" ? "Ver demonstração médica" : "Explorar demonstração"}'))`,
      ),
      true,
    );
    await evaluate(
      "[...document.querySelectorAll('button, a')].find(b=>b.textContent.includes('Criar minha conta')).click()",
    );
    await wait("document.querySelector('[name=fullName]')");
    assert.equal(await evaluate("document.forms.length"), 1);
    assert.equal(await evaluate("!!document.querySelector('[name=fullName]')"), true);
    if (path === "/acesso-paciente")
      assert.equal(
        await evaluate("document.documentElement.scrollHeight <= innerHeight + 1"),
        true,
        "Patient signup fits desktop height",
      );
    await evaluate(
      "[...document.querySelectorAll('button, a')].find(b=>b.textContent.includes('Voltar para entrar')).click()",
    );
    await wait("!document.querySelector('[name=fullName]') && document.querySelector('form')");
    assert.equal(await evaluate("!!document.querySelector('[name=fullName]')"), false);
  }
  await command("Page.navigate", { url: base + "/acesso" });
  await wait(
    "document.querySelector('form') && Object.keys(document.querySelector('form')).some(key=>key.startsWith('__reactProps'))",
  );
  await evaluate(
    "[...document.querySelectorAll('a')].find(a=>a.textContent.includes('Ver demonstração médica')).click()",
  );
  await wait(
    "location.pathname==='/dashboard' && document.body.textContent.includes('Dr. Rafael Mendes')",
  );
  assert.equal(await evaluate("location.pathname"), "/dashboard");
  assert.equal(await evaluate("document.body.textContent.includes('Dr. Rafael Mendes')"), true);
  for (const path of ["/dashboard", "/patients", "/results"]) {
    await command("Page.navigate", { url: base + path });
    await wait("document.body.textContent.includes('Ambiente demonstrativo')");
    assert.equal(await evaluate("location.pathname"), path);
    assert.equal(
      await evaluate("document.body.textContent.includes('Ambiente demonstrativo')"),
      true,
    );
  }
  await command("Page.navigate", { url: base + "/confirmar-email" });
  await wait("document.body.textContent.includes('entre com sua senha')");
  assert.equal(await evaluate("document.body.textContent.includes('entre com sua senha')"), true);
  console.log(
    "PASS: sales preview, mobile width, separate real/demo logins, card switching, confirmation without token. No account or email created.",
  );
} finally {
  ws.close();
}
