import assert from "node:assert/strict";
import { browserSession } from "./browser-session.mjs";
const base = process.env.INOVA_TEST_URL ?? "http://localhost:8081";
const browser = await browserSession();
const { command, evaluate, wait, click, exceptions } = browser;
const routes = [
  "/",
  "/acesso",
  "/acesso-paciente",
  "/dashboard",
  "/patients",
  "/patients/new",
  "/patients/mariana-oliveira",
  "/results",
  "/history",
  "/comparison",
  "/doctors",
  "/follow-up",
  "/indicators",
  "/settings",
  "/agenda",
  "/admin-inova",
];
const sections = [
  "Minha saúde",
  "Minha agenda",
  "Próximos passos",
  "Avisos",
  "Preparar consulta",
  "Orientações do médico",
  "Meus resultados",
  "Exames solicitados",
  "Minha evolução",
  "Preparo dos exames",
  "Laboratórios favoritos",
  "Meus documentos",
  "Minha genética",
  "Linha do tempo",
  "Meu perfil",
];
async function navigate(path) {
  await command("Page.navigate", { url: base + path });
  await wait(
    `location.pathname===${JSON.stringify(path)}&&document.readyState==='complete'&&Object.keys(document.querySelector('button')??document.querySelector('a')??{}).some(k=>k.startsWith('__reactProps'))`,
  );
  assert.equal(
    await evaluate("document.body.textContent.includes('Esta página não carregou')"),
    false,
    path,
  );
}
try {
  for (const width of [1440, 390]) {
    await command("Emulation.setDeviceMetricsOverride", {
      width,
      height: 1000,
      deviceScaleFactor: 1,
      mobile: width === 390,
    });
    for (const path of routes) {
      await navigate(path);
      assert.equal(
        await evaluate("document.documentElement.scrollWidth<=innerWidth+2"),
        true,
        path + " at " + width,
      );
    }
    await evaluate(
      "document.querySelector('a[aria-label=\"INOVA — voltar à página inicial\"]').click()",
    );
    await wait("location.pathname==='/'&&document.querySelector('#produto')");
    assert.equal(
      await evaluate(
        "[...document.querySelectorAll('a')].some(a=>a.textContent.trim()==='Entrar na conta médica'&&a.getAttribute('href')==='/acesso')",
      ),
      true,
    );
    assert.equal(
      await evaluate(
        "[...document.querySelectorAll('a')].some(a=>a.textContent.trim()==='Entrar na conta paciente'&&a.getAttribute('href')==='/acesso-paciente')",
      ),
      true,
    );
    await navigate("/acesso-paciente");
    await click("Explorar demonstração gratuita");
    await wait(
      "location.pathname==='/portal-paciente'&&document.querySelector('main h1')?.textContent==='Minha saúde'",
    );
    for (const label of sections) {
      if (width === 390)
        await evaluate("document.querySelector('[aria-label=\"Abrir menu\"]')?.click()");
      await click(label);
      await wait(`document.querySelector('main h1')?.textContent===${JSON.stringify(label)}`);
      assert.equal(
        await evaluate("document.documentElement.scrollWidth<=innerWidth+2"),
        true,
        label + " at " + width,
      );
      assert.equal(
        await evaluate("document.body.textContent.includes('Esta página não carregou')"),
        false,
        label,
      );
    }
    console.log(
      `PASS: ${routes.length} routes and ${sections.length} patient sections at ${width}px`,
    );
  }
  assert.deepEqual(exceptions, []);
  console.log("PASS: homepage account links, administrator logo and no runtime exceptions");
} finally {
  await command("Emulation.clearDeviceMetricsOverride");
  browser.close();
}
