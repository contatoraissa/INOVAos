import assert from "node:assert/strict";
import { browserSession } from "./browser-session.mjs";
const base = process.env.INOVA_TEST_URL ?? "http://localhost:8081";
const browser = await browserSession();
const { command, wait, click, evaluate } = browser;
async function connection(offline) {
  await command("Network.emulateNetworkConditions", {
    offline,
    latency: 0,
    downloadThroughput: -1,
    uploadThroughput: -1,
  });
}
try {
  await command("Network.enable");
  await command("Page.navigate", { url: base + "/dashboard" });
  await wait(
    "[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Atualizar fila'&&!b.disabled)",
  );
  await wait(
    "Object.keys([...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Atualizar fila')??{}).some(k=>k.startsWith('__reactProps'))",
  );
  await wait(
    "[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Atualizar fila'&&!b.disabled)",
  );
  await connection(true);
  await click("Atualizar fila");
  await wait(
    "document.querySelector('[aria-label=\"Fila de trabalho médica\"]')?.textContent.includes('Não foi possível carregar a fila')",
  );
  await connection(false);
  await click("Atualizar fila");
  await wait(
    "[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Atualizar fila'&&!b.disabled)&&!document.querySelector('[aria-label=\"Fila de trabalho médica\"]').textContent.includes('Não foi possível carregar a fila')",
  );
  assert.equal(
    await evaluate("document.body.textContent.includes('Esta página não carregou')"),
    false,
  );
  console.log("PASS: offline error preserves the medical page and retry recovers the queue");
} finally {
  await connection(false);
  browser.close();
}
