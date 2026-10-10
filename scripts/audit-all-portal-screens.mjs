import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { browserSession } from "./browser-session.mjs";
import { injection, chart } from "./account-parity-fixtures.mjs";

const base = process.env.INOVA_TEST_URL ?? "http://localhost:8081";
if (!/^(localhost|127\.0\.0\.1)$/.test(new URL(base).hostname)) throw new Error("Use a local test server.");
const output = "artifacts/screen-code-audit";
mkdirSync(output, { recursive: true });
const browser = await browserSession();
const { command, evaluate, wait, click } = browser;
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const routeCases = [
  ["dashboard","Seu dia","O que precisa da sua atenção","Explorar pacientes"],
  ["agenda","Minha agenda","Adicionar evento","Prepare seu dia com IA"],
  ["patients","Pacientes","Novo paciente","Pesquisar por"],
  ["patients/new","Cadastrar paciente","E-mail","Cadastrar paciente"],
  ["results","Novos resultados","Última coleta","30 dias"],
  ["history","Histórico de exames","Pesquisar"],
  ["comparison","Comparação","Comparar"],
  ["doctors","Meu perfil","CRM","Salvar perfil"],
  ["follow-up","Acompanhamento","Ver evolução"],
  ["indicators","Meus relatórios","Minha atividade por mês","Publicações e documentos"],
  ["settings","Configurações","Notificações","Salvar alterações"],
];
const tabCases = [
  ["Resumo da consulta","Checklist da consulta","Próximos passos e pendências","Período dos gráficos"],
  ["Envios do paciente","Atualizar caixa","Imprimir"],
  ["Solicitar exames","Observações","Buscar"],
  ["Orientações ao paciente","Categoria","Fonte","Orientação"],
  ["Visão geral","Período dos gráficos","Resumo do histórico","Gerar resumo"],
  ["Resultados","Coleta dos resultados","Hemoglobina"],
  ["Histórico","Evolução dos exames","Resultados da coleta selecionada"],
  ["Comparação","Variação","Ver prévia da análise"],
  ["Histórico familiar","Histórico familiar","Genética"],
  ["Laudos laboratoriais","Adicionar PDF","Laudo"],
  ["Genética","Atualizar genética","Neurologia","Metabólico","Imunidade","Nutrição"],
  ["Genômica","Adicionar PDF","Laudo"],
  ["Documentos","documento","Pesquisar"],
];
const sectionCases = [
  ["Minha saúde","Por onde começar","Encontrar no meu espaço","Ver orientações"],
  ["Minha agenda","Adicionar evento","Seus exames solicitados"],
  ["Próximos passos","próximos passos"],
  ["Avisos","aviso"],
  ["Preparar consulta","O que você quer conversar?","Salvar minhas anotações","Tipo de documento","Meus envios ao médico","Revisar antes de enviar"],
  ["Orientações do médico","Retorno","orienta"],
  ["Meus resultados","Coleta dos resultados","Explicação"],
  ["Exames solicitados","Exames para realizar","Seu acompanhamento deste pedido","Consultar"],
  ["Minha evolução","Período dos gráficos","Explicação"],
  ["Preparo dos exames","Preparo"],
  ["Laboratórios favoritos","Adicionar favorito","CEP"],
  ["Meus documentos","Tipo de documento","Pesquisar","Enviar junto"],
  ["Minha genética","Atualizar genética","Neurologia","Imunidade"],
  ["Linha do tempo","Atualizar acompanhamento","Todos","Buscar"],
  ["Meu perfil","E-mail","Telefone"],
];
const captures = [];
const problems = [];
async function navigate(path) {
  await command("Page.navigate", { url: base + path });
  await wait("document.querySelector('h1') && !document.body.innerText.includes('Abrindo sua conta')");
  await wait("Object.keys(document.querySelector('h1')||{}).some(k=>k.startsWith('__reactProps'))");
  await pause(600);
}
async function capture(mode, area, name, checks = []) {
  await pause(350);
  const state = await evaluate(`(()=>{
    const visible = e => !!e.getClientRects().length && !e.closest('[hidden]') && getComputedStyle(e).visibility !== 'hidden';
    const controls = [...document.querySelectorAll('main button,main a,main input,main select,main textarea')].filter(visible).map(e=>({tag:e.tagName,text:e.textContent.trim(),label:e.getAttribute('aria-label')||'',placeholder:e.getAttribute('placeholder')||'',type:e.getAttribute('type')||'',disabled:!!e.disabled}));
    const headings=[...document.querySelectorAll('main h1,main h2,main h3')].filter(visible).map(e=>e.textContent.trim());
    return {headings,controls,text:document.body.innerText,overflow:document.documentElement.scrollWidth>innerWidth+2,unexpected:window.__parityUnexpected??[]};
  })()`);
  const searchable = JSON.stringify(state).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
  for (const label of checks) {
    if (!searchable.includes(label.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase())) problems.push({mode,area,name,missing:label});
  }
  if (state.overflow) problems.push({mode,area,name,missing:"No horizontal viewport overflow"});
  if (state.unexpected.length) problems.push({mode,area,name,missing:"Unknown RPC",rpc:state.unexpected});
  if (mode === "account" && /Mariana Oliveira|Rafael Mendes|Carlos Henrique Souza/.test(state.text)) problems.push({mode,area,name,missing:"Demo isolation"});
  const filename = `${mode}-${area}-${captures.length.toString().padStart(2,"0")}.png`;
  const metrics = await command("Page.getLayoutMetrics");
  const height = Math.min(metrics.cssContentSize.height, 12000);
  const width = await evaluate("innerWidth");
  const shot = await command("Page.captureScreenshot", { format:"png",captureBeyondViewport:true,clip:{x:0,y:0,width,height,scale:1} });
  writeFileSync(output + "/" + filename, Buffer.from(shot.data,"base64"));
  captures.push({mode,area,name,filename,...state});
  console.log("CAPTURE " + mode + " / " + area + " / " + name);
}
let script;
try {
  ({identifier:script}=await command("Page.addScriptToEvaluateOnNewDocument",{source:injection}));
  await command("Emulation.setDeviceMetricsOverride",{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  for (const mode of ["demo","account"]) {
    const account = mode === "account";
    const query = account ? "?workspace=account" : "";
    await evaluate("sessionStorage.setItem('__parityRole','doctor')");
    await navigate("/dashboard"+query);
    for (const [route,...checks] of routeCases) {
      await navigate("/"+route+query);
      await capture(mode,"doctor",route,account?checks:[]);
      assert.equal(await evaluate("document.querySelectorAll('aside nav a').length"),11);
    }
    await navigate("/patients/"+(account?chart:"mariana-oliveira")+query);
    for (const [tab,...checks] of tabCases) {
      await click(tab);
      await capture(mode,"chart",tab,account?checks:[]);
    }
    await evaluate("sessionStorage.setItem('__parityRole','patient')");
    if(account) await navigate("/portal-paciente"+query);
    else {await navigate("/acesso-paciente"); await click("Explorar demonstração gratuita");}
    await wait("document.querySelector('h1')?.textContent==='Minha saúde'");
    for (const [label,...checks] of sectionCases) {
      await click(label);
      await wait(`document.querySelector('h1')?.textContent===${JSON.stringify(label)}`);
      await capture(mode,"patient",label,account?checks:[]);
    }
    await command("Emulation.setDeviceMetricsOverride",{width:390,height:844,deviceScaleFactor:1,mobile:true});
    await capture(mode,"mobile","patient-profile");
    await evaluate("sessionStorage.setItem('__parityRole','doctor')");
    await navigate("/dashboard"+query);
    await capture(mode,"mobile","doctor-dashboard");
    await command("Emulation.setDeviceMetricsOverride",{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  }
  for (const route of ["/","/acesso","/acesso-paciente"]) {
    await navigate(route);
    await capture("shared","public",route);
  }
  if (browser.exceptions.length) problems.push({exceptions:browser.exceptions});
  writeFileSync(output+"/screens.json",JSON.stringify({date:new Date().toISOString(),captures,problems},null,2));
  assert.deepEqual(problems,[],"Review artifacts/screen-code-audit/screens.json");
  console.log(`PASS ${captures.length} full-screen captures, 11 doctor routes, 13 chart tabs, 15 patient sections, both modes and mobile.`);
} finally {
  if (script) await command("Page.removeScriptToEvaluateOnNewDocument",{identifier:script});
  await evaluate("Object.keys(sessionStorage).filter(k=>k.startsWith('__parity')).forEach(k=>sessionStorage.removeItem(k))").catch(()=>{});
  await command("Emulation.clearDeviceMetricsOverride");
  await command("Page.navigate",{url:base+"/"});
  browser.close();
}
