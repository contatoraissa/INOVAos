import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { presentationBrowser } from "./presentation-browser.mjs";
const base = process.env.INOVA_TEST_URL ?? "http://localhost:8081";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname))
  throw new Error("Use the local demonstration only.");
const directory = resolve("docs/entregaveis/assets/INOVA_visao_completa_2026-10-09");
mkdirSync(directory, { recursive: true });
const browser = await presentationBrowser();
const { command, evaluate, wait, click, pause } = browser;
const manifest = [];
async function navigate(path) {
  await command("Page.navigate", { url: base + path });
  await wait(
    `location.pathname===${JSON.stringify(path)}&&document.readyState==='complete'&&Object.keys(document.querySelector('button')??document.querySelector('a')??{}).some(k=>k.startsWith('__reactProps'))`,
  );
  await evaluate("document.fonts.ready");
  await pause(600);
}
async function shot(name, label, { full = false, scroll = 0 } = {}) {
  await evaluate(`window.scrollTo(0,${scroll})`);
  await pause(650);
  const errors = await evaluate(
    "[...document.querySelectorAll('main [role=alert]')].map(e=>e.textContent).filter(Boolean)",
  );
  if (errors.some((e) => /Não foi possível|não carregou/.test(e)))
    throw new Error(name + ": " + errors.join(" / "));
  const image = await command("Page.captureScreenshot", {
    format: "jpeg",
    quality: 88,
    captureBeyondViewport: !full,
    ...(full
      ? {}
      : {
          clip: { x: 240, y: 78 + (await evaluate("scrollY")), width: 1200, height: 720, scale: 1 },
        }),
  });
  writeFileSync(resolve(directory, name + ".jpg"), Buffer.from(image.data, "base64"));
  manifest.push({
    name,
    label,
    url: await evaluate("location.pathname + location.hash"),
    cropped: !full,
    scroll,
  });
  console.log("Captured:", name);
}
async function detail(label, name, scroll = 380) {
  await click(label);
  await pause(450);
  await shot(name, label, { scroll });
}
try {
  await command("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await navigate("/");
  await shot("home", "Página inicial", { full: true });
  await navigate("/acesso");
  await shot("access-doctor", "Acesso médico", { full: true });
  await navigate("/acesso-paciente");
  await shot("access-patient", "Acesso paciente", { full: true });
  for (const [path, name, label] of [
    ["/dashboard", "doctor-home", "Visão geral médica"],
    ["/patients", "doctor-patients", "Pacientes"],
    ["/patients/new", "doctor-new", "Novo paciente"],
    ["/results", "doctor-results", "Novos resultados"],
    ["/history", "doctor-history", "Histórico de exames"],
    ["/comparison", "doctor-comparison", "Comparação"],
    ["/doctors", "doctor-profile", "Meu perfil médico"],
    ["/follow-up", "doctor-followup", "Acompanhamento"],
    ["/indicators", "doctor-reports", "Meus relatórios"],
    ["/settings", "doctor-settings", "Configurações"],
    ["/agenda", "doctor-agenda", "Agenda médica"],
  ]) {
    await navigate(path);
    await shot(name, label, {
      full: name === "doctor-home",
      scroll: name === "doctor-agenda" ? 450 : 0,
    });
  }
  await navigate("/patients/mariana-oliveira");
  await shot("doctor-patient-header", "Prontuário e navegação");
  for (const [label, name] of [
    ["Resumo da consulta", "doctor-summary"],
    ["Envios do paciente", "doctor-inbox"],
    ["Solicitar exames", "doctor-orders"],
    ["Orientações ao paciente", "doctor-guidance"],
    ["Visão geral", "doctor-overview"],
    ["Resultados", "doctor-patient-results"],
    ["Histórico", "doctor-patient-history"],
    ["Comparação", "doctor-patient-comparison"],
    ["Histórico familiar", "doctor-family"],
    ["Laudos laboratoriais", "doctor-lab"],
    ["Genética", "doctor-genetics"],
    ["Genômica", "doctor-genomics"],
    ["Documentos", "doctor-documents"],
  ])
    await detail(label, name);
  // Populate only the current tab's document library with the included fictional PDF.
  await click("Laudos laboratoriais");
  await wait("document.querySelector('input[type=file]')");
  await evaluate(
    `(async()=>{const response=await fetch('/examples/laudo-laboratorial-ficticio.pdf');const transfer=new DataTransfer();transfer.items.add(new File([await response.blob()],'Exemplo-laudo-INOVA.pdf',{type:'application/pdf'}));const input=document.querySelector('input[type=file]');input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));})()`,
  );
  await pause(750);
  await shot("doctor-lab-preview", "Laudo PDF original e análise assistida", { scroll: 410 });
  await navigate("/acesso-paciente");
  await evaluate("sessionStorage.setItem('inova-patient-demo','mariana-oliveira')");
  await navigate("/portal-paciente");
  await wait("document.querySelector('main h1')?.textContent==='Minha saúde'");
  for (const [label, name] of [
    ["Minha saúde", "patient-home"],
    ["Minha agenda", "patient-agenda"],
    ["Próximos passos", "patient-next"],
    ["Avisos", "patient-alerts"],
    ["Preparar consulta", "patient-preparation"],
    ["Orientações do médico", "patient-guidance"],
    ["Meus resultados", "patient-results"],
    ["Exames solicitados", "patient-orders"],
    ["Minha evolução", "patient-evolution"],
    ["Preparo dos exames", "patient-exam-preparation"],
    ["Laboratórios favoritos", "patient-favorites"],
    ["Meus documentos", "patient-documents"],
    ["Minha genética", "patient-genetics"],
    ["Linha do tempo", "patient-timeline"],
    ["Meu perfil", "patient-profile"],
  ]) {
    await click(label);
    await wait(`document.querySelector('main h1')?.textContent===${JSON.stringify(label)}`);
    await shot(name, label, {
      full: name === "patient-home",
      scroll:
        name === "patient-agenda"
          ? 380
          : name === "patient-evolution"
            ? 650
            : name === "patient-preparation"
              ? 190
              : 0,
    });
    if (name === "patient-orders") {
      await wait("document.querySelector('#order-cep')");
      await evaluate(
        `(()=>{const e=document.querySelector('#order-cep');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,'18035-000');e.dispatchEvent(new Event('input',{bubbles:true}));})()`,
      );
      await click("Simular consulta de preços");
      await wait(
        "[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Explorar exames e laboratórios')",
      );
      await click("Explorar exames e laboratórios");
      await wait("document.querySelector('[role=dialog]')");
      await click("Comparar laboratórios");
      await wait("document.body.textContent.includes('Laboratório Centro · fictício')");
      await shot("patient-s2", "Cotação e comparação de laboratórios simuladas", { full: true });
      await evaluate(
        "document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))",
      );
      await wait("!document.querySelector('[role=dialog]')");
    }
  }
  await navigate("/admin-inova");
  for (const [label, name] of [
    ["Visão geral", "admin-home"],
    ["Usuários", "admin-users"],
    ["Atividade", "admin-activity"],
    ["Assinaturas", "admin-subscriptions"],
    ["Contatos e reativação", "admin-contacts"],
    ["Feedbacks", "admin-feedback"],
    ["Resumo com IA", "admin-ai"],
  ]) {
    await click(label);
    await wait(`document.querySelector('h1')?.textContent===${JSON.stringify(label)}`);
    await shot(name, label, {
      full: name === "admin-home",
      scroll: name === "admin-home" ? 290 : 0,
    });
  }
  writeFileSync(
    resolve(directory, "manifest.json"),
    JSON.stringify(
      {
        date: "2026-10-09",
        version: "1e5cbbf",
        viewport: { width: 1440, height: 900 },
        source: "Demonstração local; dados fictícios",
        screens: manifest,
      },
      null,
      2,
    ),
  );
  console.log("Screens:", manifest.length);
} finally {
  await browser.close();
}
