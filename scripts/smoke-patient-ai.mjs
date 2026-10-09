import assert from "node:assert/strict";
import { browserSession } from "./browser-session.mjs";
const base = process.env.INOVA_TEST_URL ?? "http://localhost:8081";
const browser = await browserSession();
const { command, evaluate, wait, click } = browser;
try {
  await command("Page.navigate", { url: base + "/acesso-paciente" });
  await wait(
    "Object.keys(document.querySelector('#patient-email')??{}).some(k=>k.startsWith('__reactProps'))",
  );
  await click("Explorar demonstração gratuita");
  await wait("location.pathname==='/portal-paciente'&&document.querySelector('main h1')");
  for (const tab of ["Meus resultados", "Minha evolução"]) {
    await click(tab);
    const selector = '[aria-label="Interpretação dos resultados por IA"]';
    await wait(
      `document.querySelector(${JSON.stringify(selector)})?.textContent.includes('Análise de exemplos pelo Gemini')`,
    );
    assert.equal(
      await evaluate(`document.querySelector(${JSON.stringify(selector)}+' button').disabled`),
      true,
    );
    await evaluate(
      `document.querySelector(${JSON.stringify(selector)}+' input[type=checkbox]').click()`,
    );
    await click("Interpretar com Gemini");
    await wait(
      `document.querySelector('[aria-label="Explicação gerada por IA"]')||document.querySelector(${JSON.stringify(selector)}+' [role=alert]')`,
      75000,
    );
    assert.equal(
      await evaluate("!!document.querySelector('[aria-label=\"Explicação gerada por IA\"]')"),
      true,
      await evaluate(
        `document.querySelector(${JSON.stringify(selector)}+' [role=alert]')?.textContent`,
      ),
    );
    console.log("PASS: live Gemini " + tab + " with consent and structured explanation");
  }
} finally {
  browser.close();
}
