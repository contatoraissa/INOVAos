import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { presentationBrowser } from "./presentation-browser.mjs";
const directory = resolve("docs/entregaveis/assets/INOVA_visao_completa_2026-10-09");
const browser = await presentationBrowser();
const { command, evaluate, wait, click, pause } = browser;
async function shot(name, scroll) {
  await evaluate(`window.scrollTo(0,${scroll})`);
  await pause(650);
  const image = await command("Page.captureScreenshot", {
    format: "jpeg",
    quality: 88,
    captureBeyondViewport: true,
    clip: { x: 240, y: 78 + (await evaluate("scrollY")), width: 1200, height: 720, scale: 1 },
  });
  writeFileSync(resolve(directory, name + ".jpg"), Buffer.from(image.data, "base64"));
  console.log("Captured:", name);
}
try {
  await command("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });
  if (!process.argv.includes("--admin-only")) {
    await command("Page.navigate", { url: "http://localhost:8081/patients/mariana-oliveira" });
    await wait(
      "Object.keys(document.querySelector('main button')??{}).some(k=>k.startsWith('__reactProps'))",
    );
    await click("Laudos laboratoriais");
    await wait("document.querySelector('input[type=file]')");
    await evaluate(
      `(async()=>{const r=await fetch('/examples/laudo-laboratorial-ficticio.pdf');const d=new DataTransfer();d.items.add(new File([await r.blob()],'Exemplo-laudo-INOVA.pdf',{type:'application/pdf'}));const e=document.querySelector('input[type=file]');e.files=d.files;e.dispatchEvent(new Event('change',{bubbles:true}));})()`,
    );
    await wait("document.body.textContent.includes('Exemplo-laudo-INOVA.pdf')");
    await pause(900);
    await shot("doctor-lab-document", 850);
    await evaluate(
      "[...document.querySelectorAll('label')].find(l=>l.textContent.includes('Confirmo que este PDF')).querySelector('input').click()",
    );
    await click("Analisar com Gemini");
    await wait(
      "document.body.textContent.includes('Gerado pelo Gemini')||document.querySelector('main [role=alert]')",
      75000,
    );
    const error = await evaluate("document.querySelector('main [role=alert]')?.textContent");
    if (error) throw new Error(error);
    await shot("doctor-lab-ai", 1400);
    await command("Page.navigate", { url: "http://localhost:8081/acesso-paciente" });
    await wait(
      "Object.keys(document.querySelector('button')??{}).some(k=>k.startsWith('__reactProps'))",
    );
    await evaluate("sessionStorage.setItem('inova-patient-demo','mariana-oliveira')");
    await command("Page.navigate", { url: "http://localhost:8081/portal-paciente" });
    await wait("document.querySelector('main h1')?.textContent==='Minha saúde'");
    await click("Minha evolução");
    await pause(900);
    await shot("patient-evolution-charts", 1050);
  }
  await command("Page.navigate", { url: "http://localhost:8081/admin-inova" });
  await wait(
    "Object.keys(document.querySelector('button')??{}).some(k=>k.startsWith('__reactProps'))",
  );
  await click("Resumo com IA");
  await wait(
    "[...document.querySelectorAll('label')].some(l=>l.textContent.includes('Autorizo enviar'))",
  );
  await evaluate(
    "[...document.querySelectorAll('label')].find(l=>l.textContent.includes('Autorizo enviar')).querySelector('input').click()",
  );
  await click("Gerar resumo com IA");
  await wait(
    "[...document.querySelectorAll('h2')].some(h=>h.textContent==='Resumo da operação')||document.querySelector('main [role=alert]')",
    75000,
  );
  const adminError = await evaluate("document.querySelector('main [role=alert]')?.textContent");
  if (adminError) throw new Error(adminError);
  await shot("admin-ai-result", 620);
} finally {
  await browser.close();
}
