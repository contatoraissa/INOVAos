import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { browserSession } from "./browser-session.mjs";
const base = process.env.INOVA_TEST_URL ?? "http://localhost:8081";
const browser = await browserSession();
const { command, wait, evaluate } = browser;
try {
  await command("Page.navigate", { url: base + "/indicators" });
  await wait(
    "document.querySelector('h1')?.textContent==='Meus relatórios'&&Object.keys(document.querySelector('#report-period')??{}).some(k=>k.startsWith('__reactProps'))",
  );
  await wait("!document.querySelector('main').textContent.includes('Carregando atividades')");
  assert.equal(
    await evaluate("document.querySelector('main').textContent.includes('Médicos parceiros')"),
    false,
  );
  assert.equal(
    await evaluate(
      "document.querySelector('main').textContent.includes('Não foi possível carregar')",
    ),
    false,
  );
  for (const period of ["all", "30", "90", "180"]) {
    await evaluate(
      `(()=>{const s=document.querySelector('#report-period');s.value=${JSON.stringify(period)};s.dispatchEvent(new Event('change',{bubbles:true}));})()`,
    );
    await wait(`document.querySelector('#report-period').value===${JSON.stringify(period)}`);
  }
  await command("Emulation.setEmulatedMedia", { media: "print" });
  assert.equal(
    await evaluate(`getComputedStyle(document.querySelector('[class~="print:hidden"]')).display`),
    "none",
  );
  await command("Emulation.setEmulatedMedia", { media: "screen" });
  await command("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  assert.equal(await evaluate("document.documentElement.scrollWidth<=innerWidth+2"), true);
  console.log("PASS: scoped medical reports, period controls, print layout and mobile width");
} finally {
  await command("Emulation.setEmulatedMedia", { media: "screen" });
  await command("Emulation.clearDeviceMetricsOverride");
  browser.close();
}
const result = spawnSync(process.execPath, ["scripts/smoke-admin-workspace.mjs"], {
  env: { ...process.env, INOVA_TEST_URL: base },
  stdio: "inherit",
  timeout: 150000,
  windowsHide: true,
});
if (result.error) throw result.error;
if (result.status !== 0) process.exitCode = 1;
